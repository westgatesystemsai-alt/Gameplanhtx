// Event Intake Wizard (/plan) — shared, framework-agnostic constants and
// helpers used by both the client wizard and the server-rendered shortlist.
//
// NOTE ON CATEGORIES: The build brief lists an idealized set of category
// labels (e.g. "Officiant", "Videography") that do not map 1:1 to the real
// categories seeded in supabase/seed.sql. The wizard chips are driven off the
// actual DB categories so that the shortlist and "See all …" links resolve to
// real vendors. The occasion→category pre-check mapping below is expressed in
// terms of real DB slugs, preserving the brief's intent.

export interface WizardOccasion {
  slug: string
  label: string
  emoji: string
}

export const OCCASIONS: WizardOccasion[] = [
  { slug: 'wedding', label: 'Wedding', emoji: '💍' },
  { slug: 'corporate', label: 'Corporate', emoji: '🏢' },
  { slug: 'quinceanera', label: 'Quinceañera', emoji: '👑' },
  { slug: 'birthday', label: 'Birthday', emoji: '🎂' },
  { slug: 'social', label: 'Social/Party', emoji: '🎉' },
  { slug: 'kids', label: 'Kids Event', emoji: '🧸' },
  { slug: 'other', label: 'Other', emoji: '✨' },
]

// Houston-area service regions. There is no service-area/neighborhood column
// on the vendors table (only city + zip_code), so area is captured for
// shareability and display but is not used as a hard DB filter — filtering by
// it would exclude every vendor. See assumptions note in the results page.
export const AREAS: string[] = [
  'Inner Loop',
  'Midtown',
  'The Heights',
  'Galleria',
  'Sugar Land',
  'Katy',
  'The Woodlands',
  'Pearland',
  'Other',
]

export interface WizardSize {
  key: string
  label: string
}

export const SIZES: WizardSize[] = [
  { key: 'under-25', label: 'Under 25' },
  { key: '25-75', label: '25–75' },
  { key: '75-150', label: '75–150' },
  { key: '150-300', label: '150–300' },
  { key: '300-plus', label: '300+' },
]

export interface WizardBudget {
  key: string
  label: string
  min?: number
  max?: number
}

export const BUDGETS: WizardBudget[] = [
  { key: 'under-1000', label: 'Under $1,000', max: 1000 },
  { key: '1000-2500', label: '$1,000–$2,500', min: 1000, max: 2500 },
  { key: '2500-5000', label: '$2,500–$5,000', min: 2500, max: 5000 },
  { key: '5000-10000', label: '$5,000–$10,000', min: 5000, max: 10000 },
  { key: '10000-plus', label: '$10,000+', min: 10000 },
]

// Occasion → pre-checked category slugs (real DB slugs from seed.sql).
// Occasions not listed here pre-check nothing (Quinceañera, Kids Event, Other).
export const OCCASION_CATEGORY_PRECHECK: Record<string, string[]> = {
  wedding: [
    'venues',
    'catering-food',
    'photography-videography',
    'dj-entertainment',
    'decorations-floral',
    'event-planning',
  ],
  corporate: ['venues', 'catering-food', 'lighting-av', 'dj-entertainment'],
  birthday: ['venues', 'catering-food', 'dj-entertainment', 'photography-videography'],
  social: ['venues', 'catering-food', 'dj-entertainment', 'photography-videography'],
}

export const TOTAL_STEPS = 5

export function budgetByKey(key: string | null | undefined): WizardBudget | undefined {
  if (!key) return undefined
  return BUDGETS.find((b) => b.key === key)
}

// Parse the `cats` URL param into a slug list. Returns null when the param is
// absent so callers can fall back to the occasion pre-check; an explicit empty
// string means the planner deliberately cleared every category.
export function parseCats(raw: string | null | undefined): string[] | null {
  if (raw == null) return null
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// The effective selected categories for a given wizard state: the planner's
// explicit selection when present, otherwise the occasion pre-check defaults.
export function effectiveCats(
  catsParam: string | null | undefined,
  occasion: string | null | undefined
): string[] {
  const parsed = parseCats(catsParam)
  if (parsed != null) return parsed
  return occasion ? (OCCASION_CATEGORY_PRECHECK[occasion] ?? []) : []
}
