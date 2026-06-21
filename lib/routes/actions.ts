'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveSignedStorageUrl } from '@/lib/supabase/storage';
import { isSuperAdminEmail } from '@/lib/auth/routing';
import { isDriverFullyApproved } from '@/lib/driver-status';
import { VEHICLE_CAPACITY_OPTIONS } from '@/lib/types/pilot-routes';
import type {
  AdminRouteReviewDetail,
  ContactUnlock,
  DriverRouteDetail,
  DriverRouteAssignment,
  OfficialRoute,
  OfficialRouteWithStops,
  PublicRouteDetail,
  RouteAssignmentSummary,
  RouteReviewAssignmentSummary,
  RidePaymentLedgerEntry,
  RouteSeatRequest,
  RouteStop,
  RouteStopInput,
  Weekday,
  VehicleCapacity,
} from '@/lib/types/pilot-routes';

const DEFAULT_WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

type DriverProfileLookupRow = {
  id: string;
  user_id: string;
  id_status?: string | null;
  vehicle_status?: string | null;
  rating_average?: number | string | null;
  rating_count?: number | null;
};

type DriverMemberProfileRow = {
  id: string;
  user_id: string;
  first_name: string | null;
  surname: string | null;
  profile_photo_url?: string | null;
};

type DriverMemberReviewRow = DriverMemberProfileRow & {
  phone?: string | null;
  email?: string | null;
  id_document_url?: string | null;
};

type PassengerProfileRow = {
  id: string;
  first_name: string | null;
  surname: string | null;
  phone?: string | null;
  email?: string | null;
};

type VehicleLookupRow = {
  id: string;
  seat_capacity?: number | null;
  vehicle_photo_url?: string | null;
  make: string | null;
  model: string | null;
  licence_plate: string | null;
};

type DriverAssignmentListRow = {
  id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  status: string;
  seats_available: number | null;
  weekly_price?: number | string | null;
  single_route_price?: number | string | null;
  days_active?: string[] | null;
  created_at: string;
};

type DriverDashboardAssignmentRow = DriverRouteAssignment & {
  official_routes:
    | {
        id: string;
        name: string;
        start_area: string;
        end_area: string;
        status: string;
      }
    | {
        id: string;
        name: string;
        start_area: string;
        end_area: string;
        status: string;
      }[]
    | null;
};

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
    .maybeSingle();

  if (error) {
    return { error: 'Profile not found' as const };
  }

  return { user, profile: profile ?? null };
}

async function getCurrentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' as const };
  }

  return { user };
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

async function hasVehicleCapacityColumn(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from('official_routes').select('vehicle_capacity').limit(1);
  return !error;
}

async function hasVehicleSeatCapacityColumn(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from('vehicles').select('seat_capacity').limit(1);
  return !error;
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

  return data?.role === 'platform_admin';
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
  vehicleCapacity?: VehicleCapacity;
  status?: 'draft' | 'active' | 'paused';
  stops: RouteStopInput[];
}) {
  const supabase = await createClient();
  const current = await getCurrentUser(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const adminAllowed = isSuperAdmin || (await isPlatformAdmin(supabase, user.id));
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const profile = isSuperAdmin
    ? null
    : await (async () => {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id, user_id, role, membership_status, first_name, surname')
          .eq('user_id', user.id)
          .maybeSingle();

        return currentProfile ?? null;
      })();

  const name = input.name.trim();
  const startArea = input.startArea.trim();
  const endArea = input.endArea.trim();
  const normalizedStops = normalizeStops(input.stops);
  const supportsVehicleCapacity = await hasVehicleCapacityColumn(supabase);

  if (!name || !startArea || !endArea) {
    return { error: 'Route name, start area, and end area are required' };
  }

  if (supportsVehicleCapacity && (!input.vehicleCapacity || !VEHICLE_CAPACITY_OPTIONS.includes(input.vehicleCapacity))) {
    return { error: 'Select a vehicle type' };
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
      created_by: profile?.id ?? null,
      ...(supportsVehicleCapacity ? { vehicle_capacity: input.vehicleCapacity } : {}),
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
    vehicleCapacity: Number(formData.get('vehicle_capacity') || 0) as VehicleCapacity,
    status: (String(formData.get('status') || 'draft') as 'draft' | 'active' | 'paused'),
    stops: parsedStops,
  });
}

export async function deleteOfficialRoute(routeId: string) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const adminAllowed = (await isPlatformAdmin(supabase, user.id)) || isSuperAdminEmail(user.email);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const { error } = await supabase.from('official_routes').delete().eq('id', routeId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/routes');
  revalidatePath('/admin');
  revalidatePath('/routes');

  redirect('/admin/routes');
}

export async function updateOfficialRouteStatus(input: {
  routeId: string;
  status: 'draft' | 'active' | 'paused';
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const adminAllowed = (await isPlatformAdmin(supabase, user.id)) || isSuperAdminEmail(user.email);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  if (!['draft', 'active', 'paused'].includes(input.status)) {
    return { error: 'Invalid route status' };
  }

  const { error } = await supabase
    .from('official_routes')
    .update({ status: input.status })
    .eq('id', input.routeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/routes');
  revalidatePath(`/admin/routes/${input.routeId}`);
  revalidatePath('/dashboard/driver/routes');
  revalidatePath('/routes');

  redirect(`/admin/routes/${input.routeId}`);
}

export async function updateOfficialRouteStatusFromForm(formData: FormData) {
  return updateOfficialRouteStatus({
    routeId: String(formData.get('routeId') || ''),
    status: String(formData.get('status') || 'draft') as 'draft' | 'active' | 'paused',
  });
}

export async function assignDriverToRoute(input: {
  routeId: string;
  driverProfileId: string;
  vehicleId: string;
  seatsAvailable: number;
  weeklyPrice: number;
  singleRoutePrice: number;
  daysActive: Weekday[];
  adminNotes?: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const adminAllowed = isSuperAdmin || (await isPlatformAdmin(supabase, user.id));
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const supportsVehicleCapacity = await hasVehicleCapacityColumn(supabase);
  const supportsVehicleSeatCapacity = await hasVehicleSeatCapacityColumn(supabase);

  const { data: route } = await supabase
    .from('official_routes')
    .select(supportsVehicleCapacity ? 'id, vehicle_capacity' : 'id')
    .eq('id', input.routeId)
    .single();

  if (!route) {
    return { error: 'Route not found' };
  }

  const routeVehicleCapacity = supportsVehicleCapacity
    ? (route as { vehicle_capacity?: number | null }).vehicle_capacity ?? null
    : null;

  if (supportsVehicleCapacity && !routeVehicleCapacity) {
    return { error: 'Route vehicle seating type not set' };
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
    .select('id, id_status, vehicle_status, user_id')
    .eq('user_id', driverProfile.user_id)
    .single();

  if (!driverVerification || !isDriverFullyApproved(driverVerification)) {
    return { error: 'Driver must be approved before assignment' };
  }

  const { data: driverSubscription } = await supabase
    .from('driver_profiles')
    .select('provider_payment_status, provider_next_payment_at, provider_expires_at')
    .eq('user_id', driverProfile.user_id)
    .maybeSingle();

  const driverSubscriptionDue = driverSubscription?.provider_next_payment_at || driverSubscription?.provider_expires_at || null;
  const driverSubscriptionActive =
    driverSubscription?.provider_payment_status === 'approved' &&
    (!driverSubscriptionDue || new Date(driverSubscriptionDue) > new Date());

  if (!driverSubscriptionActive) {
    return { error: 'Driver subscription payment required' };
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(supportsVehicleSeatCapacity ? 'id, driver_id, verification_status, is_active, seat_capacity' : 'id, driver_id, verification_status, is_active')
    .eq('id', input.vehicleId)
    .single();

  if (!vehicle) {
    return { error: 'Vehicle not found' };
  }

  const vehicleSeatCapacity = supportsVehicleSeatCapacity
    ? (vehicle as { seat_capacity?: number | null }).seat_capacity ?? null
    : null;
  const vehicleDriverId = (vehicle as { driver_id?: string }).driver_id || null;
  const vehicleVerificationStatus = (vehicle as { verification_status?: string | null }).verification_status || null;
  const vehicleIsActive = (vehicle as { is_active?: boolean | null }).is_active;

  if (
    supportsVehicleCapacity &&
    supportsVehicleSeatCapacity &&
    routeVehicleCapacity !== null &&
    vehicleSeatCapacity !== routeVehicleCapacity
  ) {
    return { error: 'not the correct vehicle seating type' };
  }

  const { data: owningDriver } = await supabase
    .from('driver_profiles')
    .select('id, user_id')
    .eq('id', vehicleDriverId)
    .single();

  if (!owningDriver || owningDriver.user_id !== driverProfile.user_id) {
    return { error: 'Selected vehicle does not belong to this driver' };
  }

  if (vehicleVerificationStatus !== 'approved' || vehicleIsActive === false) {
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
      single_route_price: input.singleRoutePrice,
      admin_notes: input.adminNotes || null,
      approved_by: isSuperAdmin ? null : (await getCurrentProfile(supabase)).profile?.id ?? null,
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
    singleRoutePrice: Number(formData.get('single_route_price') || 0),
    daysActive: parsedDays.length ? parsedDays : DEFAULT_WEEKDAYS,
    adminNotes: String(formData.get('admin_notes') || ''),
  });
}

export async function updateDriverRouteApplicationPhoneCallVerified(input: {
  assignmentId: string;
  routeId: string;
  phoneCallVerified: boolean;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const adminAllowed = (await isPlatformAdmin(supabase, user.id)) || isSuperAdminEmail(user.email);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const { error } = await supabase
    .from('driver_route_assignments')
    .update({ phone_call_verified: input.phoneCallVerified })
    .eq('id', input.assignmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/routes/${input.routeId}`);
  revalidatePath('/admin/routes');

  return { success: true };
}

export async function updateDriverRouteApplicationDecision(input: {
  assignmentId: string;
  routeId: string;
  decision: 'approved' | 'rejected';
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const adminAllowed = (await isPlatformAdmin(supabase, user.id)) || isSuperAdminEmail(user.email);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const updates =
    input.decision === 'approved'
      ? { status: 'approved', approved_by: (await getCurrentProfile(supabase)).profile?.id ?? null, approved_at: new Date().toISOString() }
      : { status: 'rejected', approved_by: null, approved_at: null };

  const { error } = await supabase
    .from('driver_route_assignments')
    .update(updates)
    .eq('id', input.assignmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/routes/${input.routeId}`);
  revalidatePath('/admin/routes');
  revalidatePath('/routes');
  revalidatePath(`/routes/${input.routeId}`);
  revalidatePath('/dashboard/driver/routes');

  return { success: true };
}

export async function applyDriverToRoute(input: {
  routeId: string;
  vehicleId: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user, profile } = current;
  if (!profile || profile.role !== 'driver') {
    return { error: 'Driver access required' };
  }

  const supportsVehicleCapacity = await hasVehicleCapacityColumn(supabase);
  const supportsVehicleSeatCapacity = await hasVehicleSeatCapacityColumn(supabase);

  const { data: route } = await supabase
    .from('official_routes')
    .select(supportsVehicleCapacity ? 'id, status, vehicle_capacity' : 'id, status')
    .eq('id', input.routeId)
    .maybeSingle();

  if (!route) {
    return { error: 'Route not found' };
  }

  const routeVehicleCapacity = supportsVehicleCapacity
    ? (route as { vehicle_capacity?: number | null }).vehicle_capacity ?? null
    : null;
  const routeStatus = (route as { status?: string | null }).status || null;

  if (routeStatus !== 'active') {
    return { error: 'Route is not accepting applications' };
  }

  const { data: driverProfile } = await supabase
    .from('driver_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!driverProfile) {
    return { error: 'Driver profile not found' };
  }

  const { data: driverSubscription } = await supabase
    .from('driver_profiles')
    .select('provider_payment_status, provider_next_payment_at, provider_expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const driverSubscriptionDue = driverSubscription?.provider_next_payment_at || driverSubscription?.provider_expires_at || null;
  const driverSubscriptionActive =
    driverSubscription?.provider_payment_status === 'approved' &&
    (!driverSubscriptionDue || new Date(driverSubscriptionDue) > new Date());

  if (!driverSubscriptionActive) {
    return { error: 'Driver subscription payment required' };
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(
      supportsVehicleSeatCapacity
        ? 'id, driver_id, verification_status, is_active, seat_capacity, make, model, licence_plate'
        : 'id, driver_id, verification_status, is_active, make, model, licence_plate'
    )
    .eq('id', input.vehicleId)
    .maybeSingle();

  if (!vehicle) {
    return { error: 'Vehicle not found' };
  }

  const vehicleSeatCapacity = supportsVehicleSeatCapacity
    ? (vehicle as { seat_capacity?: number | null }).seat_capacity ?? null
    : null;
  const vehicleDriverId = (vehicle as { driver_id?: string }).driver_id || null;
  const vehicleIsActive = (vehicle as { is_active?: boolean | null }).is_active;

  if (vehicleDriverId !== driverProfile.id) {
    return { error: 'Selected vehicle does not belong to your driver profile' };
  }

  if (vehicleIsActive === false) {
    return { error: 'Vehicle must be active' };
  }

  if (supportsVehicleCapacity && supportsVehicleSeatCapacity) {
    if (!routeVehicleCapacity || !vehicleSeatCapacity || vehicleSeatCapacity !== routeVehicleCapacity) {
      return { error: 'not the correct vehicle seating type' };
    }
  }

  const { data: existingApplication } = await supabase
    .from('driver_route_assignments')
    .select('id, status')
    .eq('route_id', input.routeId)
    .eq('driver_id', profile.id)
    .in('status', ['pending', 'approved', 'active', 'paused', 'suspended'])
    .maybeSingle();

  if (existingApplication) {
    return { error: 'You already applied for this route' };
  }

  const seatsAvailable = Math.max(
    1,
    Number(
      supportsVehicleSeatCapacity && vehicleSeatCapacity
        ? Math.max(0, vehicleSeatCapacity - 1)
        : Math.max(0, (routeVehicleCapacity || 1) - 1)
    )
  );

  const { error } = await supabase.from('driver_route_assignments').insert({
    route_id: input.routeId,
    driver_id: profile.id,
    vehicle_id: input.vehicleId,
    status: 'pending',
    seats_available: seatsAvailable,
    days_active: DEFAULT_WEEKDAYS,
    weekly_price: null,
    single_route_price: null,
    admin_notes: null,
    approved_by: null,
    approved_at: null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/routes/${input.routeId}`);
  revalidatePath('/routes');
  revalidatePath('/dashboard/driver/routes');
  revalidatePath('/dashboard/driver');
  revalidatePath(`/admin/routes/${input.routeId}`);
  revalidatePath('/admin/routes');

  return { success: true };
}

export async function applyDriverToRouteFromForm(formData: FormData) {
  return applyDriverToRoute({
    routeId: String(formData.get('route_id') || ''),
    vehicleId: String(formData.get('vehicle_id') || ''),
  });
}

export async function requestRouteSeat(input: {
  routeId: string;
  pickupStopId: string;
  dropoffStopId: string;
  seatsRequested?: number;
  requestedDays?: Weekday[];
  requestType?: string;
  preferredMorningTime?: string;
  preferredReturnTime?: string;
}) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { profile } = current;
  if (!profile) {
    return { error: 'Profile not found' };
  }
  const passengerProfileId = profile.id;

  const { data: existing } = await supabase
    .from('route_seat_requests')
    .select('id, status')
    .eq('route_id', input.routeId)
    .eq('passenger_id', passengerProfileId)
    .maybeSingle();

  const seatsRequested = Number.isFinite(input.seatsRequested)
    ? Math.max(1, Math.floor(Number(input.seatsRequested)))
    : 1;

  const payload = {
    passenger_id: passengerProfileId,
    route_id: input.routeId,
    pickup_stop_id: input.pickupStopId,
    dropoff_stop_id: input.dropoffStopId,
    seats_requested: seatsRequested,
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
    seatsRequested: Number(formData.get('seats_requested') || 1),
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
    return { error: current.error || 'Unable to load current profile' };
  }

  const { profile } = current;
  if (!profile) {
    return { error: 'Profile not found' };
  }

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
  if (!profile) {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Profile not found')}`);
  }
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

  const routeStatus = route ? (route as { status?: string | null }).status || null : null;
  if (!route || routeStatus !== 'active') {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route is not active')}`);
  }

  const isMemberSender = profile.role === 'member';
  const isDriverSender = profile.role === 'driver';

  if (!isMemberSender && !isDriverSender) {
    redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Route chat access required')}`);
  }

  const { data: postedReceiverProfile } = input.receiverId
    ? await supabase
        .from('profiles')
        .select('id, user_id, role, membership_status')
        .or(`id.eq.${input.receiverId},user_id.eq.${input.receiverId}`)
        .maybeSingle()
    : { data: null };

  let resolvedReceiverId = postedReceiverProfile?.id || input.receiverId;

  if (isMemberSender) {
    if (profile.membership_status !== 'active') {
      redirect(`/routes/${input.routeId}?chat_error=${encodeURIComponent('Active member access required')}`);
    }

    if (resolvedReceiverId !== assignment.driver_id) {
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
    } else if (postedReceiverProfile?.role === 'member') {
      resolvedReceiverId = postedReceiverProfile.id;
    } else {
      const { data: latestDriverChat } = await supabase
        .from('route_chats')
        .select('sender_id, receiver_id, created_at')
        .eq('route_id', input.routeId)
        .eq('assignment_id', assignment.id)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const inferredReceiverId = latestDriverChat
        ? latestDriverChat.sender_id === profile.id
          ? latestDriverChat.receiver_id
          : latestDriverChat.sender_id
        : null;

      if (inferredReceiverId) {
        resolvedReceiverId = inferredReceiverId;
      }
    }
  }

  const { data: resolvedReceiverProfile } = await supabase
    .from('profiles')
    .select('id, user_id, role, membership_status')
    .eq('id', resolvedReceiverId)
    .maybeSingle();

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
  const supportsVehicleCapacity = await hasVehicleCapacityColumn(supabase);

  const query = supabase
    .from('official_routes')
    .select(
      `id, name, slug, start_area, end_area, route_type${supportsVehicleCapacity ? ', vehicle_capacity' : ''}, status, created_by, created_at, updated_at`
    );

  const { data: routes, error } = includeInactive
    ? await query.order('created_at', { ascending: false })
    : await query.eq('status', 'active').order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const typedRoutes = (routes || []) as unknown as OfficialRoute[];
  const routeIds = typedRoutes.map((route) => route.id);
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
    .select('id, driver_id, vehicle_id, route_id, status, seats_available, weekly_price, single_route_price, days_active, created_at')
    .in('route_id', routeIds)
    .order('created_at', { ascending: false });

  const { data: assignments } = routeIds.length
    ? await assignmentsQuery.in('status', ['approved', 'active'])
    : { data: [] };

  const typedAssignments = (assignments || []) as DriverAssignmentListRow[];

  const driverProfileIds = Array.from(
    new Set(typedAssignments.map((assignment) => assignment.driver_id).filter(Boolean))
  );

  const { data: driverProfiles } = driverProfileIds.length
    ? await supabase
        .from('profiles')
        .select('id, user_id, first_name, surname, profile_photo_url')
        .in('id', driverProfileIds)
    : { data: [] };

  const typedDriverProfiles = (driverProfiles || []) as DriverMemberProfileRow[];

  const driverUserIds = Array.from(
    new Set(typedDriverProfiles.map((profile) => profile.user_id).filter(Boolean))
  );

  const { data: driverMemberProfiles } = driverUserIds.length
    ? await supabase
        .from('driver_profiles')
        .select('id, user_id, id_status, vehicle_status, rating_average, rating_count')
        .in('user_id', driverUserIds)
    : { data: [] };

  const driverProfilesByUserId = new Map(
    ((driverMemberProfiles || []) as DriverProfileLookupRow[]).map((profile) => [profile.user_id, profile])
  );
  const driverProfilesByDriverProfileId = new Map(
    typedDriverProfiles.map((profile) => [profile.id, profile])
  );

  const vehicleIds = Array.from(
    new Set(typedAssignments.map((assignment) => assignment.vehicle_id).filter(Boolean))
  );

  const { data: vehicles } = includeInactive && vehicleIds.length
    ? await supabase
        .from('vehicles')
        .select('id, seat_capacity, make, model, licence_plate')
        .in('id', vehicleIds)
    : { data: [] };

  const vehiclesById = new Map(
    ((vehicles || []) as VehicleLookupRow[]).map((vehicle) => [vehicle.id, vehicle])
  );

  const assignmentsByRoute = new Map<
    string,
    Array<{
      id: string;
      driver_id: string;
      status: string;
      driver_name: string;
      driver_verified?: boolean;
      driver_avatar_url?: string | null;
      seats_available?: number | null;
      weekly_price?: number | string | null;
      single_route_price?: number | string | null;
      days_active?: string[] | null;
      vehicle_label?: string | null;
      rating_average?: number | string | null;
      rating_count?: number | null;
    }>
  >();
  for (const assignment of typedAssignments) {
    const list = assignmentsByRoute.get(assignment.route_id) || [];
    const driverMemberProfile = driverProfilesByDriverProfileId.get(assignment.driver_id);
    const driverProfile = driverMemberProfile
      ? driverProfilesByUserId.get(driverMemberProfile.user_id)
      : null;
    const vehicle = vehiclesById.get(assignment.vehicle_id);
    const driverName = driverMemberProfile
      ? `${driverMemberProfile.first_name || ''} ${driverMemberProfile.surname || ''}`.trim()
      : 'Assigned driver';
    const vehicleLabel = vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() + (vehicle.licence_plate ? ` - ${vehicle.licence_plate}` : '')
      : null;

    list.push({
      id: assignment.id,
      driver_id: assignment.driver_id,
      status: assignment.status,
      driver_name: driverName || 'Assigned driver',
      driver_verified: Boolean(
        driverProfile?.id_status === 'approved' &&
          driverProfile?.vehicle_status === 'approved'
      ),
      driver_avatar_url: driverMemberProfile?.profile_photo_url || null,
      seats_available: assignment.seats_available,
      weekly_price: assignment.weekly_price,
      single_route_price: assignment.single_route_price,
      days_active: assignment.days_active || [],
      vehicle_label: vehicleLabel,
      rating_average: driverProfile?.rating_average ?? 0,
      rating_count: driverProfile?.rating_count ?? 0,
    });
    assignmentsByRoute.set(assignment.route_id, list);
  }

  const normalizedRoutes = typedRoutes.map((route) => ({
    ...(route as OfficialRoute),
    route_stops: stopsByRoute.get(route.id) || [],
    assigned_drivers: assignmentsByRoute.get(route.id) || [],
  })) as OfficialRouteWithStops[];

  return { routes: normalizedRoutes };
}

export async function getRouteDetail(routeId: string): Promise<PublicRouteDetail | { error: string }> {
  noStore();
  const supabase = await createClient();
  const supportsVehicleCapacity = await hasVehicleCapacityColumn(supabase);

  const [{ data: route, error: routeError }, { data: stops }, { data: assignments }] = await Promise.all([
    supabase
      .from('official_routes')
      .select(
        `id, name, slug, start_area, end_area, route_type${supportsVehicleCapacity ? ', vehicle_capacity' : ''}, status, created_by, created_at, updated_at`
      )
      .eq('id', routeId)
      .single(),
    supabase
      .from('route_stops')
      .select('id, route_id, stop_order, stop_name, area, notes, estimated_morning_time, estimated_return_time, is_start, is_end, created_at')
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true }),
    supabase
      .from('driver_route_assignments')
      .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_route_price, created_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
  ]);

  if (routeError || !route) {
    return { error: routeError?.message || 'Route not found' };
  }

  const typedRoute = route as unknown as OfficialRoute;
  const driverIds = Array.from(
    new Set(((assignments || []) as DriverRouteAssignment[]).map((assignment) => assignment.driver_id).filter(Boolean))
  );
  const { data: driverMemberProfiles } = driverIds.length
    ? await supabase
        .from('profiles')
        .select('id, user_id, first_name, surname, profile_photo_url')
        .in('id', driverIds)
    : { data: [] };
  const driverMemberProfilesById = new Map(
    ((driverMemberProfiles || []) as DriverMemberProfileRow[]).map((profile) => [profile.id, profile])
  );
  const driverUserIds = Array.from(
    new Set(((driverMemberProfiles || []) as DriverMemberProfileRow[]).map((profile) => profile.user_id).filter(Boolean))
  );
  const { data: driverProfiles } = driverUserIds.length
    ? await supabase
        .from('driver_profiles')
        .select('id, user_id, id_status, vehicle_status, rating_average, rating_count')
        .in('user_id', driverUserIds)
    : { data: [] };
  const driverProfilesByUserId = new Map(
    ((driverProfiles || []) as DriverProfileLookupRow[]).map((profile) => [profile.user_id, profile])
  );
  const vehicleIds = Array.from(
    new Set(((assignments || []) as DriverRouteAssignment[]).map((assignment) => assignment.vehicle_id).filter(Boolean))
  );
  const { data: vehicles } = vehicleIds.length
    ? await supabase
        .from('vehicles')
        .select('id, vehicle_photo_url, make, model, licence_plate')
        .in('id', vehicleIds)
    : { data: [] };
  const vehiclesById = new Map(
    ((vehicles || []) as VehicleLookupRow[]).map((vehicle) => [vehicle.id, vehicle])
  );

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

  return {
    route: typedRoute,
    stops: (stops || []) as RouteStop[],
    assignments: (await Promise.all((assignments || []).map(async (assignment) => {
      const memberProfile = driverMemberProfilesById.get(assignment.driver_id);
      const driverProfile = memberProfile ? driverProfilesByUserId.get(memberProfile.user_id) : null;
      const vehicle = vehiclesById.get(assignment.vehicle_id);
      const vehiclePhotoUrl = await resolveSignedStorageUrl(supabase, 'vehicle-photos', vehicle?.vehicle_photo_url || null);

      return {
        id: assignment.id,
        driver_id: assignment.driver_id,
        vehicle_id: assignment.vehicle_id,
        route_id: assignment.route_id,
        status: assignment.status,
        seats_available: assignment.seats_available ?? 0,
        days_active: assignment.days_active || [],
        weekly_price: assignment.weekly_price,
        single_route_price: assignment.single_route_price,
        created_at: assignment.created_at,
        driver_name:
          assignmentDetailsById.get(assignment.id)?.driver_name ||
          (memberProfile
            ? `${memberProfile.first_name || ''} ${memberProfile.surname || ''}`.trim()
            : `Driver ${assignment.driver_id.slice(0, 8)}`),
        driver_verified: Boolean(
          driverProfile?.id_status === 'approved' &&
            driverProfile?.vehicle_status === 'approved'
        ),
        driver_avatar_url: memberProfile?.profile_photo_url || null,
        rating_average: driverProfile?.rating_average ?? 0,
        rating_count: driverProfile?.rating_count ?? 0,
        vehicle_plate: assignmentDetailsById.get(assignment.id)?.vehicle_plate || vehicle?.licence_plate || null,
        vehicle_photo_url: vehiclePhotoUrl || vehicle?.vehicle_photo_url || null,
      };
    }))) as RouteAssignmentSummary[],
  };
}

export async function getDriverRouteDetail(routeId: string): Promise<DriverRouteDetail | { error: string }> {
  const baseDetail = await getRouteDetail(routeId);
  if ('error' in baseDetail) {
    return baseDetail;
  }

  const supabase = await createClient();
  const [requestsResult, ledgerResult] = await Promise.all([
    supabase
      .from('route_seat_requests')
      .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, created_at, updated_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ride_payment_ledger')
      .select('id, passenger_id, driver_id, route_id, seat_request_id, amount, platform_fee, driver_amount, payment_period, payment_method, payment_provider, provider_reference, status, payout_status, proof_url, paid_at, confirmed_at, payout_due_at, payout_completed_at, created_at')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false }),
  ]);

  const stopById = new Map((baseDetail.stops || []).map((stop) => [stop.id, stop] as const));
  const passengerIds = Array.from(
    new Set(((requestsResult.data || []) as RouteSeatRequest[]).map((request) => request.passenger_id).filter(Boolean))
  );
  const { data: passengerProfiles } = passengerIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname')
        .in('id', passengerIds)
    : { data: [] };
  const passengerProfilesById = new Map(
    ((passengerProfiles || []) as PassengerProfileRow[]).map((profile) => [profile.id, profile])
  );
  const requestCounts = countAssignmentsByRequest((requestsResult.data || []) as RouteSeatRequest[]);

  return {
    ...baseDetail,
    assignments: baseDetail.assignments.map((assignment) => ({
      ...assignment,
      passenger_request_count: requestCounts.get(assignment.id) || 0,
    })),
    requests: ((requestsResult.data || []) as RouteSeatRequest[]).map((request) => {
      const passengerProfile = passengerProfilesById.get(request.passenger_id);
      return {
        ...request,
        passenger_name: passengerProfile
          ? `${passengerProfile.first_name || ''} ${passengerProfile.surname || ''}`.trim() || null
          : null,
        pickup_stop_name: stopById.get(request.pickup_stop_id)?.stop_name || null,
        dropoff_stop_name: stopById.get(request.dropoff_stop_id)?.stop_name || null,
      };
    }),
    ledger: (ledgerResult.data || []) as RidePaymentLedgerEntry[],
  };
}
export async function getAdminRouteReviewDetail(routeId: string): Promise<AdminRouteReviewDetail | { error: string }> {
  noStore();
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { user } = current;
  const adminAllowed = (await isPlatformAdmin(supabase, user.id)) || isSuperAdminEmail(user.email);
  if (!adminAllowed) {
    return { error: 'Platform admin access required' };
  }

  const detail = await getDriverRouteDetail(routeId);
  if ('error' in detail) {
    return detail;
  }

  const baseAssignmentsById = new Map(detail.assignments.map((assignment) => [assignment.id, assignment] as const));
  const assignmentIds = detail.assignments.map((assignment) => assignment.id);
  if (assignmentIds.length === 0) {
    return {
      ...detail,
      assignments: [] as RouteReviewAssignmentSummary[],
    };
  }

  const { data: assignments } = await supabase
    .from('driver_route_assignments')
    .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_route_price, admin_notes, approved_by, approved_at, phone_call_verified, created_at')
    .in('id', assignmentIds)
    .order('created_at', { ascending: false });

  const driverIds = Array.from(new Set(((assignments || []) as DriverRouteAssignment[]).map((assignment) => assignment.driver_id).filter(Boolean)));
  const { data: driverMemberProfiles } = driverIds.length
    ? await supabase
        .from('profiles')
        .select('id, user_id, first_name, surname, phone, email, profile_photo_url')
        .in('id', driverIds)
    : { data: [] };
  const driverMemberProfilesById = new Map(
    ((driverMemberProfiles || []) as DriverMemberReviewRow[]).map((profile) => [profile.id, profile])
  );
  const driverUserIds = Array.from(
    new Set(((driverMemberProfiles || []) as DriverMemberReviewRow[]).map((profile) => profile.user_id).filter(Boolean))
  );
  const { data: driverProfiles } = driverUserIds.length
    ? await supabase
        .from('driver_profiles')
        .select('id, user_id, id_status, vehicle_status, rating_average, rating_count, id_document_url')
        .in('user_id', driverUserIds)
    : { data: [] };
  const driverProfilesByUserId = new Map(
    ((driverProfiles || []) as (DriverProfileLookupRow & { id_document_url?: string | null })[]).map((profile) => [profile.user_id, profile])
  );
  const vehicleIds = Array.from(new Set(((assignments || []) as DriverRouteAssignment[]).map((assignment) => assignment.vehicle_id).filter(Boolean)));
  const { data: vehicles } = vehicleIds.length
    ? await supabase
        .from('vehicles')
        .select('id, vehicle_photo_url, make, model, licence_plate')
        .in('id', vehicleIds)
    : { data: [] };
  const vehiclesById = new Map(
    ((vehicles || []) as VehicleLookupRow[]).map((vehicle) => [vehicle.id, vehicle])
  );

  return {
    ...detail,
    assignments: (await Promise.all((assignments || []).map(async (assignment) => {
      const baseAssignment = baseAssignmentsById.get(assignment.id);
      const memberProfile = driverMemberProfilesById.get(assignment.driver_id);
      const driverProfile = memberProfile ? driverProfilesByUserId.get(memberProfile.user_id) : null;
      const vehicle = vehiclesById.get(assignment.vehicle_id);
      const [idDocumentUrl, vehiclePhotoUrl] = await Promise.all([
        resolveSignedStorageUrl(supabase, 'id-documents', driverProfile?.id_document_url || null),
        resolveSignedStorageUrl(supabase, 'vehicle-photos', vehicle?.vehicle_photo_url || null),
      ]);

      return {
        ...(baseAssignment || {}),
        ...(assignment as DriverRouteAssignment),
        driver_name:
          baseAssignment?.driver_name ||
          (memberProfile
            ? `${memberProfile.first_name || ''} ${memberProfile.surname || ''}`.trim()
            : `Driver ${assignment.driver_id.slice(0, 8)}`),
        driver_verified: Boolean(
          driverProfile?.id_status === 'approved' &&
            driverProfile?.vehicle_status === 'approved'
        ),
        driver_avatar_url: memberProfile?.profile_photo_url || baseAssignment?.driver_avatar_url || null,
        driver_phone: memberProfile?.phone || null,
        driver_email: memberProfile?.email || null,
        id_document_url: idDocumentUrl || driverProfile?.id_document_url || null,
        rating_average: driverProfile?.rating_average ?? baseAssignment?.rating_average ?? 0,
        rating_count: driverProfile?.rating_count ?? baseAssignment?.rating_count ?? 0,
        vehicle_photo_url: vehiclePhotoUrl || baseAssignment?.vehicle_photo_url || null,
        vehicle_plate: baseAssignment?.vehicle_plate || vehicle?.licence_plate || null,
        admin_notes: assignment.admin_notes,
        approved_by: assignment.approved_by,
        approved_at: assignment.approved_at,
        phone_call_verified: assignment.phone_call_verified,
      };
    }))) as RouteReviewAssignmentSummary[],
  };
}

export async function getDriverRouteDashboard() {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return { error: current.error || 'Unable to load current profile' };
  }

  const { profile } = current;
  if (!profile) {
    return { error: 'Profile not found' };
  }
  if (profile.role !== 'driver') {
    return { error: 'Driver access required' };
  }

  const { data: driverProfileRow } = await supabase
    .from('driver_profiles')
    .select('id, user_id')
    .eq('user_id', profile.user_id)
    .maybeSingle();

  const driverIds = Array.from(
    new Set([profile.id, driverProfileRow?.id].filter((value): value is string => Boolean(value)))
  );

  const [assignmentsResult, requestsResult] = await Promise.all([
    supabase
      .from('driver_route_assignments')
      .select('id, driver_id, vehicle_id, route_id, status, seats_available, days_active, weekly_price, single_route_price, admin_notes, approved_by, approved_at, created_at, official_routes(id, name, start_area, end_area, status)')
      .in('driver_id', driverIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('route_seat_requests')
      .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
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
      .select('id, passenger_id, route_id, pickup_stop_id, dropoff_stop_id, seats_requested, requested_days, request_type, preferred_morning_time, preferred_return_time, status, matched_assignment_id, admin_notes, created_at, updated_at')
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

  const assignments = ((assignmentsResult.data || []) as DriverDashboardAssignmentRow[]).map((assignment) => ({
    ...assignment,
    route_stops: stopsByRoute.get(assignment.route_id) || [],
    passenger_request_count: requestCounts.get(assignment.id) || 0,
    official_route: (() => {
      return Array.isArray(assignment.official_routes)
        ? assignment.official_routes[0] || null
        : assignment.official_routes || null;
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
















