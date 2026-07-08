import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface TierSubscriptionUpdatedEmailProps {
  businessName: string
  tier: 'base' | 'pro' | 'premium'
  settingsUrl: string
}

const TIER_LABEL: Record<TierSubscriptionUpdatedEmailProps['tier'], string> = {
  base: 'Base',
  pro: 'Pro',
  premium: 'Premium',
}

export default function TierSubscriptionUpdatedEmail({
  businessName,
  tier,
  settingsUrl,
}: TierSubscriptionUpdatedEmailProps) {
  return (
    <EmailLayout previewText="Your subscription has been updated">
      <EmailHeading>Subscription updated</EmailHeading>
      <EmailText>
        Hi {businessName}, your Game Plan HTX subscription is now on the{' '}
        <strong>{TIER_LABEL[tier]}</strong> plan.
      </EmailText>
      <EmailButton href={settingsUrl}>Manage subscription</EmailButton>
    </EmailLayout>
  )
}

TierSubscriptionUpdatedEmail.PreviewProps = {
  businessName: 'Bloom & Co Events',
  tier: 'pro',
  settingsUrl: 'https://gameplanhtx.com/vendor/settings',
} satisfies TierSubscriptionUpdatedEmailProps
