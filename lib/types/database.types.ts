export type UserRole = 'member' | 'driver' | 'group_admin' | 'platform_admin'
export type MembershipType = 'basic' | 'plus' | 'provider_monthly' | 'provider_quarterly' | 'provider_annual'
export type MembershipStatus = 'pending' | 'active' | 'expired' | 'suspended'
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type TripStatus = 'draft' | 'published' | 'full' | 'completed' | 'cancelled'
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export type ReportStatus = 'new' | 'under_review' | 'warning_issued' | 'suspended' | 'banned' | 'cleared' | 'appeal_requested'
export type ReportType = 
  | 'took_money_blocked'
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

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  first_name: string
  surname: string
  phone: string
  profile_photo_url?: string  // Selfie/avatar for all users
  id_document_url?: string  // ID/Passport/Licence for all users
  membership_type?: MembershipType
  membership_status: MembershipStatus
  membership_expires_at?: string
  zii_status: boolean
  created_at: string
  updated_at: string
}

export interface DriverProfile {
  id: string
  user_id: string
  verification_status: VerificationStatus
  id_status: VerificationStatus  // ID document verification
  vehicle_status: VerificationStatus  // Vehicle verification
  id_document_url?: string  // ID/Passport/Licence document
  provider_plan: 'monthly' | 'quarterly' | 'annual'
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
  vehicle_photo_url?: string  // Vehicle photo showing plate
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
  pickup_points: string[]
  dropoff_points: string[]
  status: TripStatus
  public_slug: string
  notes?: string
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
  message?: string
  image_url?: string
  created_at: string
  is_reported: boolean
}

export interface Verification {
  id: string
  user_id: string
  verification_type: 'id' | 'licence' | 'vehicle' | 'address'
  status: VerificationStatus
  document_url?: string
  reviewed_by?: string
  reviewed_at?: string
  expiry_date?: string
  notes?: string
}

export interface ZiiToken {
  id: string
  user_id: string
  token_hash: string
  token_status: 'active' | 'expired' | 'revoked'
  issued_at: string
  expires_at: string
  last_synced_at?: string
}

export interface ZiiHandshake {
  id: string
  trip_id: string
  driver_id: string
  passenger_id: string
  handshake_method: 'online' | 'bluetooth' | 'manual'
  handshake_status: 'pending' | 'completed' | 'failed'
  device_timestamp: string
  synced_at?: string
}

export interface Rating {
  id: string
  trip_id: string
  reviewer_id: string
  reviewed_user_id: string
  rating: number
  feedback?: string
  tags?: string[]
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
  plan_type: 'basic' | 'plus' | 'provider_monthly' | 'provider_quarterly' | 'provider_annual'
  amount: number
  payment_reference: string
  proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  activated_at?: string
  expires_at?: string
  created_at: string
}

export interface SavedRoute {
  id: string
  user_id: string
  origin: string
  destination: string
  alert_enabled: boolean
  created_at: string
}
