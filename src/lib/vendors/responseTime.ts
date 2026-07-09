export interface ResponseTimeTier {
  label: string
  background: string
  color: string
}

// response_rate is the vendor's average first-reply time in hours,
// computed by the compute-vendor-response-rate Edge Function. Null
// means no reply data yet (or nothing in the 90-day window) — no badge.
export function getResponseTimeTier(
  responseRate: number | null | undefined
): ResponseTimeTier | null {
  if (responseRate == null) return null
  if (responseRate <= 2) return { label: '⚡ < 2 hrs', background: '#1A7F5A', color: '#FFFFFF' }
  if (responseRate <= 24) return { label: '⚡ < 24 hrs', background: '#F0B429', color: '#1A1A1A' }
  return null
}
