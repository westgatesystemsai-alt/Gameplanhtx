import 'server-only'
import Stripe from 'stripe'

// Server-side Stripe instance. STRIPE_SECRET_KEY is a test-mode key
// (sk_test_) for now — never expose it to the client bundle.
let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set.')
    }
    stripe = new Stripe(key)
  }
  return stripe
}
