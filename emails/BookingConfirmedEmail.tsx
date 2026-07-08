import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface BookingConfirmedEmailProps {
  recipientRole: 'planner' | 'vendor'
  otherPartyName: string
  eventDate: string
  amount: string
  bookingId: string
  dashboardUrl: string
}

export default function BookingConfirmedEmail({
  recipientRole,
  otherPartyName,
  eventDate,
  amount,
  bookingId,
  dashboardUrl,
}: BookingConfirmedEmailProps) {
  return (
    <EmailLayout previewText="Booking confirmed — Game Plan HTX">
      <EmailHeading>Booking confirmed</EmailHeading>
      {recipientRole === 'planner' ? (
        <EmailText>
          Your payment of <strong>{amount}</strong> was received and your booking with{' '}
          <strong>{otherPartyName}</strong> for <strong>{eventDate}</strong> is confirmed.
        </EmailText>
      ) : (
        <EmailText>
          You have a new confirmed booking with <strong>{otherPartyName}</strong> for{' '}
          <strong>{eventDate}</strong>. Your payout of <strong>{amount}</strong> will be
          transferred to your Stripe account.
        </EmailText>
      )}
      <EmailText>Booking ID: {bookingId}</EmailText>
      <EmailButton href={dashboardUrl}>View booking</EmailButton>
    </EmailLayout>
  )
}

BookingConfirmedEmail.PreviewProps = {
  recipientRole: 'planner',
  otherPartyName: 'Bloom & Co Events',
  eventDate: 'October 18, 2026',
  amount: '$1,200.00',
  bookingId: 'bk_123',
  dashboardUrl: 'https://gameplanhtx.com/dashboard/bookings/123',
} satisfies BookingConfirmedEmailProps
