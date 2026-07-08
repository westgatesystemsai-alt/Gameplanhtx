import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface PaymentReceivedEmailProps {
  amount: string
  payout: string
  eventDate: string
  earningsUrl: string
}

export default function PaymentReceivedEmail({
  amount,
  payout,
  eventDate,
  earningsUrl,
}: PaymentReceivedEmailProps) {
  return (
    <EmailLayout previewText="Payment received — Game Plan HTX">
      <EmailHeading>Payment received</EmailHeading>
      <EmailText>
        A planner&apos;s payment of <strong>{amount}</strong> for your event on{' '}
        <strong>{eventDate}</strong> has been received. Your payout of{' '}
        <strong>{payout}</strong> is on its way to your Stripe account.
      </EmailText>
      <EmailButton href={earningsUrl}>View earnings</EmailButton>
    </EmailLayout>
  )
}

PaymentReceivedEmail.PreviewProps = {
  amount: '$1,200.00',
  payout: '$1,110.00',
  eventDate: 'October 18, 2026',
  earningsUrl: 'https://gameplanhtx.com/vendor/earnings',
} satisfies PaymentReceivedEmailProps
