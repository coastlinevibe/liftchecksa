export type PilotRouteStatus = 'draft' | 'active' | 'paused';
export type PilotAssignmentStatus = 'pending' | 'approved' | 'rejected' | 'paused' | 'active' | 'suspended';
export type PilotRequestStatus =
  | 'pending'
  | 'approved'
  | 'assigned'
  | 'cancellation_requested'
  | 'rejected'
  | 'cancelled'
  | 'removed'
  | 'matched'
  | 'confirmed';
export type PilotPaymentMethod =
  | 'manual_eft'
  | 'cash_marked'
  | 'payfast'
  | 'paystack'
  | 'peach'
  | 'stitch'
  | 'ikhokha_tap_on_phone'
  | 'yoco_tap_to_pay';

export const WEEKDAY_OPTIONS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAY_OPTIONS)[number];

export const VEHICLE_CAPACITY_OPTIONS = [4, 5, 7, 10, 12] as const;
export type VehicleCapacity = (typeof VEHICLE_CAPACITY_OPTIONS)[number];

export function getPassengerSeatCapacity(totalSeats?: number | null) {
  if (!totalSeats || totalSeats < 1) {
    return null;
  }

  return Math.max(0, totalSeats - 1);
}

export function formatVehicleCapacity(totalSeats?: number | null) {
  if (!totalSeats) {
    return 'Capacity pending';
  }

  const passengerSeats = getPassengerSeatCapacity(totalSeats);
  return passengerSeats !== null
    ? `${totalSeats} seater (${passengerSeats} passenger seats)`
    : `${totalSeats} seater`;
}

export function formatPassengerSeats(totalSeats?: number | null) {
  const passengerSeats = getPassengerSeatCapacity(totalSeats);
  if (passengerSeats === null) {
    return 'Passenger seats pending';
  }

  return `${passengerSeats} passenger seat${passengerSeats === 1 ? '' : 's'}`;
}

export interface RouteStopInput {
  stop_name: string;
  area?: string;
  notes?: string;
  estimated_morning_time?: string;
  estimated_return_time?: string;
  is_start?: boolean;
  is_end?: boolean;
}

export interface OfficialRoute {
  id: string;
  name: string;
  slug?: string | null;
  start_area: string;
  end_area: string;
  route_type: string;
  vehicle_capacity?: VehicleCapacity | null;
  status: PilotRouteStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  area?: string | null;
  notes?: string | null;
  estimated_morning_time?: string | null;
  estimated_return_time?: string | null;
  is_start: boolean;
  is_end: boolean;
  created_at: string;
}

export interface DriverRouteAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  status: PilotAssignmentStatus;
  seats_available: number;
  days_active: string[];
  weekly_price?: number | string | null;
  single_route_price?: number | string | null;
  admin_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface RouteSeatRequest {
  id: string;
  passenger_id: string;
  route_id: string;
  pickup_stop_id: string;
  dropoff_stop_id: string;
  seats_requested?: number;
  requested_days: string[];
  request_type: string;
  preferred_morning_time?: string | null;
  preferred_return_time?: string | null;
  status: PilotRequestStatus;
  matched_assignment_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  seat_number?: number | null;
  seat_assigned_by?: string | null;
  seat_assigned_at?: string | null;
  cancellation_requested_by?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_reviewed_by?: string | null;
  cancellation_reviewed_at?: string | null;
  removed_by?: string | null;
  removed_at?: string | null;
  removed_reason?: string | null;
  admin_notes?: string | null;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  passenger_email?: string | null;
  passenger_avatar_url?: string | null;
  pickup_stop_name?: string | null;
  dropoff_stop_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RidePaymentLedgerEntry {
  id: string;
  passenger_id: string;
  driver_id: string;
  route_id: string;
  seat_request_id?: string | null;
  amount: number | string;
  platform_fee: number | string;
  driver_amount: number | string;
  payment_period: string;
  payment_method: PilotPaymentMethod | string;
  payment_provider?: string | null;
  provider_reference?: string | null;
  status: string;
  payout_status: string;
  proof_url?: string | null;
  paid_at?: string | null;
  confirmed_at?: string | null;
  payout_due_at?: string | null;
  payout_completed_at?: string | null;
  created_at: string;
}

export interface ContactUnlock {
  id: string;
  passenger_id: string;
  driver_id: string;
  route_id: string;
  seat_request_id?: string | null;
  passenger_accepted: boolean;
  driver_accepted: boolean;
  unlocked_at?: string | null;
  created_at: string;
}

export interface RouteChatMessage {
  id: string;
  route_id: string;
  assignment_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at?: string | null;
}

export interface OfficialRouteWithStops extends OfficialRoute {
  route_stops: RouteStop[];
  assigned_drivers?: {
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
    vehicle_photo_url?: string | null;
    vehicle_label?: string | null;
    rating_average?: number | string | null;
    rating_count?: number | null;
  }[];
}

export interface RouteAssignmentSummary {
  id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  status: PilotAssignmentStatus;
  seats_available: number;
  days_active: string[];
  weekly_price?: number | string | null;
  single_route_price?: number | string | null;
  created_at: string;
  route?: OfficialRoute | null;
  route_stops?: RouteStop[];
  passenger_request_count?: number;
  driver_name?: string;
  driver_verified?: boolean;
  driver_avatar_url?: string | null;
  vehicle_photo_url?: string | null;
  vehicle_plate?: string | null;
  rating_average?: number | string | null;
  rating_count?: number | null;
}

export interface RouteReviewAssignmentSummary extends RouteAssignmentSummary {
  admin_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  phone_call_verified?: boolean | null;
  driver_phone?: string | null;
  driver_email?: string | null;
  id_document_url?: string | null;
}

export interface PublicRouteDetail {
  route: OfficialRoute;
  stops: RouteStop[];
  assignments: RouteAssignmentSummary[];
}

export interface DriverRouteDetail extends PublicRouteDetail {
  requests: RouteSeatRequest[];
  ledger: RidePaymentLedgerEntry[];
}

export interface AdminRouteReviewDetail extends Omit<DriverRouteDetail, 'assignments'> {
  assignments: RouteReviewAssignmentSummary[];
}
