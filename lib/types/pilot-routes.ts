export type PilotRouteStatus = 'draft' | 'active' | 'paused';
export type PilotAssignmentStatus = 'pending' | 'approved' | 'rejected' | 'paused' | 'active' | 'suspended';
export type PilotRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'matched' | 'confirmed';
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
  single_trip_price?: number | string | null;
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
  requested_days: string[];
  request_type: string;
  preferred_morning_time?: string | null;
  preferred_return_time?: string | null;
  status: PilotRequestStatus;
  matched_assignment_id?: string | null;
  admin_notes?: string | null;
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

export interface OfficialRouteWithStops extends OfficialRoute {
  route_stops: RouteStop[];
}

export interface RouteAssignmentSummary extends DriverRouteAssignment {
  route?: OfficialRoute | null;
  route_stops?: RouteStop[];
  passenger_request_count?: number;
}
