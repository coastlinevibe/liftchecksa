import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Car, CheckCircle, Clock, TrendingUp, CreditCard, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

type RecentMemberRow = {
  id: string;
  user_id: string;
  first_name: string | null;
  surname: string | null;
  phone: string | null;
  role: string;
  membership_status: string | null;
  created_at: string;
};

type RecentDriverRow = {
  id: string;
  user_id: string;
  verification_status: string | null;
  completed_trips: number | null;
  rating_average: number | null;
  created_at: string;
};

type DriverProfilePreviewRow = {
  first_name: string | null;
  surname: string | null;
  phone: string | null;
  role: string | null;
  membership_status: string | null;
};

type VerificationReviewRow = {
  verification_status: string | null;
  created_at: string;
  updated_at: string | null;
};

type ReportStatusRow = {
  status: string;
};

type RatingRow = {
  rating: number | string | null;
};

type SuspendedMemberRow = {
  id: string;
};

type SuspendedDriverRow = {
  user_id: string;
};

type DriverWithProfile = RecentDriverRow & {
  profile: DriverProfilePreviewRow | null;
};

// Helper function to get relative time
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

async function getAdminStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.role !== 'platform_admin' && profile?.role !== 'group_admin') {
    redirect('/dashboard/member');
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();

  const [
    { count: totalMembers },
    { count: verifiedDrivers },
    { count: activeRoutes },
    { count: pendingDriverVerifications },
    { count: pendingVehicleVerifications },
    { count: pendingPayments },
    { count: activeReports },
    { data: recentMembers },
    { data: recentDrivers },
    { data: driverVerificationRows },
    { data: vehicleVerificationRows },
    { data: reportRows },
    { count: activeBluetoothVerifications },
    { count: routesThisMonth },
    { data: ratingRows },
    { data: suspendedMemberRows },
    { data: suspendedDriverRows },
    { count: groupAdmins },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['member', 'driver']),
    supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
    supabase.from('official_routes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['new', 'under_review']),
    supabase.from('profiles').select('id, user_id, first_name, surname, phone, role, membership_status, created_at').eq('role', 'member').order('created_at', { ascending: false }).limit(5),
    supabase.from('driver_profiles').select('id, user_id, verification_status, completed_trips, rating_average, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('driver_profiles').select('verification_status, created_at, updated_at').in('verification_status', ['approved', 'rejected', 'expired']),
    supabase.from('vehicles').select('verification_status, created_at, updated_at').in('verification_status', ['approved', 'rejected', 'expired']),
    supabase.from('reports').select('status'),
    supabase.from('zii_tokens').select('*', { count: 'exact', head: true }).eq('token_status', 'active').gte('expires_at', nowIso),
    supabase.from('official_routes').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('ratings').select('rating'),
    supabase.from('profiles').select('id').eq('membership_status', 'suspended'),
    supabase.from('driver_profiles').select('user_id').eq('is_suspended', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'group_admin'),
  ]);

  const driversWithProfiles: DriverWithProfile[] = [];
  if (recentDrivers && recentDrivers.length > 0) {
    for (const driver of recentDrivers as RecentDriverRow[]) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, surname, phone, role, membership_status')
        .eq('user_id', driver.user_id)
        .single();

      driversWithProfiles.push({
        ...driver,
        profile,
      });
    }
  }

  const verificationReviewRows = [
    ...((driverVerificationRows || []) as VerificationReviewRow[]).map((row) => ({
      status: row.verification_status,
      createdAt: row.created_at,
      reviewedAt: row.updated_at,
    })),
    ...((vehicleVerificationRows || []) as VerificationReviewRow[]).map((row) => ({
      status: row.verification_status,
      createdAt: row.created_at,
      reviewedAt: row.updated_at,
    })),
  ].filter((row) => row.reviewedAt);

  const reviewedVerificationCount = verificationReviewRows.length;
  const approvedVerificationCount = verificationReviewRows.filter((row) => row.status === 'approved').length;
  const verificationSuccessRate = reviewedVerificationCount > 0
    ? Math.round((approvedVerificationCount / reviewedVerificationCount) * 100)
    : 0;

  const reviewDurations = verificationReviewRows
    .map((row) => new Date(row.reviewedAt).getTime() - new Date(row.createdAt).getTime())
    .filter((duration: number) => Number.isFinite(duration) && duration >= 0);
  const averageReviewTimeHours = reviewDurations.length > 0
    ? reviewDurations.reduce((sum: number, duration: number) => sum + duration, 0) / reviewDurations.length / (1000 * 60 * 60)
    : 0;

  const resolvedReportStatuses = ['warning_issued', 'suspended', 'banned', 'cleared'];
  const resolvedReportCount = ((reportRows || []) as ReportStatusRow[]).filter((report) => resolvedReportStatuses.includes(report.status)).length;
  const reportResolutionRate = reportRows && reportRows.length > 0
    ? Math.round((resolvedReportCount / reportRows.length) * 100)
    : 0;

  const averageRating = ratingRows && ratingRows.length > 0
    ? (ratingRows as RatingRow[]).reduce((sum: number, row) => sum + Number(row.rating || 0), 0) / ratingRows.length
    : 0;

  const suspendedAccountIds = new Set<string>();
  ((suspendedMemberRows || []) as SuspendedMemberRow[]).forEach((row) => suspendedAccountIds.add(row.id));
  ((suspendedDriverRows || []) as SuspendedDriverRow[]).forEach((row) => suspendedAccountIds.add(row.user_id));

  return {
    totalMembers: totalMembers || 0,
    verifiedDrivers: verifiedDrivers || 0,
    activeTrips: activeRoutes || 0,
    pendingVerifications: (pendingDriverVerifications || 0) + (pendingVehicleVerifications || 0),
    pendingDriverVerifications: pendingDriverVerifications || 0,
    pendingVehicleVerifications: pendingVehicleVerifications || 0,
    pendingPayments: pendingPayments || 0,
    activeReports: activeReports || 0,
    recentMembers: recentMembers || [],
    recentDrivers: driversWithProfiles || [],
    verificationSuccessRate,
    averageReviewTimeHours,
    reportResolutionRate,
    activeBluetoothVerifications: activeBluetoothVerifications || 0,
    tripsThisMonth: routesThisMonth || 0,
    averageRating,
    suspendedAccounts: suspendedAccountIds.size,
    groupAdmins: groupAdmins || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Admin Dashboard</h1>
              <p className="text-xs text-slate-600">Platform management & oversight</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-600">Total Members</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalMembers.toLocaleString()}</div>
            <div className="text-xs text-slate-600 mt-1">All users</div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-600">Verified Drivers</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.verifiedDrivers}</div>
            <div className="text-xs text-emerald-600 mt-1">Active</div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-600">Active Routes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.activeTrips}</div>
            <div className="text-xs text-slate-600 mt-1">Published</div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-slate-600">Pending Items</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.pendingDriverVerifications + stats.pendingVehicleVerifications + stats.pendingPayments}
            </div>
            <div className="text-xs text-amber-600 mt-1">Needs review</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-3 mb-6">
          <Link
            href="/admin/verifications"
            className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-amber-900">Driver Applications</span>
              </div>
              <div className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {stats.pendingDriverVerifications}
              </div>
            </div>
            <p className="text-xs text-amber-800">Driver applications awaiting review</p>
          </Link>

          <Link
            href="/admin/verifications"
            className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">Vehicle Applications</span>
              </div>
              <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {stats.pendingVehicleVerifications}
              </div>
            </div>
            <p className="text-xs text-emerald-800">Vehicle submissions awaiting review</p>
          </Link>

          <Link
            href="/admin/payments"
            className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-blue-900">Pending Payments</span>
              </div>
              <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {stats.pendingPayments}
              </div>
            </div>
            <p className="text-xs text-blue-800">Payment proofs to review</p>
          </Link>

          <Link
            href="/admin/reports"
            className="bg-red-50 border-2 border-red-300 rounded-xl p-4 hover:border-red-400 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-bold text-red-900">Active Reports</span>
              </div>
              <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {stats.activeReports}
              </div>
            </div>
            <p className="text-xs text-red-800">Scam reports requiring action</p>
          </Link>
        </div>

        <Link
          href="/admin/routes"
          className="mb-6 block rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 transition hover:border-emerald-400"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-emerald-900">Official Routes</div>
              <p className="text-xs text-emerald-800">Create, review, and assign official routes.</p>
            </div>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
        </Link>

        <div className="grid gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Recent Members</h2>
              <Link href="/admin/members" className="text-xs text-emerald-600 font-semibold">
                View All
              </Link>
            </div>
            {stats.recentMembers.length > 0 ? (
              <div className="space-y-2">
                {stats.recentMembers.map((member: RecentMemberRow) => {
                  const timeAgo = getTimeAgo(new Date(member.created_at));

                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {member.first_name} {member.surname}
                          </div>
                          <div className="text-xs text-slate-600 truncate">{member.phone}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-semibold text-slate-700 capitalize">
                          {member.membership_status}
                        </div>
                        <div className="text-[10px] text-slate-500">{timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">No members yet</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Recent Drivers</h2>
              <Link href="/admin/drivers" className="text-xs text-emerald-600 font-semibold">
                View All
              </Link>
            </div>
            {stats.recentDrivers.length > 0 ? (
              <div className="space-y-2">
                {stats.recentDrivers.map((driver: DriverWithProfile) => {
                  const timeAgo = getTimeAgo(new Date(driver.created_at));

                  return (
                    <div key={driver.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Car className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {driver.profile?.first_name} {driver.profile?.surname}
                          </div>
                          <div className="text-xs text-slate-600 truncate">{driver.profile?.phone}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-semibold text-slate-700 capitalize">
                          {driver.verification_status}
                        </div>
                        <div className="text-[10px] text-slate-500">{timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">No drivers yet</div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Platform Health</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Verification Success Rate</span>
                <span className="text-sm font-bold text-emerald-600">{stats.verificationSuccessRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Average Review Time</span>
                <span className="text-sm font-bold text-slate-900">{stats.averageReviewTimeHours.toFixed(1)} hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Report Resolution Rate</span>
                <span className="text-sm font-bold text-emerald-600">{stats.reportResolutionRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Active Bluetooth Verifications</span>
                <span className="text-sm font-bold text-slate-900">{stats.activeBluetoothVerifications.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-base font-bold text-slate-900 mb-3">Quick Stats</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Routes This Month</span>
                <span className="text-sm font-bold text-slate-900">{stats.tripsThisMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Average Rating</span>
                <span className="text-sm font-bold text-yellow-600">{stats.averageRating.toFixed(1)} &#9733;</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Suspended Accounts</span>
                <span className="text-sm font-bold text-red-600">{stats.suspendedAccounts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Group Admins</span>
                <span className="text-sm font-bold text-slate-900">{stats.groupAdmins}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
