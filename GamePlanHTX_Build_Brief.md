# Game Plan HTX — Complete Build Brief
**Version:** 1.0 | **Date:** July 5, 2026  
**Platform:** gameplanhtx.com  
**GitHub:** github.com/westgatesystemsai-alt/Gameplanhtx  
**Local path:** C:\Users\westo\gameplanhtx  
**Owner:** West Williams — westong03@gmail.com

---

## 1. WHAT WE ARE BUILDING

Game Plan HTX is a two-sided, vetted event vendor marketplace for Houston, TX. Planners find, message, quote, book, and pay event vendors entirely within the platform. Vendors apply, get vetted by the admin, build profiles, receive inquiries, send quotes, and collect payouts via Stripe Connect.

The core differentiator: **every vendor category under one roof** (no jumping between Thumbtack, WeddingWire, GigSalad). Cross-category search is the primary UX promise.

The platform has three user roles: **Planner**, **Vendor**, and **Admin** (WestGate). Each gets a separate authenticated dashboard.

---

## 2. BUSINESS MODEL

### Revenue Streams
| Stream | Details |
|--------|---------|
| Vendor subscription | Base (free), Pro ($49/mo), Premium ($99/mo) |
| Platform transaction fee | 7.5% of each booking, auto-deducted via Stripe Connect |

### Fee Math (per $1,000 booking)
- Stripe processing: ~$29 (2.9% + $0.30)
- Platform fee: $75 (7.5%)
- Vendor receives: ~$896
- Stripe Connect payout fee: $0.25 + 0.25% additional on payouts

### Vendor Tier Principle
**Tiers unlock features, not ranking position.** A Base vendor with great reviews ranks above a Premium vendor with poor reviews. Ranking algorithm is identical for all tiers (see Section 9).

| Feature | Base | Pro | Premium |
|---------|------|-----|---------|
| Listed on platform | ✅ | ✅ | ✅ |
| Profile photos | 5 | 20 | Unlimited |
| Featured rotation eligibility | ❌ | ✅ | ✅ |
| Priority featured placement | ❌ | ❌ | ✅ |
| Booking analytics | ❌ | ✅ | ✅ |
| Response time badge | ❌ | ✅ | ✅ |
| Early access to new features | ❌ | ❌ | ✅ |
| Price | Free | $49/mo | $99/mo |

---

## 3. TECH STACK (Verified July 2026)

| Layer | Tool | Version/Plan | Purpose |
|-------|------|-------------|---------|
| Framework | Next.js | 16.2.x (App Router, TypeScript, Turbopack) | SSR, routing, API routes |
| Database | Supabase | Pro ($25/mo) | PostgreSQL, Auth, Realtime, RLS, Storage |
| Payments | Stripe Connect Express | Current | Destination charges, vendor payouts, subscriptions |
| Media | Cloudinary | Free tier → Plus ($89/mo) | Vendor photo/video portfolio |
| Email | Resend | Free → Pro ($20/mo) | Transactional email |
| Hosting | Vercel | Pro ($20/seat/mo) | Next.js deployment, edge network |
| Domain | Cloudflare | gameplanhtx.com | DNS, registrar |
| Styling | Tailwind CSS | Latest | Utility-first CSS |
| Marketing/CRM | GHL / GrowthHub365 | Existing account | Back-office only — NOT part of codebase |

**Node.js minimum:** 20 (required by Next.js 16)  
**Package manager:** npm  
**Language:** TypeScript throughout

---

## 4. ENVIRONMENT VARIABLES

All variables go into Vercel → Project → Settings → Environment Variables (Production + Preview + Development). Also create a `.env.local` file locally at `C:\Users\westo\gameplanhtx\.env.local`.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=          # Add after first deploy — register webhook URL in Stripe Dashboard

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Resend
RESEND_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=https://gameplanhtx.com
NEXT_PUBLIC_PLATFORM_FEE_PERCENT=7.5
```

**Where to find each key:**
- Supabase: Project → Settings → API
- Stripe: Dashboard → Developers → API Keys
- Stripe Webhook Secret: Dashboard → Developers → Webhooks → Add endpoint → `https://gameplanhtx.com/api/payments/webhook` → copy signing secret
- Cloudinary: Dashboard (cloudinary.com) → API Keys
- Resend: Dashboard (resend.com) → API Keys

---

## 5. DATABASE SCHEMA (Supabase / PostgreSQL)

### Tables

#### `profiles`
Extends Supabase `auth.users`. Created automatically on user signup via trigger.
```sql
id              uuid PRIMARY KEY REFERENCES auth.users(id)
role            text NOT NULL CHECK (role IN ('planner', 'vendor', 'admin'))
full_name       text
email           text
avatar_url      text
phone           text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### `vendors`
```sql
id                      uuid PRIMARY KEY DEFAULT gen_random_uuid()
profile_id              uuid REFERENCES profiles(id) NOT NULL
business_name           text NOT NULL
slug                    text UNIQUE NOT NULL
bio                     text
city                    text DEFAULT 'Houston'
zip_code                text
website_url             text
instagram_url           text
status                  text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended'))
tier                    text DEFAULT 'base' CHECK (tier IN ('base','pro','premium'))
stripe_account_id       text                          -- Stripe Connect account ID (acct_...)
stripe_onboarded        boolean DEFAULT false
subscription_id         text                          -- Stripe subscription ID
avg_rating              numeric(3,2) DEFAULT 0
review_count            integer DEFAULT 0
response_rate           numeric(5,2) DEFAULT 0
profile_completeness    integer DEFAULT 0             -- 0-100 score, computed
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
```

#### `categories`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text UNIQUE NOT NULL
slug        text UNIQUE NOT NULL
icon        text                    -- emoji or icon name
description text
sort_order  integer DEFAULT 0
```

**Seed data — all categories at launch:**
- Catering & Food (`catering-food`)
- Photography & Videography (`photography-videography`)
- DJ & Entertainment (`dj-entertainment`)
- Venues (`venues`)
- Decorations & Floral (`decorations-floral`)
- Event Planning & Coordination (`event-planning`)
- Bar & Beverage Service (`bar-beverage`)
- Lighting & AV (`lighting-av`)
- Transportation (`transportation`)
- Photo Booths (`photo-booths`)
- Desserts & Cakes (`desserts-cakes`)
- Security & Staffing (`security-staffing`)

#### `vendor_categories`
```sql
vendor_id       uuid REFERENCES vendors(id) ON DELETE CASCADE
category_id     uuid REFERENCES categories(id) ON DELETE CASCADE
PRIMARY KEY (vendor_id, category_id)
```

#### `event_types`
```sql
id      uuid PRIMARY KEY DEFAULT gen_random_uuid()
name    text UNIQUE NOT NULL
slug    text UNIQUE NOT NULL
```

**Seed data:** Wedding, Birthday, Corporate Event, Baby Shower, Graduation, Quinceañera, Holiday Party, Fundraiser, Networking Event, Other

#### `services`
Vendor's individual service offerings.
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
vendor_id       uuid REFERENCES vendors(id) ON DELETE CASCADE
title           text NOT NULL
description     text
price_type      text CHECK (price_type IN ('flat','hourly','per_person','contact'))
price_amount    numeric(10,2)
duration_hours  numeric(4,1)
min_guests      integer
max_guests      integer
is_active       boolean DEFAULT true
created_at      timestamptz DEFAULT now()
```

#### `portfolio_media`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
vendor_id       uuid REFERENCES vendors(id) ON DELETE CASCADE
cloudinary_id   text NOT NULL
url             text NOT NULL
thumbnail_url   text
media_type      text CHECK (media_type IN ('image','video'))
caption         text
sort_order      integer DEFAULT 0
created_at      timestamptz DEFAULT now()
```

#### `availability`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
vendor_id       uuid REFERENCES vendors(id) ON DELETE CASCADE
date            date NOT NULL
is_available    boolean DEFAULT true
note            text
UNIQUE (vendor_id, date)
```

#### `conversations`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
planner_id      uuid REFERENCES profiles(id)
vendor_id       uuid REFERENCES vendors(id)
status          text DEFAULT 'active' CHECK (status IN ('active','archived','booked'))
last_message_at timestamptz
created_at      timestamptz DEFAULT now()
UNIQUE (planner_id, vendor_id)
```

#### `messages`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE
sender_id       uuid REFERENCES profiles(id)
body            text NOT NULL
read_at         timestamptz
created_at      timestamptz DEFAULT now()
```

#### `quotes`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id     uuid REFERENCES conversations(id)
vendor_id           uuid REFERENCES vendors(id)
planner_id          uuid REFERENCES profiles(id)
service_id          uuid REFERENCES services(id)
event_date          date NOT NULL
event_type          text
guest_count         integer
description         text
amount              numeric(10,2) NOT NULL
platform_fee        numeric(10,2) NOT NULL      -- computed: amount * 0.075
vendor_payout       numeric(10,2) NOT NULL      -- computed: amount - platform_fee - stripe_fee
status              text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired'))
expires_at          timestamptz
created_at          timestamptz DEFAULT now()
```

#### `bookings`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
quote_id            uuid REFERENCES quotes(id)
planner_id          uuid REFERENCES profiles(id)
vendor_id           uuid REFERENCES vendors(id)
event_date          date NOT NULL
amount              numeric(10,2) NOT NULL
platform_fee        numeric(10,2) NOT NULL
vendor_payout       numeric(10,2) NOT NULL
stripe_payment_intent_id  text
stripe_transfer_id  text
payment_status      text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','disputed'))
booking_status      text DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed','completed','cancelled'))
review_requested_at timestamptz
created_at          timestamptz DEFAULT now()
```

#### `reviews`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
booking_id      uuid REFERENCES bookings(id) UNIQUE
vendor_id       uuid REFERENCES vendors(id)
planner_id      uuid REFERENCES profiles(id)
rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5)
body            text
is_published    boolean DEFAULT true
created_at      timestamptz DEFAULT now()
```

#### `vendor_applications`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
profile_id      uuid REFERENCES profiles(id)
business_name   text NOT NULL
category_ids    uuid[]
bio             text
website_url     text
instagram_url   text
years_experience integer
portfolio_urls  text[]
status          text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
admin_notes     text
reviewed_at     timestamptz
reviewed_by     uuid REFERENCES profiles(id)
created_at      timestamptz DEFAULT now()
```

### Row Level Security (RLS) Policies

Enable RLS on all tables. Key policies:

**profiles:** Users can read/update their own profile only.

**vendors:** Public read for approved vendors. Vendor can update own record. Admin can update any.

**conversations:** Planner and vendor in the conversation can read/write. No cross-access.

**messages:** Same as conversations — participants only.

**quotes:** Vendor can create/read quotes in their conversations. Planner can read and update status.

**bookings:** Both planner and vendor can read their own bookings. Admin can read all.

**reviews:** Public read. Planner can create (one per booking). Vendor cannot create or edit.

**vendor_applications:** Applicant can read own application. Admin can read/write all.

---

## 6. API ROUTES (Next.js App Router)

All routes under `src/app/api/`. Use route handlers (`route.ts`).

### Auth
```
POST   /api/auth/register/planner       Create planner profile after Supabase signup
POST   /api/auth/register/vendor-apply  Submit vendor application
```

### Vendors (Public + Authenticated)
```
GET    /api/vendors                     Search vendors — params: category, event_date, budget_min, budget_max, guests, zip, page
GET    /api/vendors/[id]                Single vendor public profile
PUT    /api/vendors/[id]                Vendor updates own profile (authenticated)
DELETE /api/vendors/[id]/media/[mediaId] Delete portfolio media item
```

### Portfolio / Media
```
POST   /api/vendors/[id]/media          Upload to Cloudinary, save record to DB
GET    /api/vendors/[id]/media          List vendor portfolio items
```

### Stripe Connect
```
POST   /api/connect/onboard             Create Stripe Connect account + return AccountLink URL
GET    /api/connect/status              Check if vendor's Connect account is fully onboarded
GET    /api/connect/dashboard-link      Return Stripe Express dashboard login link
```

### Subscriptions (Vendor Tier)
```
POST   /api/subscriptions/checkout      Create Stripe Checkout session for tier upgrade
POST   /api/subscriptions/portal        Return Stripe Billing Portal URL for manage/cancel
GET    /api/subscriptions/status        Current vendor subscription status
```

### Conversations & Messaging
```
GET    /api/conversations               List conversations for current user
POST   /api/conversations               Start new conversation (planner → vendor)
GET    /api/conversations/[id]          Conversation detail + messages
POST   /api/conversations/[id]/messages Send message
PUT    /api/conversations/[id]/read     Mark messages as read
```

### Quotes
```
POST   /api/quotes                      Vendor creates quote in conversation
GET    /api/quotes/[id]                 Quote detail
PUT    /api/quotes/[id]/accept          Planner accepts quote → triggers payment flow
PUT    /api/quotes/[id]/decline         Planner declines quote
```

### Payments
```
POST   /api/payments/create-intent      Create Stripe PaymentIntent with destination charge
GET    /api/payments/[bookingId]        Payment status for booking
POST   /api/payments/webhook            Stripe webhook handler (payment_intent.succeeded, transfer.created, charge.dispute.created)
```

### Bookings
```
GET    /api/bookings                    List bookings for current user
GET    /api/bookings/[id]               Booking detail
PUT    /api/bookings/[id]/complete      Mark booking as completed (post-event)
PUT    /api/bookings/[id]/cancel        Cancel booking (with refund logic)
```

### Reviews
```
POST   /api/reviews                     Planner submits review post-booking
GET    /api/reviews/vendor/[vendorId]   All reviews for a vendor (public)
```

### Admin
```
GET    /api/admin/applications          List pending applications
PUT    /api/admin/applications/[id]/approve
PUT    /api/admin/applications/[id]/reject
GET    /api/admin/vendors               All vendors with filters
PUT    /api/admin/vendors/[id]/suspend
GET    /api/admin/bookings              All platform bookings
GET    /api/admin/users                 All users
```

---

## 7. PAGE & ROUTE STRUCTURE

```
src/app/
├── (public)/
│   ├── page.tsx                        Homepage — hero search, featured vendors, categories
│   ├── vendors/
│   │   ├── page.tsx                    Search results / browse all
│   │   └── [slug]/page.tsx             Vendor profile (SSR + JSON-LD structured data)
│   ├── categories/
│   │   ├── page.tsx                    All categories grid
│   │   └── [slug]/page.tsx             Category browse page
│   ├── how-it-works/page.tsx
│   ├── apply/page.tsx                  Vendor application form
│   ├── login/page.tsx
│   └── register/page.tsx              Planner registration
│
├── (planner)/                          Protected — planner role only
│   ├── dashboard/page.tsx              Planner overview
│   ├── dashboard/search/page.tsx       Event brief builder + advanced search
│   ├── dashboard/messages/
│   │   ├── page.tsx                    Conversations list
│   │   └── [id]/page.tsx              Conversation thread + quote actions
│   ├── dashboard/bookings/
│   │   ├── page.tsx                    Bookings list
│   │   └── [id]/page.tsx              Booking detail + review prompt
│   └── dashboard/profile/page.tsx     Planner profile settings
│
├── (vendor)/                           Protected — vendor role + approved status
│   ├── vendor/dashboard/page.tsx       Vendor overview — inquiry count, earnings summary, upcoming bookings
│   ├── vendor/profile/page.tsx         Edit business profile
│   ├── vendor/portfolio/page.tsx       Manage photos/videos (Cloudinary upload)
│   ├── vendor/services/page.tsx        Manage service listings
│   ├── vendor/messages/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx              Thread + quote builder
│   ├── vendor/quotes/page.tsx          All sent quotes
│   ├── vendor/bookings/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── vendor/earnings/page.tsx        Payout history, Stripe Express dashboard link
│   ├── vendor/settings/page.tsx        Account settings, tier management, billing portal
│   └── vendor/connect/page.tsx         Stripe Connect onboarding flow
│
├── (admin)/                            Protected — admin role only
│   ├── admin/dashboard/page.tsx
│   ├── admin/applications/
│   │   ├── page.tsx                    Application queue
│   │   └── [id]/page.tsx              Application review detail
│   ├── admin/vendors/page.tsx
│   ├── admin/bookings/page.tsx
│   └── admin/users/page.tsx
│
└── api/                                All API route handlers (see Section 6)
```

---

## 8. USER FLOWS

### Planner Flow
1. Lands on homepage → searches by category or event type
2. Browses search results (vendor cards with photo, rating, price range, category)
3. Opens vendor profile → views portfolio, services, reviews
4. Clicks "Send Inquiry" → signs up or logs in as planner if not authenticated
5. Sends first message → conversation created
6. Communicates with vendor in-thread
7. Vendor sends formal quote with service, date, price, terms
8. Planner receives quote in conversation thread
9. Planner clicks "Accept Quote" → redirected to payment (Stripe hosted or embedded)
10. Pays in full → booking confirmed → both parties get confirmation email
11. Event happens
12. Post-event: planner receives review request email → submits review
13. Review published to vendor profile

### Vendor Flow
1. Visits /apply → fills out vendor application (business name, categories, bio, portfolio links, experience)
2. Admin reviews application in admin panel → approves or rejects
3. On approval: vendor receives email with login link and onboarding instructions
4. Vendor logs in → directed to /vendor/connect → completes Stripe Connect Express onboarding
5. Builds profile: bio, photos (Cloudinary), services/pricing, availability
6. Profile goes live at /vendors/[slug]
7. Receives inquiry email notification + in-app notification
8. Opens conversation → responds to planner
9. Creates formal quote from quote builder in conversation thread
10. Planner accepts → payment processes automatically
11. Vendor receives booking confirmation email
12. Delivers service
13. Receives payout from Stripe (minus platform fee) within 2–7 days per Stripe's standard schedule
14. Receives review from planner
15. Can upgrade tier via /vendor/settings → Stripe Checkout

### Admin Flow
1. Logs in at /admin
2. Reviews pending vendor applications in queue
3. Approves or rejects (with optional notes)
4. Approved vendors receive automated onboarding email via Resend
5. Monitors bookings, disputes, platform health via admin dashboard

---

## 9. VENDOR MATCHING & RANKING ALGORITHM

### Search Filters (applied in order)
1. **Category** — required, exact match from `vendor_categories`
2. **Status** — only `approved` vendors
3. **Event date** — exclude vendors with `availability.is_available = false` on that date
4. **Budget** — filter services where `price_amount` falls within planner's range (or `price_type = 'contact'` always included)
5. **Guest count** — filter services where planner's count is within `min_guests` / `max_guests`

### Ranking Score (computed server-side, same for all tiers)
```
score = (avg_rating * 0.35)
      + (profile_completeness * 0.25)
      + (response_rate * 0.25)
      + (recency_weight * 0.15)
```

`recency_weight` = higher score for vendors with reviews or activity in last 90 days.

### Featured Placement
- Pro and Premium vendors are eligible for the "Featured" row at the top of search results
- Featured row shows maximum 4 vendors, randomly rotated per page load from eligible pool
- Featured vendors are labeled with a "Featured" badge
- All vendors below featured row are sorted by the ranking score above regardless of tier

---

## 10. PAYMENT ARCHITECTURE (Stripe Connect Destination Charges)

### Flow
1. Planner accepts quote
2. Front-end calls `POST /api/payments/create-intent` with `quoteId`
3. API creates `PaymentIntent` on WestGate's Stripe account with:
   ```js
   stripe.paymentIntents.create({
     amount: quote.amount * 100,  // in cents
     currency: 'usd',
     transfer_data: {
       destination: vendor.stripe_account_id,
       amount: quote.vendor_payout * 100
     },
     application_fee_amount: quote.platform_fee * 100,
     metadata: { quoteId, bookingId, plannerEmail, vendorId }
   })
   ```
4. Front-end uses Stripe Elements (or Stripe Checkout redirect) to collect payment
5. On `payment_intent.succeeded` webhook → create booking record, update quote status, send confirmation emails
6. On `transfer.created` webhook → update booking with `stripe_transfer_id`
7. On `charge.dispute.created` webhook → alert admin, flag booking

### Stripe Webhook Registration
Register endpoint in Stripe Dashboard → Developers → Webhooks:
- URL: `https://gameplanhtx.com/api/payments/webhook`
- Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`, `charge.dispute.created`, `account.updated` (for Connect onboarding status), `customer.subscription.updated`, `customer.subscription.deleted`

### Stripe Connect Vendor Onboarding
```js
// Create account
const account = await stripe.accounts.create({ type: 'express' })

// Create onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${APP_URL}/vendor/connect?refresh=true`,
  return_url: `${APP_URL}/vendor/dashboard`,
  type: 'account_onboarding'
})

// Redirect vendor to accountLink.url
```

---

## 11. REAL-TIME MESSAGING (Supabase Realtime)

```typescript
// In conversation [id] page component
const supabase = createClientComponentClient()

useEffect(() => {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new])
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [conversationId])
```

RLS ensures users only receive updates for conversations they participate in.

---

## 12. EMAIL NOTIFICATIONS (Resend)

Create email templates for each trigger. Use React Email components for templates.

| Trigger | Recipient | Template |
|---------|-----------|---------|
| Vendor application submitted | Admin | New application alert |
| Vendor application approved | Vendor | Approval + onboarding link |
| Vendor application rejected | Vendor | Rejection + feedback |
| New inquiry received | Vendor | Inquiry notification |
| New message received | Vendor or Planner | Message notification (if not online) |
| Quote received | Planner | Quote received with accept link |
| Booking confirmed | Both | Booking confirmation with details |
| Payment received | Vendor | Payment confirmation + payout info |
| Review request | Planner | Post-event review prompt (send 24hrs after event date) |
| Tier subscription updated | Vendor | Subscription confirmation |

---

## 13. AI SEARCH DISCOVERABILITY

Every vendor profile page (`/vendors/[slug]`) must include:

```typescript
// JSON-LD structured data in page head
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: vendor.business_name,
  description: vendor.bio,
  url: `https://gameplanhtx.com/vendors/${vendor.slug}`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Houston',
    addressRegion: 'TX'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: vendor.avg_rating,
    reviewCount: vendor.review_count
  }
}
```

Vendor URL structure: `/vendors/[category-slug]-houston-[business-slug]`  
Example: `/vendors/photography-videography-houston-west-lens-studio`

All vendor pages are SSR (not static, not client-rendered) so AI search engines and Google crawl full content.

Generate a dynamic sitemap at `/sitemap.xml` covering all approved vendor profiles.

---

## 14. PROJECT FILE STRUCTURE

```
gameplanhtx/
├── src/
│   ├── app/                    Next.js App Router pages + API routes
│   ├── components/
│   │   ├── ui/                 Reusable UI components (Button, Card, Input, Modal, etc.)
│   │   ├── vendor/             Vendor-specific components (VendorCard, ProfileHeader, PortfolioGrid)
│   │   ├── planner/            Planner-specific components
│   │   ├── messaging/          ConversationThread, MessageBubble, QuoteCard
│   │   ├── admin/              AdminApplicationCard, AdminTable
│   │   └── layout/             Navbar, Footer, DashboardNav, Sidebar
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       Browser Supabase client
│   │   │   ├── server.ts       Server Supabase client (for API routes and Server Components)
│   │   │   └── middleware.ts   Auth session refresh middleware
│   │   ├── stripe/
│   │   │   ├── client.ts       Stripe instance
│   │   │   └── webhooks.ts     Webhook handler helpers
│   │   ├── cloudinary/
│   │   │   └── upload.ts       Upload helpers
│   │   ├── resend/
│   │   │   └── emails.ts       Email sending functions
│   │   └── utils/
│   │       ├── ranking.ts      Vendor ranking score calculation
│   │       └── slugify.ts      Slug generation utility
│   ├── types/
│   │   └── index.ts            TypeScript types for all DB tables
│   └── middleware.ts            Route protection (auth + role checks)
├── supabase/
│   ├── migrations/             SQL migration files
│   └── seed.sql                Categories, event types seed data
├── emails/                     React Email templates
├── public/
├── .env.local                  Local environment variables (gitignored)
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 15. BUILD SESSION MAP (Fable Execution Order)

| Session | Zone | Description | Model |
|---------|------|-------------|-------|
| 1 | Foundation | Project scaffold, `package.json`, Tailwind, TypeScript config, folder structure, Supabase client setup | Fable |
| 2 | Database | Full SQL schema, RLS policies, seed data, Supabase migrations | Fable |
| 3 | Auth | Supabase Auth integration, role-based routing, middleware, register/login pages | Fable |
| 4 | Stripe Connect | Vendor onboarding flow, `create-intent` API, webhook handler, Connect status check | Fable |
| 5 | Vendor Profiles | Search API + ranking algorithm, vendor profile page (SSR + JSON-LD), search results page | Fable |
| 6 | Messaging | Conversations, Realtime subscriptions, quote builder, quote accept → payment trigger | Fable |
| 7 | Dashboards | Planner dashboard, vendor dashboard, earnings page, bookings list | Sonnet |
| 8 | Admin Panel | Application queue, approve/reject flow, admin tables | Sonnet |
| 9 | Email | React Email templates, Resend integration, all trigger points | Sonnet |
| 10 | Review & Polish | Code review, RLS audit, SEO/sitemap, mobile responsiveness | Review skill |

---

## 16. KEY DECISIONS SUMMARY (DO NOT DEVIATE)

- **Full payment processing** — not deposit-only. Stripe Connect destination charges only.
- **No GHL in the codebase** — GHL is marketing/CRM layer only, connected via webhooks.
- **Tiers unlock features, not ranking** — algorithm is the same for all vendor tiers.
- **All categories at launch** — no phased category rollout.
- **Messaging stays in-platform** — no external contact info exchange.
- **Vendor vetting is manual** — admin approves/rejects every application.
- **Phase 2 only: job board/reverse marketplace** — planners posting jobs is not in MVP scope.
- **SSR for all vendor profiles** — no client-rendered vendor pages; AI discoverability requires it.
- **Cloudflare DNS only** — orange cloud proxy disabled; Vercel handles SSL/CDN.
