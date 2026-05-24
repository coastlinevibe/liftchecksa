'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type {
  ContactUnlock,
  DriverRouteAssignment,
  OfficialRoute,
  OfficialRouteWithStops,
  RouteAssignmentSummary,
  RidePaymentLedgerEntry,
  RouteSeatRequest,
  RouteStop,
  RouteStopInput,
  Weekday,
} from '@/lib/types/pilot-routes';

const DEFAULT_WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function getCurrentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' as const };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, user_id, role, membership_status, first_name, surname')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) {
    return { error: 'Profile not found' as const };
  }

  return { user, profile };
}

function countAssignmentsByRequest(requests: RouteSeatRequest[]) {
  const counts = new Map<string, number>();

  for (const request of requests) {
    if (!request.matched_assignment_id) continue;
    counts.set(
      request.matched_assignment_id,
      (counts.get(request.matched_assignment_id) || 0) + 1
    );
  }

  return counts;
}

async function isPlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role === 'platform_admin';
}

async function isRouteAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.role === 'platform_admin' || data?.role === 'group_admin';
}

function normalizeStops(stops: RouteStopInput[]) {
  const filteredStops = stops
    .map((stop, index) => ({
      stop_order: index + 1,
      stop_name: stop.stop_name.trim(),
      area: stop.area?.trim() || null,
      notes: stop.notes?.trim() || null,
      estimated_morning_time: stop.estimated_morning_time || null,
      estimated_return_time: stop.estimated_return_time || null,
      is_start: index === 0 || Boolean(stop.is_start),
      is_end: index === stops.length - 1 || Boolean(stop.is_end),
    }))
    .filter((stop) => stop.stop_name.length > 0);

  return filteredStops;
}

export async function createOfficialRoute(input: {
  name: string;
  startArea: string;
  endArea: string;
  routeType?: string;
  status?: 'draft' | 'active' | 'paused';
  stops: RouteStopInput[];
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error };
  }

  const { user, profile } = current;
  const adminAllowed = await isPlatformAdmin(supabase, user.id);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const name = input.name.trim();
  const startArea = input.startArea.trim();
  const endArea = input.endArea.trim();
  const normalizedStops = normalizeStops(input.stops);

  if (!name || !startArea || !endArea) {
    return { error: 'Route name, start area, and end area are required' };
  }

  if (normalizedStops.length < 2) {
    return { error: 'Add at least a start stop and an end stop' };
  }

  const slugBase = slugify(name);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const { data: route, error: routeError } = await supabase
    .from('official_routes')
    .insert({
      name,
      slug,
      start_area: startArea,
      end_area: endArea,
      route_type: input.routeType || 'work_commute',
      status: input.status || 'draft',
      created_by: profile.id,
    })
    .select('*')
    .single();

  if (routeError || !route) {
    return { error: routeError?.message || 'Failed to create route' };
  }

  const { error: stopsError } = await supabase.from('route_stops').insert(
    normalizedStops.map((stop) => ({
      route_id: route.id,
      stop_order: stop.stop_order,
      stop_name: stop.stop_name,
      area: stop.area,
      notes: stop.notes,
      estimated_morning_time: stop.estimated_morning_time,
      estimated_return_time: stop.estimated_return_time,
      is_start: stop.is_start,
      is_end: stop.is_end,
    }))
  );

  if (stopsError) {
    await supabase.from('official_routes').delete().eq('id', route.id);
    return { error: stopsError.message };
  }

  revalidatePath('/admin/routes');
  revalidatePath('/admin');
  revalidatePath('/routes');

  return { success: true, route: route as OfficialRoute };
}

export async function createOfficialRouteFromForm(formData: FormData) {
  const stopsRaw = String(formData.get('stops_json') || '[]');
  let parsedStops: RouteStopInput[] = [];

  try {
    const value = JSON.parse(stopsRaw);
    if (Array.isArray(value)) {
      parsedStops = value as RouteStopInput[];
    }
  } catch {
    parsedStops = [];
  }

  return createOfficialRoute({
    name: String(formData.get('name') || ''),
    startArea: String(formData.get('start_area') || ''),
    endArea: String(formData.get('end_area') || ''),
    routeType: String(formData.get('route_type') || 'work_commute'),
    status: (String(formData.get('status') || 'draft') as 'draft' | 'active' | 'paused'),
    stops: parsedStops,
  });
}

export async function assignDriverToRoute(input: {
  routeId: string;
  driverProfileId: string;
  vehicleId: string;
  seatsAvailable: number;
  weeklyPrice: number;
  singleTripPrice: number;
  daysActive: Weekday[];
  adminNotes?: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error };
  }

  const { user } = current;
  const adminAllowed = await isPlatformAdmin(supabase, user.id);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const { data: route } = await supabase
    .from('official_routes')
    .select('id')
    .eq('id', input.routeId)
    .single();

  if (!route) {
    return { error: 'Route not found' };
  }

  const { data: driverProfile } = await supabase
    .from('profiles')
    .select('id, user_id, role')
    .eq('id', input.driverProfileId)
    .single();

  if (!driverProfile || driverProfile.role !== 'driver') {
    return { error: 'Select a verified driver profile' };
  }

  const { data: driverVerification } = await supabase
    .from('driver_profiles')
    .select('id, verification_status, user_id')
    .eq('user_id', driverProfile.user_id)
    .single();

  if (!driverVerification || driverVerification.verification_status !== 'approved') {
    return { error: 'Driver must be approved before assignment' };
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, driver_id, verification_status, is_active')
    .eq('id', input.vehicleId)
    .single();

  if (!vehicle) {
    return { error: 'Vehicle not found' };
  }

  const { data: owningDriver } = await supabase
    .from('driver_profiles')
    .select('id, user_id')
    .eq('id', vehicle.driver_id)
    .single();

  if (!owningDriver || owningDriver.user_id !== driverProfile.user_id) {
    return { error: 'Selected vehicle does not belong to this driver' };
  }

  if (vehicle.verification_status !== 'approved' || vehicle.is_active === false) {
    return { error: 'Vehicle must be active and approved' };
  }

  const { data: assignment, error } = await supabase
    .from('driver_route_assignments')
    .insert({
      route_id: input.routeId,
      driver_id: input.driverProfileId,
      vehicle_id: input.vehicleId,
      status: 'approved',
      seats_available: input.seatsAvailable,
      days_active: input.daysActive,
      weekly_price: input.weeklyPrice,
      single_trip_price: input.singleTripPrice,
      admin_notes: input.adminNotes || null,
      approved_by: current.profile.id,
      approved_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/routes/${input.routeId}`);
  revalidatePath('/admin/routes');
  revalidatePath('/dashboard/driver/routes');

  return { success: true, assignment: assignment as DriverRouteAssignment };
}

export async function assignDriverToRouteFromForm(formData: FormData) {
  const daysRaw = String(formData.get('days_active') || '[]');
  let parsedDays: Weekday[] = [];

  try {
    const value = JSON.parse(daysRaw);
    if (Array.isArray(value)) {
      parsedDays = value as Weekday[];
    }
  } catch {
    parsedDays = [];
  }

  return assignDriverToRoute({
    routeId: String(formData.get('route_id') || ''),
    driverProfileId: String(formData.get('driver_profile_id') || ''),
    vehicleId: String(formData.get('vehicle_id') || ''),
    seatsAvailable: Number(formData.get('seats_available') || 1),
    weeklyPrice: Number(formData.get('weekly_price') || 0),
    singleTripPrice: Number(formData.get('single_trip_price') || 0),
    daysActive: parsedDays.length ? parsedDays : DEFAULT_WEEKDAYS,
    adminNotes: String(formData.get('admin_notes') || ''),
  });
}

export async function requestRouteSeat(input: {
  routeId: string;
  pickupStopId: string;
  dropoffStopId: string;
  requestedDays?: Weekday[];
  requestType?: string;
  preferredMorningTime?: string;
  preferredReturnTime?: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error };
  }

  const { profile } = current;

  const { data: existing } = await supabase
    .from('route_seat_requests')
    .select('id, status')
    .eq('route_id', input.routeId)
    .eq('passenger_id', profile.id)
    .maybeSingle();

  const payload = {
    passenger_id: profile.id,
    route_id: input.routeId,
    pickup_stop_id: input.pickupStopId,
    dropoff_stop_id: input.dropoffStopId,
    requested_days: input.requestedDays?.length ? input.requestedDays : DEFAULT_WEEKDAYS,
    request_type: input.requestType || 'weekly',
    preferred_morning_time: input.preferredMorningTime || null,
    preferred_return_time: input.preferredReturnTime || null,
    status: 'pending',
    updated_at: new Date().toISOString(),
  };

  const { data: request, error } = existing?.id
    ? await supabase
        .from('route_seat_requests')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await supabase
        .from('route_seat_requests')
        .insert(payload)
        .select('*')
        .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/routes/${input.routeId}`);
  revalidatePath('/routes');
  revalidatePath('/dashboard/member');

  return { success: true, request: request as RouteSeatRequest };
}

export async function requestRouteSeatFromForm(formData: FormData) {
  const daysRaw = String(formData.get('requested_days') || '[]');
  let parsedDays: Weekday[] = [];

  try {
    const value = JSON.parse(daysRaw);
    if (Array.isArray(value)) {
      parsedDays = value as Weekday[];
    }
  } catch {
    parsedDays = [];
  }

  return requestRouteSeat({
    routeId: String(formData.get('route_id') || ''),
    pickupStopId: String(formData.get('pickup_stop_id') || ''),
    dropoffStopId: String(formData.get('dropoff_stop_id') || ''),
    requestedDays: parsedDays.length ? parsedDays : DEFAULT_WEEKDAYS,
    requestType: String(formData.get('request_type') || 'weekly'),
    preferredMorningTime: String(formData.get('preferred_morning_time') || ''),
    preferredReturnTime: String(formData.get('preferred_return_time') || ''),
  });
}

export async function recordContactUnlock(input: {
  seatRequestId: string;
  passengerAccepted?: boolean;
  driverAccepted?: boolean;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error };
  }

  const { profile } = current;

  const { data: request } = await supabase
    .from('route_seat_requests')
    .select('id, passenger_id, route_id, matched_assignment_id')
    .eq('id', input.seatRequestId)
    .single();

  if (!request) {
    return { error: 'Seat request not found' };
  }

  const { data: assignment } = request.matched_assignment_id
    ? await supabase
        .from('driver_route_assignments')
        .select('id, driver_id')
        .eq('id', request.matched_assignment_id)
        .single()
    : { data: null };

  if (!assignment) {
    return { error: 'Seat request is not matched to a driver yet' };
  }

  const isPassenger = request.passenger_id === profile.id;
  const isDriver = assignment.driver_id === profile.id;
  const isAdmin = await isRouteAdmin(supabase, profile.user_id);

  if (!isPassenger && !isDriver && !isAdmin) {
    return { error: 'Not authorized' };
  }

  const passengerAccepted = input.passengerAccepted ?? isPassenger;
  const driverAccepted = input.driverAccepted ?? isDriver;

  const { data: unlock, error } = await supabase
    .from('contact_unlocks')
    .upsert({
      passenger_id: request.passenger_id,
      driver_id: assignment.driver_id,
      route_id: request.route_id,
      seat_request_id: request.id,
      passenger_accepted: passengerAccepted,
      driver_accepted: driverAccepted,
    }, { onConflict: 'seat_request_id' })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/routes/${request.route_id}`);
  revalidatePath('/dashboard/member');
  revalidatePath('/dashboard/driver/routes');

  return { success: true, unlock: unlock as ContactUnlock };
}

export async function sendRouteChatMessage(input: {
  routeId: string;
  assignmentId: string;
  receiverId: string;
  message: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    const errorMessage = current.error || 'Not authenticated';
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent(errorMessage)}`);
  }

  const { profile } = current;
  const message = input.message.trim();
  const fallbackPath = profile.role === 'driver'
    ? `/dashboard/driver/routes/${input.routeId || ''}`
    : `/routes/${input.routeId || ''}`;

  if (!input.routeId || !input.assignmentId) {
    redirect(`${fallbackPath}?chat_error=${encodeURIComponent('Missing route chat details')}`);
  }

  if (!input.receiverId) {
    redirect(`${fallbackPath}?chat_error=${encodeURIComponent('Chat receiver is not available yet')}`);
  }

  if (!message) {
    redirect(`${fallbackPath}?chat_error=${encodeURIComponent('Enter a message before sending')}`);
  }

  const { data: assignment } = await supabase
    .from('driver_route_assignments')
    .select('id, route_id, driver_id, status')
    .eq('id', input.assignmentId)
    .eq('route_id', input.routeId)
    .single();

  if (!assignment || !['approved', 'active'].includes(assignment.status)) {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route assignment not available')}`);
  }

  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', input.routeId)
    .single();

  if (!route || route.status !== 'active') {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route is not active')}`);
  }

  const isMemberSender = profile.role === 'member';
  const isDriverSender = profile.role === 'driver';

  if (!isMemberSender && !isDriverSender) {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route chat access required')}`);
  }

  let resolvedReceiverId = input.receiverId;

  if (isMemberSender) {
    if (profile.membership_status !== 'active') {
      redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Active member access required')}`);
    }

    if (assignment.driver_id !== input.receiverId) {
      redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route chat receiver mismatch')}`);
    }

    resolvedReceiverId = assignment.driver_id;
  }

  if (isDriverSender) {
    if (assignment.driver_id !== profile.id) {
      redirect(`/dashboard/driver/routes/${input.routeId}?chat_error=${encodeURIComponent('Driver not assigned to this route')}`);
    }

    const { data: routeRequest } = await supabase
      .from('route_seat_requests')
      .select('passenger_id, matched_assignment_id, status, created_at')
      .eq('route_id', input.routeId)
      .eq('matched_assignment_id', assignment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (routeRequest?.passenger_id) {
      resolvedReceiverId = routeRequest.passenger_id;
    }
  }

  const { data: resolvedReceiverProfile } = await supabase
    .from('profiles')
    .select('id, user_id, role, membership_status')
    .or(`id.eq.${resolvedReceiverId},user_id.eq.${resolvedReceiverId}`)
    .single();

  if (!resolvedReceiverProfile) {
    redirect(
      isDriverSender
        ? `/dashboard/driver/routes/${input.routeId}?chat_error=${encodeURIComponent('Chat receiver not found')}`
        : `/routes/${input.routeId}?chat_error=${encodeURIComponent('Chat receiver not found')}`
    );
  }

  if (isDriverSender) {
    if (resolvedReceiverProfile.role !== 'member' || resolvedReceiverProfile.membership_status !== 'active') {
      redirect(`/dashboard/driver/routes/${input.routeId}?chat_error=${encodeURIComponent('Driver replies require an active member')}`);
    }
  }

  const { error } = await supabase.from('route_chats').insert({
    route_id: input.routeId,
    assignment_id: input.assignmentId,
    sender_id: profile.id,
    receiver_id: resolvedReceiverId,
    message,
  });

  if (error) {
    const errorPath = isDriverSender
      ? `/dashboard/driver/routes/${input.routeId}`
      : `/routes/${input.routeId}`;
    redirect(`${errorPath}?chat_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/routes/${input.routeId}`);
  revalidatePath(`/dashboard/driver/routes/${input.routeId}`);
  revalidatePath('/routes');
  revalidatePath('/dashboard/driver/routes');

  const successPath = isDriverSender ? `/dashboard/driver/routes/${input.routeId}` : `/routes/${input.routeId}`;
  redirect(successPath);
}

export async function sendRouteChatMessageFromForm(formData: FormData) {
  return sendRouteChatMessage({
    routeId: String(formData.get('routeId') || ''),
    assignmentId: String(formData.get('assignmentId') || ''),
    receiverId: String(formData.get('receiverId') || ''),
    message: String(formData.get('message') || ''),
  });
}

export async function getOfficialRoutes(includeInactive = false) {
  const supabase = await createClient();

  const query = supabase
    .from('official_routes')
    .select('id, name, slug, start_area, end_area, route_type, status, created_by, created_at, updated_at');

  const { data: routes, error } = includeInactive
    ? await query.order('created_at', { ascending: false })
    : await query.eq('status', 'active').order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const routeIds = (routes || []).map((route) => route.id);
  const { data: stops } = routeIds.length
    ? await supabase
        .from('route_stops')
        .select('id, route_id, stop_order, stop_name, area, notes, estimated_morning_time, estimated_return_time, is_start, is_end, created_at')
        .in('route_id', routeIds)
        .order('stop_order', { ascending: true })
    : { data: [] };

  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const stop of stops || []) {
    const list = stopsByRoute.get(stop.route_id) || [];
    list.push(stop as RouteStop);
    stopsByRoute.set(stop.route_id, list);
  }

  const assignmentsQuery = supabase
    .from('driver_route_assignments')
    .select('id, driver_id, vehicle_id, route_id, status, seats_available, weekly_price, single_trip_price, days_active, created_at')
    .in('route_id', routeIds)
    .order('created_at', { ascending: false });

  const { data: assignments } = routeIds.length
    ? await (includeInactive
        ? assignmentsQuery
        : assignmentsQuery.in('status', ['approved', 'active']))
    : { data: [] };

  const driverProfileIds = Array.from(
    new Set((assignments || []).map((assignment: any) => assignment.driver_id).filter(Boolean))
  );

  const { data: driverProfiles } = driverProfileIds.length
    ? await supabase
        .from('driver_profiles')
        .select('id, user_id')
        .in('id', driverProfileIds)
    : { data: [] };

  const driverUserIds = Array.from(
    new Set((driverProfiles || []).map((profile: any) => profile.user_id).filter(Boolean))
  );

  const { data: driverMemberProfiles } = driverUserIds.length
    ? await supabase
        .from('profiles')
        .select('user_id, first_name, surname, phone, email')
        .in('user_id', driverUserIds)
    : { data: [] };

  const driverProfilesByUserId = new Map(
    (driverMemberProfiles || []).map((profile: any) => [profile.user_id, profile])
  );
  const driverProfilesByDriverProfileId = new Map(
    (driverProfiles || []).map((profile: any) => [profile.id, profile])
  );

  const vehicleIds = Array.from(
    new Set((assignments || []).map((assignment: any) => assignment.vehicle_id).filter(Boolean))
  );

  const { data: vehicles } = includeInactive && vehicleIds.length
    ? await supabase
        .from('vehicles')
        .select('id, make, model, licence_plate')
        .in('id', vehicleIds)
    : { data: [] };

  const vehiclesById = new Map((vehicles || []).map((vehicle: any) => [vehicle.id, vehicle]));

  const assignmentsByRoute = new Map<
    string,
    Array<{
      id: string;
      driver_id: string;
      status: string;
      driver_name: string;
      phone?: string | null;
      email?: string | null;
      seats_available?: number | null;
      weekly_price?: number | string | null;
      single_trip_price?: number | string | null;
      days_active?: string[] | null;
      vehicle_label?: string | null;
    }>
  >();
  for (const assignment of assignments || []) {
    const list = assignmentsByRoute.get(assignment.route_id) || [];
    const driverProfileRow = driverProfilesByDriverProfileId.get(assignment.driver_id);
    const driverProfile = driverProfileRow
      ? driverProfilesByUserId.get(driverProfileRow.user_id)
      : null;
    const vehicle = vehiclesById.get(assignment.vehicle_id);
    const driverName = driverProfile
      ? `${driverProfile.first_name || ''} ${driverProfile.surname || ''}`.trim()
      : 'Assigned driver';
    const vehicleLabel = vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() + (vehicle.licence_plate ? ` - ${vehicle.licence_plate}` : '')
      : null;

    list.push({
      id: assignment.id,
      driver_id: assignment.driver_id,
      status: assignment.status,
      driver_name: driverName || 'Assigned driver',
      phone: includeInactive ? driverProfile?.phone || null : null,
      email: includeInactive ? driverProfile?.email || null : null,
      seats_available: assignment.seats_available,
      weekly_price: assignment.weekly_price,
      single_trip_price: assignment.single_trip_price,
      days_active: assignment.days_active || [],
      vehicle_label: vehicleLabel,
    });
    assignmentsByRoute.set(assignment.route_id, list);
  }

  const normalizedRoutes = (routes || []).map((route) => ({
    ...(route as OfficialRoute),
    route_stops: stopsByRoute.get(route.id) || [],
    assigned_drivers: assignmentsByRoute.get(route.id) || [],
  })) as OfficialRouteWithStops[];

  return { routes: normalizedRoutes };
}

export async function getRouteDetail(routeId: string) {
  const supabase = await createClient();

  const [{ data: route, error: routeError }, { data: stops }, { data: assignments }, { data: requests }, { data: ledger }] = await Promise.all([
    supabase
      .from('official_routes')
      .select('id, name, slug, start_area, end_area, route_type, status, created_by, created_at, updated_at')
      .eq('id', routeId)
      .single(),
    supabase
      .from('route_stops')
      .select('id, route_id, stop_order, stop_name, area, notes, estimated_morning_time, estimated_return_time, is_start, is_end, created_at')
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true }),
    supabase
      .from('driver_route_assignments')
      .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_trip_price, admin_notes, approved_by, approved_at, created_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('route_seat_requests')
      .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ride_payment_ledger')
      .select('id, passenger_id, driver_id, route_id, seat_request_id, amount, platform_fee, driver_amount, payment_period, payment_method, payment_provider, provider_reference, status, payout_status, proof_url, paid_at, confirmed_at, payout_due_at, payout_completed_at, created_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
  ]);

  if (routeError || !route) {
    return { error: routeError?.message || 'Route not found' };
  }

  const assignmentDisplayDetails = assignments?.length
    ? await Promise.all(
        assignments.map(async (assignment) => {
          const { data } = await supabase.rpc('get_route_assignment_public_details', {
            p_assignment_id: assignment.id,
          });

          return [assignment.id, (data || [])[0] || null] as const;
        })
      )
    : [];

  const assignmentDetailsById = new Map(assignmentDisplayDetails);
  const requestCounts = countAssignmentsByRequest((requests || []) as RouteSeatRequest[]);

  return {
    route: route as OfficialRoute,
    stops: (stops || []) as RouteStop[],
    assignments: (assignments || []).map((assignment) => ({
      ...(assignment as DriverRouteAssignment),
      passenger_request_count: requestCounts.get(assignment.id) || 0,
      driver_name: assignmentDetailsById.get(assignment.id)?.driver_name || `Driver ${assignment.driver_id.slice(0, 8)}`,
      vehicle_plate: assignmentDetailsById.get(assignment.id)?.vehicle_plate || null,
    })) as RouteAssignmentSummary[],
    requests: (requests || []) as RouteSeatRequest[],
    ledger: (ledger || []) as RidePaymentLedgerEntry[],
  };
}

export async function getDriverRouteDashboard() {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error };
  }

  const { profile } = current;
  if (profile.role !== 'driver') {
    return { error: 'Driver access required' };
  }

  const [assignmentsResult, requestsResult] = await Promise.all([
    supabase
      .from('driver_route_assignments')
      .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_trip_price, admin_notes, approved_by, approved_at, created_at, official_routes(id, name, start_area, end_area, status)')
      .eq('driver_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('route_seat_requests')
      .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  if (assignmentsResult.error) {
    return { error: assignmentsResult.error.message };
  }

  if (requestsResult.error) {
    return { error: requestsResult.error.message };
  }

  const routeIds = (assignmentsResult.data || []).map((assignment) => assignment.route_id);
  const assignmentIds = (assignmentsResult.data || []).map((assignment) => assignment.id);
  const requestAssignments = assignmentIds.length
    ? await supabase
        .from('route_seat_requests')
        .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
        .in('matched_assignment_id', assignmentIds)
        .order('created_at', { ascending: false })
    : { data: [] as RouteSeatRequest[] };

  const stopsResult = routeIds.length
    ? await supabase
        .from('route_stops')
        .select('id, route_id, stop_order, stop_name, area, notes, estimated_morning_time, estimated_return_time, is_start, is_end, created_at')
        .in('route_id', routeIds)
        .order('stop_order', { ascending: true })
    : { data: [] as RouteStop[] };

  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const stop of stopsResult.data || []) {
    const list = stopsByRoute.get(stop.route_id) || [];
    list.push(stop);
    stopsByRoute.set(stop.route_id, list);
  }

  const requestCounts = countAssignmentsByRequest((requestAssignments.data || []) as RouteSeatRequest[]);

  const assignments = (assignmentsResult.data || []).map((assignment) => ({
    ...assignment,
    route_stops: stopsByRoute.get(assignment.route_id) || [],
    passenger_request_count: requestCounts.get(assignment.id) || 0,
    official_route: (() => {
      const rawAssignment = assignment as any;
      return Array.isArray(rawAssignment.official_routes)
        ? rawAssignment.official_routes[0] || null
        : rawAssignment.official_routes || null;
    })(),
  }));

  const pendingRequests = routeIds.length
    ? ((requestsResult.data || []) as RouteSeatRequest[]).filter((request) => routeIds.includes(request.route_id))
    : [];

  return {
    assignments,
    pendingRequests,
  };
}
