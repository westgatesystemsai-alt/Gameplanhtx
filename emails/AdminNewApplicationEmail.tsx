import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface AdminNewApplicationEmailProps {
  businessName: string
  applicantEmail: string
  yearsExperience: number | null
  reviewUrl: string
}

export default function AdminNewApplicationEmail({
  businessName,
  applicantEmail,
  yearsExperience,
  reviewUrl,
}: AdminNewApplicationEmailProps) {
  return (
    <EmailLayout previewText={`New vendor application: ${businessName}`}>
      <EmailHeading>New vendor application</EmailHeading>
      <EmailText>
        <strong>{businessName}</strong> ({applicantEmail}) just applied to join Game Plan HTX
        {yearsExperience != null ? ` with ${yearsExperience} years of experience` : ''}.
      </EmailText>
      <EmailButton href={reviewUrl}>Review application</EmailButton>
    </EmailLayout>
  )
}

AdminNewApplicationEmail.PreviewProps = {
  businessName: 'Bloom & Co Events',
  applicantEmail: 'owner@bloomandco.example',
  yearsExperience: 5,
  reviewUrl: 'https://gameplanhtx.com/admin/applications/123',
} satisfies AdminNewApplicationEmailProps
