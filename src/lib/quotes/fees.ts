// Platform fee math shared by the quotes API and the vendor-facing
// QuoteBuilder preview. Computed in cents so it always reconciles with
// the guardrails in /api/payments/create-intent.
export const PLATFORM_FEE_PERCENT = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? '7.5'
)

export function computeQuoteSplit(amount: number) {
  const amountCents = Math.round(amount * 100)
  const feeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
  return {
    platform_fee: feeCents / 100,
    vendor_payout: (amountCents - feeCents) / 100,
  }
}
