import type { VerifiedItems } from '@/types'

// Labeled in the order shown to admins and on the public "What does
// this mean?" breakdown.
export const VERIFIED_ITEMS: { key: keyof VerifiedItems; label: string }[] = [
  { key: 'insurance', label: 'Proof of Insurance' },
  { key: 'license', label: 'Business License' },
  { key: 'portfolio', label: 'Portfolio Review' },
  { key: 'standards', label: 'Standards Agreement Signed' },
]

// A vendor is Gameplan Verified only once every checklist item is true.
export function isVendorVerified(items: VerifiedItems | null | undefined): boolean {
  if (!items) return false
  return VERIFIED_ITEMS.every(({ key }) => items[key] === true)
}
