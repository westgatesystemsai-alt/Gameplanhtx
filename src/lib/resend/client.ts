import 'server-only'
import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Game Plan HTX <onboarding@resend.dev>'

// Best-effort transactional email. Payment webhooks must never fail
// because email delivery failed, so errors are logged and swallowed.
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email:', opts.subject)
    return
  }
  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({ from: FROM, ...opts })
    if (error) console.error('Resend error:', error)
  } catch (err) {
    console.error('sendEmail failed:', err)
  }
}
