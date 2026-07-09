export default function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-verified px-2 py-0.5 font-outfit text-[9px] font-extrabold uppercase tracking-wide text-white ${className}`}
    >
      ✓ VERIFIED
    </span>
  )
}
