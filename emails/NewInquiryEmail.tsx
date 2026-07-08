import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface NewInquiryEmailProps {
  vendorBusinessName: string
  plannerName: string
  messagePreview: string
  conversationUrl: string
}

export default function NewInquiryEmail({
  vendorBusinessName,
  plannerName,
  messagePreview,
  conversationUrl,
}: NewInquiryEmailProps) {
  return (
    <EmailLayout previewText={`New inquiry from ${plannerName}`}>
      <EmailHeading>New inquiry</EmailHeading>
      <EmailText>
        Hi {vendorBusinessName}, <strong>{plannerName}</strong> just reached out about your
        services on Game Plan HTX:
      </EmailText>
      <EmailText>&ldquo;{messagePreview}&rdquo;</EmailText>
      <EmailButton href={conversationUrl}>Reply now</EmailButton>
    </EmailLayout>
  )
}

NewInquiryEmail.PreviewProps = {
  vendorBusinessName: 'Bloom & Co Events',
  plannerName: 'Jordan Lee',
  messagePreview: "Hi! We're looking for florals for a 150-guest wedding in October.",
  conversationUrl: 'https://gameplanhtx.com/vendor/messages/123',
} satisfies NewInquiryEmailProps
