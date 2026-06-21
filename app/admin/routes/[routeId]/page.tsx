import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronDown, ListOrdered, Plus, Route, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { deleteOfficialRoute, getRouteDetail, updateOfficialRouteStatusFromForm, updateDriverRouteApplicationDecision, updateDriverRouteApplicationPhoneCallVerified } from '@/lib/routes/actions';
import { isAdminRole, isSuperAdminEmail } from '@/lib/auth/routing';
import { formatPassengerSeats, formatVehicleCapacity } from '@/lib/types/pilot-routes';
import DeleteRouteButton from './DeleteRouteButton';

function badgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'paused') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function formatPreferredTime(morning?: string | null, returnTime?: string | null) {
  const parts: string[] = [];
  if (morning) parts.push(`AM ${morning}`);
  if (returnTime) parts.push(`PM ${returnTime}`);
  return parts.length > 0 ? parts.join(' ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ') : 'Not set';
}

export default async function AdminRouteDetailPage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!isAdminRole(profile?.role) && !isSuperAdminEmail(user.email)) {
    redirect('/admin');
  }

  const detail = await getRouteDetail(routeId);
  if ('error' in detail) {
    notFound();
  }

  const { route, stops, assignments, requests, ledger } = detail;
  const pendingApplications = assignments.filter((assignment) => assignment.status === 'pending');
  const assignedDrivers = assignments.filter((assignment) => ['approved', 'active'].includes(assignment.status));

  const deleteRouteAction = async () => {
    'use server';
    await deleteOfficialRoute(route.id);
  };

  const updateStatusAction = async (formData: FormData) => {
    'use server';
    await updateOfficialRouteStatusFromForm(formData);
  };

  const updatePhoneCallVerifiedAction = async (formData: FormData) => {
    'use server';
    await updateDriverRouteApplicationPhoneCallVerified({
      assignmentId: String(formData.get('assignmentId') || ''),
      routeId,
      phoneCallVerified: formData.get('phone_call_verified') === 'on',
    });
  };

  const updateApplicationDecisionAction = async (formData: FormData) => {
    'use server';
    const decision = String(formData.get('decision') || '') as 'approved' | 'rejected';
    await updateDriverRouteApplicationDecision({
      assignmentId: String(formData.get('assignmentId') || ''),
      routeId,
      decision,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/admin" className="inline-flex items-center text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to admin
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/admin/routes" className="inline-flex items-center text-slate-600 hover:text-slate-900">
              Routes
            </Link>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{route.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(route.status)}`}>
                  {route.status}
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {formatVehicleCapacity(route.vehicle_capacity)}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {route.start_area} &rarr; {route.end_area}
              </p>
              <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  Allowed seating type
                </div>
                <div className="text-sm font-bold text-violet-900">
                  {formatVehicleCapacity(route.vehicle_capacity)}
                </div>
                <p className="mt-1 text-xs text-violet-800">
                  Only vehicles with this total capacity can be used for route applications on this route.
                </p>
                <div className="mt-1 text-[11px] text-violet-700">
                  {formatPassengerSeats(route.vehicle_capacity)}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Driver applications
                </div>
                <div className="text-sm font-bold text-amber-900">
                  {pendingApplications.length} pending / {assignedDrivers.length} assigned
                </div>
                <p className="mt-1 text-xs text-amber-800">
                  Drivers apply from their dashboard with a registered vehicle. Use Assign Driver once you are ready to approve one.
                </p>
              </div>
              <form action={updateStatusAction} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <input type="hidden" name="routeId" value={route.id} />
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  Route status
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    name="status"
                    defaultValue={route.status}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Save Status
                  </button>
                </div>
              </form>
            </div>
            <Link
              href={`/admin/routes/${route.id}/assign-driver`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              Review Application
            </Link>
            <DeleteRouteButton action={deleteRouteAction} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Route className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Ordered Stops</h2>
            </div>
            <div className="space-y-2">
              {stops.map((stop) => (
                <div key={stop.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {stop.stop_order}. {stop.stop_name}
                      </div>                      <div className="text-xs text-slate-600">
                        {stop.area || 'No area set'}
                        {stop.is_start ? ' Ã¢â‚¬Â¢ Start' : ''}
                        {stop.is_end ? ' Ã¢â‚¬Â¢ Destination' : ''}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {stop.estimated_morning_time ? <div>AM {stop.estimated_morning_time}</div> : null}
                      {stop.estimated_return_time ? <div>PM {stop.estimated_return_time}</div> : null}
                    </div>
                  </div>
                  {stop.notes ? <p className="mt-2 text-xs text-slate-500">{stop.notes}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Driver Applications</h2>
            </div>
            <div className="space-y-3">
              {pendingApplications.map((assignment) => {
                const submittedAt = new Date(assignment.created_at).toLocaleDateString();
                const statusLabel = assignment.status === 'pending' ? 'Pending review' : assignment.status;
                const showReviewDetails = assignment.status === 'pending';
                const applicationHeader = (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {assignment.driver_name || `Driver ${assignment.driver_id.slice(0, 8)}`}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Vehicle: {assignment.vehicle_plate || 'Plate unavailable'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Status: {statusLabel}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Passenger seats: {assignment.seats_available}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Contact: {assignment.driver_phone || 'Unavailable'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Rating: {Number(assignment.rating_average || 0).toFixed(1)} / 5 ({assignment.rating_count || 0} reviews)
                      </div>
                      <div className="mt-1 text-xs text-slate-600">Submitted: {submittedAt}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {assignment.driver_verified ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" />
                          Verified driver
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
                const reviewDetails = showReviewDetails ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Driver contact</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {assignment.driver_phone || 'Unavailable'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Confirm this number with a phone call before approving the driver.
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Driver ID</div>
                      {assignment.id_document_url ? (
                        <Image
                          src={assignment.id_document_url}
                          alt={`${assignment.driver_name || 'Driver'} ID document`}
                          width={1200}
                          height={800}
                          className="mt-2 h-48 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-xs text-slate-500">
                          ID document unavailable
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vehicle photo</div>
                      {assignment.vehicle_photo_url ? (
                        <Image
                          src={assignment.vehicle_photo_url}
                          alt={`${assignment.driver_name || 'Driver'} vehicle`}
                          width={1200}
                          height={800}
                          className="mt-2 h-56 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-xs text-slate-500">
                          Vehicle photo unavailable
                        </div>
                      )}
                    </div>

                    <form action={updatePhoneCallVerifiedAction} className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <input
                          type="checkbox"
                          name="phone_call_verified"
                          defaultChecked={Boolean(assignment.phone_call_verified)}
                          className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Phone call verified
                      </label>
                      <p className="mt-1 text-xs text-emerald-800">
                        Check this after confirming the driver identity by phone.
                      </p>
                      <button
                        type="submit"
                        className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        Save verification
                      </button>
                    </form>

                    <form action={updateApplicationDecisionAction} className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finish application</div>
                      <p className="mt-1 text-xs text-slate-600">Approve Ben to activate this driver on the route, or decline the application.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          name="decision"
                          value="approved"
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          Assign Driver
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                        >
                          Decline driver
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null;

                return (
                  <details key={assignment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {applicationHeader}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                          <ChevronDown className="h-3.5 w-3.5" />
                          Expand
                        </div>
                      </div>
                    </summary>
                    {reviewDetails}
                  </details>
                );
              })}
              {pendingApplications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No driver applications yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Passenger Requests</h2>
            </div>
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {request.passenger_name || `Passenger ${request.passenger_id.slice(0, 8)}`}
                  </div>                      <div className="text-xs text-slate-600">
                    Status: {request.status} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Type: {request.request_type}
                  </div>                      <div className="text-xs text-slate-600">Seats: {request.seats_requested ?? 1}</div>                      <div className="text-xs text-slate-600">
                    Days: {(request.requested_days || []).join(', ')}
                  </div>                      <div className="text-xs text-slate-600">
                    Time: {formatPreferredTime(request.preferred_morning_time, request.preferred_return_time)}
                  </div>
                </div>
              ))}
              {requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No passenger requests yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Ledger Preview</h2>
            </div>
            <div className="space-y-2">
              {ledger.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">R{entry.amount}</div>                      <div className="text-xs text-slate-600">
                    {entry.payment_method} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {entry.status} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ payout {entry.payout_status}
                  </div>
                </div>
              ))}
              {ledger.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No payment ledger entries yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}





