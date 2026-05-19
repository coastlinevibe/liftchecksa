export type UserRole = 'member' | 'driver' | 'group_admin' | 'admin'
export type MembershipType = 'basic' | 'plus' | 'provider'
export type MembershipStatus = 'pending' | 'active' | 'expired' | 'suspended'
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired'
export type TripStatus = 'active' | 'full' | 'completed' | 'cancelled'
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export type ReportType = 
  | 'scam_payment' 
  | 'fake_driver' 
  | 'fake_passenger' 
  | 'wrong_vehicle' 
  | 'wrong_plate' 
  | 'no_show' 
  | 'unsafe_driving' 
  | 'harassment' 
  | 'overcharging' 
  | 'suspicious_account' 
  | 'duplicate_account'

export type ReportStatus = 
  | 'new' 
  | 'under_review' 
  | 'warning_issued' 
  | 'suspended' 
  | 'banned' 
  | 'cleared' 
  | 'appeal_requested'

export type CheckinType = 'waiting' | 'picked_up' | 'arrived' | 'something_wrong'

export interface Profile {
  id: string
  role: UserRole
  first_name: string
  surname: string
  phone: string
  profile_photo_url?: string
  membership_type?: MembershipType
  membership_status: MembershipStatus
  membership_expires_at?: string
  zii_status: 'active' | 'inactive' | 'expired'
  created_at: string
  updated_at: string
}

export interface DriverProfile {
  id: string
  user_id: string
  verification_status: VerificationStatus
  licence_status: VerificationStatus
  id_status: VerificationStatus
  vehicle_status: VerificationStatus
  provider_plan?: 'monthly' | 'annual'
  provider_expires_at?: string
  completed_trips: number
  rating_average: number
  cancellation_score: number
  is_suspended: boolean
  created_at: string
}

export interface Vehicle {
  id: string
  driver_id: string
  make: string
  model: string
  colour: string
  licence_plate: string
  licence_disc_url?: string
  vehicle_photo_url?: string
  verification_status: VerificationStatus
  created_at: string
}

export interface Trip {
  id: string
  driver_id: string
  vehicle_id: string
  origin: string
  destination: string
  route_corridor?: string
  departure_date: string
  departure_time: string
  seats_total: number
  seats_available: number
  cost_share_amount: number
  luggage_rules?: string
  pickup_points?: any
  dropoff_points?: any
  status: TripStatus
  public_slug: string
  created_at: string
}

export interface TripRequest {
  id: string
  trip_id: string
  passenger_id: string
  status: RequestStatus
  message?: string
  requested_at: string
  accepted_at?: string
}

export interface TripChat {
  id: string
  trip_id: string
  sender_id: string
  receiver_id: string
  message: string
  image_url?: string
  is_reported: boolean
  created_at: string
}

export interface Rating {
  id: string
  trip_id: string
  reviewer_id: string
  reviewed_user_id: string
  rating: number
  feedback?: string
  tags?: any
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  trip_id?: string
  report_type: ReportType
  description: string
  evidence_url?: string
  status: ReportStatus
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  plan_type: 'member_basic' | 'member_plus' | 'provider_monthly' | 'provider_annual'
  amount: number
  payment_reference: string
  proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  activated_at?: string
  expires_at?: string
  created_at: string
}

export interface TripCheckin {
  id: string
  trip_id: string
  user_id: string
  checkin_type: CheckinType
  location_lat?: number
  location_lng?: number
  notes?: string
  created_at: string
}
