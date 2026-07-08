import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface VendorApprovedEmailProps {
  businessName: string
  onboardingUrl: string
}

export default function VendorApprovedEmail({
  businessName,
  onboardingUrl,
}: VendorApprovedEmailProps) {
  return (
    <EmailLayout previewText="You're approved! Welcome to Game Plan HTX">
      <EmailHeading>You&apos;re approved!</EmailHeading>
      <EmailText>
        Congratulations — <strong>{businessName}</strong> has been approved on Game Plan HTX.
        Complete your Stripe Connect onboarding to start accepting bookings and get paid.
      </EmailText>
      <EmailButton href={onboardingUrl}>Complete onboarding</EmailButton>
    </EmailLayout>
  )
}

VendorApprovedEmail.PreviewProps = {
  businessName: 'Bloom & Co Events',
  onboardingUrl: 'https://gameplanhtx.com/vendor/connect',
} satisfies VendorApprovedEmailProps
