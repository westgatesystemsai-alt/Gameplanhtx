import { getResponseTimeTier } from '@/lib/vendors/responseTime'

export default function ResponseTimeBadge({
  responseRate,
  className = '',
}: {
  responseRate: number | null | undefined
  className?: string
}) {
  const tier = getResponseTimeTier(responseRate)
  if (!tier) return null

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-outfit text-xs font-semibold ${className}`}
      style={{ backgroundColor: tier.background, color: tier.color }}
    >
      {tier.label}
    </span>
  )
}
