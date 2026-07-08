import { EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface VendorRejectedEmailProps {
  businessName: string
  notes: string | null
}

export default function VendorRejectedEmail({ businessName, notes }: VendorRejectedEmailProps) {
  return (
    <EmailLayout previewText="An update on your Game Plan HTX application">
      <EmailHeading>Your application update</EmailHeading>
      <EmailText>
        Thanks for applying to Game Plan HTX. After review, we&apos;re not able to approve{' '}
        <strong>{businessName}</strong> at this time.
      </EmailText>
      {notes ? <EmailText>{notes}</EmailText> : null}
    </EmailLayout>
  )
}

VendorRejectedEmail.PreviewProps = {
  businessName: 'Bloom & Co Events',
  notes: 'We need a few more portfolio samples before we can approve your listing.',
} satisfies VendorRejectedEmailProps
