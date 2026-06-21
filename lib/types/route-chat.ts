export interface OpenRouteChatThread {
  id: string;
  route_id: string;
  created_at: string;
}

export interface OpenRouteChatParticipant {
  id: string;
  thread_id: string;
  profile_id: string;
  joined_at: string;
  display_name: string;
  profile_photo_url?: string | null;
}

export interface OpenRouteChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_photo_url?: string | null;
  message: string;
  created_at: string;
}

export interface OpenRouteChatReport {
  id: string;
  thread_id: string;
  reporter_id: string;
  reporter_name: string;
  reported_profile_id: string;
  reported_name: string;
  reason: string;
  status: 'new' | 'under_review' | 'resolved' | 'dismissed';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface OpenRouteChatView {
  route_id: string;
  thread_id: string | null;
  can_join: boolean;
  can_post: boolean;
  can_report: boolean;
  is_joined: boolean;
  is_driver: boolean;
  is_admin: boolean;
  participants: OpenRouteChatParticipant[];
  messages: OpenRouteChatMessage[];
  reports: OpenRouteChatReport[];
}

