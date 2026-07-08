// Shared pill badge for the various status enums across the app
// (bookings, payments, quotes). Colors mirror QuoteCard's STATUS_STYLES
// so the same status always reads the same way platform-wide.
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const FALLBACK_STYLE = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? FALLBACK_STYLE}`}
    >
      {status}
    </span>
  )
}
