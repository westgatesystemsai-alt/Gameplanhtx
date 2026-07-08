import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface QuoteReceivedEmailProps {
  plannerName: string
  vendorBusinessName: string
  amount: string
  eventDate: string
  quoteUrl: string
}

export default function QuoteReceivedEmail({
  plannerName,
  vendorBusinessName,
  amount,
  eventDate,
  quoteUrl,
}: QuoteReceivedEmailProps) {
  return (
    <EmailLayout previewText={`New quote from ${vendorBusinessName}`}>
      <EmailHeading>You&apos;ve got a quote</EmailHeading>
      <EmailText>
        Hi {plannerName}, <strong>{vendorBusinessName}</strong> sent you a quote of{' '}
        <strong>{amount}</strong> for your event on <strong>{eventDate}</strong>.
      </EmailText>
      <EmailButton href={quoteUrl}>Review and accept</EmailButton>
    </EmailLayout>
  )
}

QuoteReceivedEmail.PreviewProps = {
  plannerName: 'Jordan Lee',
  vendorBusinessName: 'Bloom & Co Events',
  amount: '$1,200.00',
  eventDate: 'October 18, 2026',
  quoteUrl: 'https://gameplanhtx.com/dashboard/messages/123',
} satisfies QuoteReceivedEmailProps
