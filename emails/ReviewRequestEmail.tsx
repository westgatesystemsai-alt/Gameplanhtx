import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface ReviewRequestEmailProps {
  plannerName: string
  vendorBusinessName: string
  reviewUrl: string
}

export default function ReviewRequestEmail({
  plannerName,
  vendorBusinessName,
  reviewUrl,
}: ReviewRequestEmailProps) {
  return (
    <EmailLayout previewText={`How was your event with ${vendorBusinessName}?`}>
      <EmailHeading>How did it go?</EmailHeading>
      <EmailText>
        Hi {plannerName}, we hope your event with <strong>{vendorBusinessName}</strong> went
        great. Leaving a quick review helps other planners find great vendors on Game Plan HTX.
      </EmailText>
      <EmailButton href={reviewUrl}>Leave a review</EmailButton>
    </EmailLayout>
  )
}

ReviewRequestEmail.PreviewProps = {
  plannerName: 'Jordan Lee',
  vendorBusinessName: 'Bloom & Co Events',
  reviewUrl: 'https://gameplanhtx.com/dashboard/bookings/123',
} satisfies ReviewRequestEmailProps
