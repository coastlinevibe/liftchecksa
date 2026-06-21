import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSuperAdminEmail } from '@/lib/auth/routing';
import { createClient } from '@/lib/supabase/server';
import type {
  OpenRouteChatMessage,
  OpenRouteChatParticipant,
  OpenRouteChatReport,
  OpenRouteChatView,
} from '@/lib/types/route-chat';

function displayName(firstName?: string | null, surname?: string | null, fallback = 'User') {
  return `${firstName || ''} ${surname || ''}`.trim() || fallback;
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

  if (error) {
    return { error: 'Profile not found' as const };
  }

  return { user, profile: profile ?? null };
}

type DriverChatAccessProfile = {
  id: string;
  user_id: string;
  id_status?: string | null;
  vehicle_status?: string | null;
  provider_payment_status?: string | null;
  provider_next_payment_at?: string | null;
  provider_expires_at?: string | null;
  is_suspended?: boolean | null;
};

async function loadDriverAccessProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<DriverChatAccessProfile | null> {
  const { data } = await supabase
    .from('driver_profiles')
    .select('id, user_id, id_status, vehicle_status, provider_payment_status, provider_next_payment_at, provider_expires_at, is_suspended')
    .eq('user_id', userId)
    .maybeSingle();

  return (data as DriverChatAccessProfile | null) ?? null;
}

function hasValidDriverChatAccess(
  profile: { role?: string | null; membership_status?: string | null; user_id: string } | null,
  driverProfile: DriverChatAccessProfile | null
) {
  if (!profile || profile.role !== 'driver' || profile.membership_status !== 'active' || !driverProfile) {
    return false;
  }

  const dueAt = driverProfile.provider_next_payment_at || driverProfile.provider_expires_at || null;
  const paymentApproved =
    driverProfile.provider_payment_status === 'approved' && (!dueAt || new Date(dueAt) > new Date());

  return Boolean(
    paymentApproved &&
      driverProfile.id_status === 'approved' &&
      driverProfile.vehicle_status === 'approved' &&
      !driverProfile.is_suspended
  );
}

async function loadRouteThread(supabase: Awaited<ReturnType<typeof createClient>>, routeId: string) {
  return supabase
    .from('route_chat_threads')
    .select('id, route_id, created_at')
    .eq('route_id', routeId)
    .maybeSingle();
}

async function loadParticipantSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
): Promise<OpenRouteChatParticipant[]> {
  const { data: participants } = await supabase
    .from('route_chat_participants')
    .select('id, thread_id, profile_id, joined_at')
    .eq('thread_id', threadId)
    .order('joined_at', { ascending: true });

  const rows = (participants || []) as {
    id: string;
    thread_id: string;
    profile_id: string;
    joined_at: string;
  }[];
  const profileIds = Array.from(new Set(rows.map((row) => row.profile_id).filter(Boolean)));

  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, profile_photo_url')
        .in('id', profileIds)
    : { data: [] };

  const profilesById = new Map(
    ((profiles || []) as {
      id: string;
      first_name?: string | null;
      surname?: string | null;
      profile_photo_url?: string | null;
    }[]).map((profile) => [profile.id, profile])
  );

  return rows.map((participant) => {
    const profile = profilesById.get(participant.profile_id);
    return {
      id: participant.id,
      thread_id: participant.thread_id,
      profile_id: participant.profile_id,
      joined_at: participant.joined_at,
      display_name: displayName(profile?.first_name, profile?.surname, 'Member'),
      profile_photo_url: profile?.profile_photo_url || null,
    };
  });
}

async function loadMessageSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
): Promise<OpenRouteChatMessage[]> {
  const { data: messages } = await supabase
    .from('route_chat_messages')
    .select('id, thread_id, sender_id, message, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);

  const rows = (messages || []) as {
    id: string;
    thread_id: string;
    sender_id: string;
    message: string;
    created_at: string;
  }[];
  const senderIds = Array.from(new Set(rows.map((row) => row.sender_id).filter(Boolean)));

  const { data: senderProfiles } = senderIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, profile_photo_url')
        .in('id', senderIds)
    : { data: [] };

  const senderProfilesById = new Map(
    ((senderProfiles || []) as {
      id: string;
      first_name?: string | null;
      surname?: string | null;
      profile_photo_url?: string | null;
    }[]).map((profile) => [profile.id, profile])
  );

  return rows.map((message) => {
    const senderProfile = senderProfilesById.get(message.sender_id);
    return {
      id: message.id,
      thread_id: message.thread_id,
      sender_id: message.sender_id,
      sender_name: displayName(senderProfile?.first_name, senderProfile?.surname, 'Member'),
      sender_photo_url: senderProfile?.profile_photo_url || null,
      message: message.message,
      created_at: message.created_at,
    };
  });
}

async function loadReportSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threadId: string
): Promise<OpenRouteChatReport[]> {
  const { data: reports } = await supabase
    .from('route_chat_reports')
    .select('id, thread_id, reporter_id, reported_profile_id, reason, status, reviewed_by, reviewed_at, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false });

  const rows = (reports || []) as {
    id: string;
    thread_id: string;
    reporter_id: string;
    reported_profile_id: string;
    reason: string;
    status: OpenRouteChatReport['status'];
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    created_at: string;
  }[];
  const profileIds = Array.from(
    new Set(rows.flatMap((report) => [report.reporter_id, report.reported_profile_id, report.reviewed_by].filter(Boolean) as string[]))
  );

  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, surname, profile_photo_url')
        .in('id', profileIds)
    : { data: [] };

  const profilesById = new Map(
    ((profiles || []) as {
      id: string;
      first_name?: string | null;
      surname?: string | null;
      profile_photo_url?: string | null;
    }[]).map((profile) => [profile.id, profile])
  );

  return rows.map((report) => {
    const reporter = profilesById.get(report.reporter_id);
    const reported = profilesById.get(report.reported_profile_id);
    return {
      id: report.id,
      thread_id: report.thread_id,
      reporter_id: report.reporter_id,
      reporter_name: displayName(reporter?.first_name, reporter?.surname, 'Reporter'),
      reported_profile_id: report.reported_profile_id,
      reported_name: displayName(reported?.first_name, reported?.surname, 'Passenger'),
      reason: report.reason,
      status: report.status,
      reviewed_by: report.reviewed_by || null,
      reviewed_at: report.reviewed_at || null,
      created_at: report.created_at,
    };
  });
}

export async function getOpenRouteChatView(routeId: string): Promise<OpenRouteChatView | { error: string }> {
  noStore();
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    const { data: route } = await supabase
      .from('official_routes')
      .select('id, status')
      .eq('id', routeId)
      .maybeSingle();

    if (!route) {
      return { error: 'Route not found' };
    }

    return {
      route_id: routeId,
      thread_id: null,
      can_join: false,
      can_post: false,
      can_report: false,
      is_joined: false,
      is_driver: false,
      is_admin: false,
      participants: [],
      messages: [],
      reports: [],
    };
  }

  const { user, profile } = current;
  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route) {
    return { error: 'Route not found' };
  }

  const isAdmin = Boolean(profile?.role === 'platform_admin' || isSuperAdminEmail(user.email));
  const driverProfile = profile?.role === 'driver' ? await loadDriverAccessProfile(supabase, user.id) : null;
  const isActiveMember = Boolean(profile?.role === 'member' && profile?.membership_status === 'active');

  const { data: driverAssignment } = profile
    ? await supabase
        .from('driver_route_assignments')
        .select('id, route_id, driver_id, status')
        .eq('route_id', routeId)
        .eq('driver_id', profile.id)
        .in('status', ['approved', 'active'])
        .maybeSingle()
    : { data: null };

  const isDriver = Boolean(driverAssignment && hasValidDriverChatAccess(profile, driverProfile));
  const { data: thread } = await loadRouteThread(supabase, routeId);
  const threadId = thread?.id || null;

  const { data: participantRow } = threadId && profile
    ? await supabase
        .from('route_chat_participants')
        .select('id, thread_id, profile_id, joined_at')
        .eq('thread_id', threadId)
        .eq('profile_id', profile.id)
        .maybeSingle()
    : { data: null };

  const isJoined = Boolean(participantRow);
  const canJoin = Boolean(threadId && route.status === 'active' && isActiveMember && !isJoined);
  const canPost = Boolean(threadId && (isJoined || isDriver));
  const canReport = Boolean(threadId && isDriver);
  const canViewThread = Boolean(threadId && (isJoined || isDriver || isAdmin));

  const [participants, messages, reports] = canViewThread
    ? await Promise.all([
        loadParticipantSummaries(supabase, threadId),
        loadMessageSummaries(supabase, threadId),
        isAdmin || canReport ? loadReportSummaries(supabase, threadId) : Promise.resolve([]),
      ])
    : [[], [], []];

  return {
    route_id: routeId,
    thread_id: threadId,
    can_join: canJoin,
    can_post: canPost,
    can_report: canReport,
    is_joined: isJoined,
    is_driver: isDriver,
    is_admin: isAdmin,
    participants,
    messages,
    reports,
  };
}

export async function joinOpenRouteChat(routeId: string) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Login required to join the route chat')}`);
  }

  const { profile } = current;
  if (profile?.role !== 'member' || profile.membership_status !== 'active') {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Active member access required')}`);
  }

  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route || route.status !== 'active') {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Route chat is not available')}`);
  }

  const { data: thread } = await loadRouteThread(supabase, routeId);
  if (!thread?.id) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Route chat thread is missing')}`);
  }

  const { data: existingParticipant } = await supabase
    .from('route_chat_participants')
    .select('id')
    .eq('thread_id', thread.id)
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (!existingParticipant) {
    const { error } = await supabase.from('route_chat_participants').insert({
      thread_id: thread.id,
      profile_id: profile.id,
    });

    if (error) {
      redirect(`/routes/${routeId}?chat_error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath(`/routes/${routeId}`);
  revalidatePath(`/dashboard/driver/routes/${routeId}`);
  redirect(`/routes/${routeId}`);
}

export async function joinOpenRouteChatFromForm(formData: FormData) {
  return joinOpenRouteChat(String(formData.get('routeId') || ''));
}

export async function sendOpenRouteChatMessage(routeId: string, message: string) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Login required to send messages')}`);
  }

  const cleanMessage = message.trim();
  if (!cleanMessage) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Message cannot be empty')}`);
  }

  const { user, profile } = current;
  if (!profile) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Profile not found')}`);
  }
  const isAdmin = Boolean(profile?.role === 'platform_admin' || isSuperAdminEmail(user.email));
  const driverProfile = profile.role === 'driver' ? await loadDriverAccessProfile(supabase, user.id) : null;

  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route || route.status !== 'active') {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Route chat is not available')}`);
  }

  const { data: thread } = await loadRouteThread(supabase, routeId);
  if (!thread?.id) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Route chat thread is missing')}`);
  }

  const { data: participantRow } = profile
    ? await supabase
        .from('route_chat_participants')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('profile_id', profile.id)
        .maybeSingle()
    : { data: null };

  const { data: driverAssignment } = profile
    ? await supabase
        .from('driver_route_assignments')
        .select('id, route_id, driver_id, status')
        .eq('route_id', routeId)
        .eq('driver_id', profile.id)
        .in('status', ['approved', 'active'])
        .maybeSingle()
    : { data: null };

  const canSend = Boolean(participantRow || (driverAssignment && hasValidDriverChatAccess(profile, driverProfile)) || isAdmin);
  if (!canSend) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent('Join the route chat before sending messages')}`);
  }

  const { error } = await supabase.from('route_chat_messages').insert({
    thread_id: thread.id,
    sender_id: profile.id,
    message: cleanMessage,
  });

  if (error) {
    redirect(`/routes/${routeId}?chat_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/routes/${routeId}`);
  revalidatePath(`/dashboard/driver/routes/${routeId}`);
  revalidatePath(`/admin/routes/${routeId}`);
  redirect(`/routes/${routeId}`);
}

export async function sendOpenRouteChatMessageFromForm(formData: FormData) {
  return sendOpenRouteChatMessage(String(formData.get('routeId') || ''), String(formData.get('message') || ''));
}

export async function reportOpenRouteChatParticipant(routeId: string, reportedProfileId: string, reason: string) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Login required to report a passenger')}`);
  }

  const cleanReason = reason.trim();
  if (!cleanReason) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Report reason is required')}`);
  }

  const { user, profile } = current;
  if (!profile) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Profile not found')}`);
  }
  const driverProfile = profile.role === 'driver' ? await loadDriverAccessProfile(supabase, user.id) : null;
  const { data: route } = await supabase
    .from('official_routes')
    .select('id, status')
    .eq('id', routeId)
    .maybeSingle();

  if (!route || route.status !== 'active') {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Route chat is not available')}`);
  }

  const { data: thread } = await loadRouteThread(supabase, routeId);
  if (!thread?.id) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Route chat thread is missing')}`);
  }

  const { data: driverAssignment } = profile
    ? await supabase
        .from('driver_route_assignments')
        .select('id, route_id, driver_id, status')
        .eq('route_id', routeId)
        .eq('driver_id', profile.id)
        .in('status', ['approved', 'active'])
        .maybeSingle()
    : { data: null };

  const isDriver = Boolean(driverAssignment && hasValidDriverChatAccess(profile, driverProfile));

  if (!isDriver && profile?.role !== 'platform_admin') {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Only the assigned driver can report passengers')}`);
  }

  const { data: reportedParticipant } = await supabase
    .from('route_chat_participants')
    .select('id')
    .eq('thread_id', thread.id)
    .eq('profile_id', reportedProfileId)
    .maybeSingle();

  if (!reportedParticipant) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('Passenger is not part of this route chat')}`);
  }

  if (reportedProfileId === profile.id) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent('You cannot report your own profile')}`);
  }

  const { error } = await supabase.from('route_chat_reports').insert({
    thread_id: thread.id,
    reporter_id: profile.id,
    reported_profile_id: reportedProfileId,
    reason: cleanReason,
  });

  if (error) {
    redirect(`/dashboard/driver/routes/${routeId}?chat_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/driver/routes/${routeId}`);
  revalidatePath(`/admin/routes/${routeId}`);
  redirect(`/dashboard/driver/routes/${routeId}`);
}

export async function reportOpenRouteChatParticipantFromForm(formData: FormData) {
  return reportOpenRouteChatParticipant(
    String(formData.get('routeId') || ''),
    String(formData.get('reportedProfileId') || ''),
    String(formData.get('reason') || '')
  );
}

export async function updateOpenRouteChatReportStatus(routeId: string, reportId: string, status: string) {
  const supabase = await createClient();
  const current = await getCurrentProfile(supabase);

  if ('error' in current) {
    redirect(`/admin/routes/${routeId}?chat_error=${encodeURIComponent('Login required to update report status')}`);
  }

  const { user, profile } = current;
  if (!profile) {
    redirect(`/admin/routes/${routeId}?chat_error=${encodeURIComponent('Profile not found')}`);
  }
  const isAdmin = Boolean(profile?.role === 'platform_admin' || isSuperAdminEmail(user.email));
  if (!isAdmin) {
    redirect(`/admin/routes/${routeId}?chat_error=${encodeURIComponent('Platform admin access required')}`);
  }

  const cleanStatus: OpenRouteChatReport['status'] = ['new', 'under_review', 'resolved', 'dismissed'].includes(status)
    ? (status as OpenRouteChatReport['status'])
    : 'new';

  const { error } = await supabase
    .from('route_chat_reports')
    .update({
      status: cleanStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select('id')
    .maybeSingle();

  if (error) {
    redirect(`/admin/routes/${routeId}?chat_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/routes/${routeId}`);
  redirect(`/admin/routes/${routeId}`);
}

export async function updateOpenRouteChatReportStatusFromForm(formData: FormData) {
  return updateOpenRouteChatReportStatus(
    String(formData.get('routeId') || ''),
    String(formData.get('reportId') || ''),
    String(formData.get('status') || '')
  );
}
