import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/display-name';
import type {
  RoutePrivateOfferContext,
  RoutePrivateOfferSummary,
} from '@/lib/types/route-offers';

type CurrentProfile = {
  id: string;
  user_id: string;
  role: string | null;
  membership_status: string | null;
  first_name: string | null;
  surname: string | null;
  profile_photo_url: string | null;
};

type AssignedDriverSummary = {
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  status: string;
  driver_name: string | null;
  driver_photo_url: string | null;
  vehicle_plate: string | null;
  driver_user_id: string | null;
};

function toSummary(
  offer: {
    id: string;
    route_id: string;
    passenger_id: string;
    driver_id: string;
    amount: number | string;
    message: string;
    status: string;
    responded_at?: string | null;
    created_at: string;
  },
  passengerProfile?: {
    first_name?: string | null;
    surname?: string | null;
    profile_photo_url?: string | null;
  } | null,
  driverProfile?: {
    first_name?: string | null;
    surname?: string | null;
    profile_photo_url?: string | null;
  } | null
): RoutePrivateOfferSummary {
  return {
    ...offer,
    status: offer.status as RoutePrivateOfferSummary['status'],
    passenger_name: getDisplayName({
      firstName: passengerProfile?.first_name,
      surname: passengerProfile?.surname,
      fallback: 'Passenger',
    }),
    passenger_avatar_url: passengerProfile?.profile_photo_url || null,
    driver_name: getDisplayName({
      firstName: driverProfile?.first_name,
      surname: driverProfile?.surname,
      fallback: 'Driver',
    }),
    driver_avatar_url: driverProfile?.profile_photo_url || null,
  };
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
    .select('id, user_id, role, membership_status, first_name, surname, profile_photo_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return { error: 'Profile not found' as const };
  }

  return { user, profile: profile as CurrentProfile };
}

async function loadAssignedDriver(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeId: string
): Promise<AssignedDriverSummary | null> {
  const { data: assignment } = await supabase
    .from('driver_route_assignments')
    .select('driver_id, vehicle_id, route_id, status')
    .eq('route_id', routeId)
    .in('status', ['approved', 'active'])
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (!assignment) {
    return null;
  }

  const { data: driverProfile } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, surname, profile_photo_url')
    .eq('id', assignment.driver_id)
    .maybeSingle();

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('licence_plate')
    .eq('id', assignment.vehicle_id)
    .maybeSingle();

  return {
    driver_id: assignment.driver_id,
    vehicle_id: assignment.vehicle_id,
    route_id: assignment.route_id,
    status: assignment.status,
    driver_name: getDisplayName({
      firstName: driverProfile?.first_name,
      surname: driverProfile?.surname,
      fallback: 'Driver',
    }),
    driver_photo_url: driverProfile?.profile_photo_url || null,
    vehicle_plate: vehicle?.licence_plate || null,
    driver_user_id: driverProfile?.user_id || null,
  };
}

async function loadOfferRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeId: string,
  profileFilter?: string | null
): Promise<RoutePrivateOfferSummary[]> {
  let query = supabase
    .from('route_private_offers')
    .select('id, route_id, passenger_id, driver_id, amount, message, status, responded_at, created_at')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false });

  if (profileFilter) {
    query = query.eq('passenger_id', profileFilter);
  }

  const { data: offers } = await query;
  const rows = (offers || []) as {
    id: string;
    route_id: string;
    passenger_id: string;
    driver_id: string;
    amount: number | string;
    message: string;
    status: string;
    responded_at?: string | null;
    created_at: string;
  }[];

  const passengerIds = Array.from(new Set(rows.map((row) => row.passenger_id).filter(Boolean)));
  const driverIds = Array.from(new Set(rows.map((row) => row.driver_id).filter(Boolean)));

  const { data: passengerProfiles } = passengerIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, profile_photo_url')
        .in('id', passengerIds)
    : { data: [] };

  const { data: driverProfiles } = driverIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, profile_photo_url')
        .in('id', driverIds)
    : { data: [] };

  const passengerById = new Map(
    ((passengerProfiles || []) as {
      id: string;
      first_name?: string | null;
      surname?: string | null;
      profile_photo_url?: string | null;
    }[]).map((profile) => [profile.id, profile])
  );
  const driverById = new Map(
    ((driverProfiles || []) as {
      id: string;
      first_name?: string | null;
      surname?: string | null;
      profile_photo_url?: string | null;
    }[]).map((profile) => [profile.id, profile])
  );

  return rows.map((offer) => toSummary(offer, passengerById.get(offer.passenger_id), driverById.get(offer.driver_id)));
}

export async function getRoutePrivateOfferContext(routeId: string): Promise<RoutePrivateOfferContext | null> {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return null;
  }

  const { profile } = current;
  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  const assignedDriver = await loadAssignedDriver(supabase, routeId);
  const driverCanReceiveOffer = Boolean(
    assignedDriver?.driver_user_id &&
      (await supabase.rpc('is_valid_private_offer_driver', {
        input_user_id: assignedDriver.driver_user_id,
        input_route_id: routeId,
      })).data
  );

  const canMakeOffer = Boolean(
    route?.status === 'active' &&
      profile.role === 'member' &&
      profile.membership_status === 'active' &&
      driverCanReceiveOffer
  );

  const { data: ownOffer } = await supabase
    .from('route_private_offers')
    .select('id, route_id, passenger_id, driver_id, amount, message, status, responded_at, created_at')
    .eq('route_id', routeId)
    .eq('passenger_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const driverProfile = assignedDriver?.driver_id
    ? await supabase
        .from('profiles')
        .select('first_name, surname, profile_photo_url')
        .eq('id', assignedDriver.driver_id)
        .maybeSingle()
    : { data: null };

  const ownOfferSummary = ownOffer
    ? toSummary(
        ownOffer as {
          id: string;
          route_id: string;
          passenger_id: string;
          driver_id: string;
          amount: number | string;
          message: string;
          status: string;
          responded_at?: string | null;
          created_at: string;
        },
        {
          first_name: profile.first_name,
          surname: profile.surname,
          profile_photo_url: profile.profile_photo_url,
        },
        driverProfile.data
      )
    : null;

  return {
    can_make_offer: canMakeOffer,
    can_withdraw_offer: ownOfferSummary?.status === 'pending',
    current_offer: ownOfferSummary,
    assigned_driver_name: assignedDriver?.driver_name || null,
    assigned_driver_plate: assignedDriver?.vehicle_plate || null,
  };
}

export async function getVisibleRoutePrivateOffers(routeId: string): Promise<RoutePrivateOfferSummary[]> {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);
  if ('error' in current) {
    return [];
  }

  const { profile } = current;
  const driverVisible = await supabase.rpc('is_valid_private_offer_driver', {
    input_user_id: profile.user_id,
    input_route_id: routeId,
  });

  const isAdmin = profile.role === 'platform_admin';
  const canSeeAll = Boolean(isAdmin || driverVisible.data);
  return loadOfferRows(supabase, routeId, canSeeAll ? null : profile.id);
}

export async function createPrivateOfferFromForm(formData: FormData) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/routes/${String(formData.get('routeId') || '')}?offer_error=${encodeURIComponent(current.error ?? 'Not authenticated')}`);
  }

  const { profile } = current;
  const routeId = String(formData.get('routeId') || '');
  const amount = Number(formData.get('amount') || 0);
  const message = String(formData.get('message') || '').trim();

  if (!routeId) {
    redirect('/routes?offer_error=Missing route');
  }

  if (profile.role !== 'member' || profile.membership_status !== 'active') {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Active member access required')}`);
  }

  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route || route.status !== 'active') {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Route is not available for offers')}`);
  }

  const assignedDriver = await loadAssignedDriver(supabase, routeId);
  if (!assignedDriver || !assignedDriver.driver_user_id) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('No assigned driver is available for this route')}`);
  }

  const { data: driverCanReceiveOffer } = await supabase.rpc('is_valid_private_offer_driver', {
    input_user_id: assignedDriver.driver_user_id,
    input_route_id: routeId,
  });

  if (!driverCanReceiveOffer) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Assigned driver is not available for private offers')}`);
  }

  const { data: pendingOffer } = await supabase
    .from('route_private_offers')
    .select('id')
    .eq('route_id', routeId)
    .eq('passenger_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingOffer) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('You already have a pending offer on this route')}`);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Enter a valid offer amount')}`);
  }

  if (!message) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Enter a message for the driver')}`);
  }

  const { error } = await supabase.from('route_private_offers').insert({
    route_id: routeId,
    passenger_id: profile.id,
    driver_id: assignedDriver.driver_id,
    amount,
    message,
    status: 'pending',
  });

  if (error) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePaths(routeId);
  redirect(`/routes/${routeId}?offer_success=1`);
}

export async function respondToPrivateOfferFromForm(formData: FormData) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/dashboard/driver/routes/${String(formData.get('routeId') || '')}?offer_error=${encodeURIComponent(current.error ?? 'Not authenticated')}`);
  }

  const { profile } = current;
  const routeId = String(formData.get('routeId') || '');
  const offerId = String(formData.get('offerId') || '');
  const decision = String(formData.get('decision') || '');

  if (!offerId || !routeId) {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent('Missing offer details')}`);
  }

  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route || route.status !== 'active') {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent('Route is not available')}`);
  }

  const { data: driverOfferVisible } = await supabase.rpc('is_valid_private_offer_driver', {
    input_user_id: profile.user_id,
    input_route_id: routeId,
  });

  if (!driverOfferVisible) {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent('Driver access is not available for this route')}`);
  }

  if (!['accepted', 'declined'].includes(decision)) {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent('Invalid offer decision')}`);
  }

  const { data: existingOffer } = await supabase
    .from('route_private_offers')
    .select('id, passenger_id, driver_id, status')
    .eq('id', offerId)
    .eq('route_id', routeId)
    .eq('driver_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!existingOffer) {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent('Offer is no longer pending')}`);
  }

  const { error } = await supabase
    .from('route_private_offers')
    .update({
      status: decision,
      responded_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .eq('route_id', routeId)
    .eq('driver_id', profile.id)
    .eq('status', 'pending');

  if (error) {
    redirect(`/dashboard/driver/routes/${routeId}?offer_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePaths(routeId);
  redirect(`/dashboard/driver/routes/${routeId}?offer_success=1`);
}

export async function withdrawPrivateOfferFromForm(formData: FormData) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/routes/${String(formData.get('routeId') || '')}?offer_error=${encodeURIComponent(current.error ?? 'Not authenticated')}`);
  }

  const { profile } = current;
  const routeId = String(formData.get('routeId') || '');
  const offerId = String(formData.get('offerId') || '');

  if (!offerId || !routeId) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Missing offer details')}`);
  }

  const { data: offer } = await supabase
    .from('route_private_offers')
    .select('id, passenger_id, status')
    .eq('id', offerId)
    .eq('route_id', routeId)
    .eq('passenger_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!offer) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent('Offer is no longer pending')}`);
  }

  const { error } = await supabase
    .from('route_private_offers')
    .update({
      status: 'withdrawn',
      responded_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .eq('route_id', routeId)
    .eq('passenger_id', profile.id)
    .eq('status', 'pending');

  if (error) {
    redirect(`/routes/${routeId}?offer_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePaths(routeId);
  redirect(`/routes/${routeId}?offer_success=1`);
}

function revalidatePaths(routeId: string) {
  revalidatePath(`/routes/${routeId}`);
  revalidatePath(`/dashboard/driver/routes/${routeId}`);
  revalidatePath(`/admin/routes/${routeId}`);
  revalidatePath('/routes');
  revalidatePath('/dashboard/driver/routes');
  revalidatePath('/admin/routes');
}
