export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type: 'client' | 'merchant' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  is_disabled?: boolean;
  last_sign_in_at?: string;
}

// Main property interface
export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  rooms: number;
  type: 'apartment' | 'house' | 'villa' | 'studio' | 'duplex' | 'land';
  transaction_type: 'sale' | 'rent';
  images: string[];
  documents?: string[];
  amenities?: string[];
  phone: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'active';
  payment_status?: 'pending' | 'paid' | 'failed';
  view_count: number;
  created_at: string;
  updated_at?: string;
  verified_at?: string;
  verified_by?: string;
  title_verified?: boolean;
  description_verified?: boolean;
  images_verified?: boolean;
  documents_verified?: boolean;
  rejection_reason?: string;
}

export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  properties?: Property[];
}

export interface Conversation {
  id: string;
  property_id: string;
  sender_id: string;
  receiver_id: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
  other_user_name: string;
  other_user_avatar?: string;
  property_title: string;
  property_image?: string;
  created_at: string;
}

export interface Report {
  id: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  reporter?: Partial<User>;
  reported?: Partial<User>;
}

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}
