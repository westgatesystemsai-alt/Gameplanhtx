// TypeScript interfaces mirroring the Supabase database schema.
// See GamePlanHTX_Build_Brief.md Section 5.

export type UserRole = 'planner' | 'vendor' | 'admin'
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type VendorTier = 'base' | 'pro' | 'premium'
export type PriceType = 'flat' | 'hourly' | 'per_person' | 'contact'
export type MediaType = 'image' | 'video'
export type ConversationStatus = 'active' | 'archived' | 'booked'
export type QuoteStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'disputed'
export type BookingStatus = 'confirmed' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface VerifiedItems {
  insurance: boolean
  license: boolean
  portfolio: boolean
  standards: boolean
}

export interface Vendor {
  id: string
  profile_id: string
  business_name: string
  slug: string
  bio: string | null
  city: string
  zip_code: string | null
  website_url: string | null
  instagram_url: string | null
  status: VendorStatus
  tier: VendorTier
  stripe_account_id: string | null
  stripe_onboarded: boolean
  subscription_id: string | null
  avg_rating: number
  review_count: number
  response_rate: number | null
  profile_completeness: number
  price_range_min: number | null
  price_range_max: number | null
  verified_items: VerifiedItems
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  sort_order: number
}

export interface VendorCategory {
  vendor_id: string
  category_id: string
}

export interface EventType {
  id: string
  name: string
  slug: string
}

export interface Service {
  id: string
  vendor_id: string
  title: string
  description: string | null
  price_type: PriceType | null
  price_amount: number | null
  duration_hours: number | null
  min_guests: number | null
  max_guests: number | null
  is_active: boolean
  created_at: string
}

export interface PortfolioMedia {
  id: string
  vendor_id: string
  cloudinary_id: string
  url: string
  thumbnail_url: string | null
  media_type: MediaType | null
  caption: string | null
  sort_order: number
  created_at: string
}

export interface Availability {
  id: string
  vendor_id: string
  date: string
  is_available: boolean
  note: string | null
}

export interface Conversation {
  id: string
  planner_id: string | null
  vendor_id: string | null
  status: ConversationStatus
  last_message_at: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

export interface Quote {
  id: string
  conversation_id: string | null
  vendor_id: string | null
  planner_id: string | null
  service_id: string | null
  event_date: string
  event_type: string | null
  guest_count: number | null
  description: string | null
  amount: number
  platform_fee: number
  vendor_payout: number
  status: QuoteStatus
  expires_at: string | null
  created_at: string
}

export interface Booking {
  id: string
  quote_id: string | null
  planner_id: string | null
  vendor_id: string | null
  event_date: string
  amount: number
  platform_fee: number
  vendor_payout: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  payment_status: PaymentStatus
  booking_status: BookingStatus
  review_requested_at: string | null
  created_at: string
}

export interface Review {
  id: string
  booking_id: string | null
  vendor_id: string | null
  planner_id: string | null
  rating: number
  body: string | null
  is_published: boolean
  created_at: string
}

export interface VendorApplication {
  id: string
  profile_id: string | null
  business_name: string
  category_ids: string[] | null
  bio: string | null
  website_url: string | null
  instagram_url: string | null
  years_experience: number | null
  portfolio_urls: string[] | null
  status: ApplicationStatus
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}
