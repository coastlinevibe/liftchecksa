export type PrivateOfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export interface RoutePrivateOffer {
  id: string;
  route_id: string;
  passenger_id: string;
  driver_id: string;
  amount: number | string;
  message: string;
  status: PrivateOfferStatus;
  responded_at?: string | null;
  created_at: string;
}

export interface RoutePrivateOfferSummary extends RoutePrivateOffer {
  passenger_name?: string | null;
  passenger_avatar_url?: string | null;
  driver_name?: string | null;
  driver_avatar_url?: string | null;
}

export interface RoutePrivateOfferContext {
  can_make_offer: boolean;
  can_withdraw_offer: boolean;
  current_offer: RoutePrivateOfferSummary | null;
  assigned_driver_name: string | null;
  assigned_driver_plate: string | null;
}
