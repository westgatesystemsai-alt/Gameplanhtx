import 'server-only'
import { createElement } from 'react'
import { render } from '@react-email/components'
import { sendEmail } from './client'
import type { VendorTier } from '@/types'
import AdminNewApplicationEmail from '@emails/AdminNewApplicationEmail'
import VendorApprovedEmail from '@emails/VendorApprovedEmail'
import VendorRejectedEmail from '@emails/VendorRejectedEmail'
import NewInquiryEmail from '@emails/NewInquiryEmail'
import NewMessageEmail from '@emails/NewMessageEmail'
import QuoteReceivedEmail from '@emails/QuoteReceivedEmail'
import BookingConfirmedEmail from '@emails/BookingConfirmedEmail'
import PaymentReceivedEmail from '@emails/PaymentReceivedEmail'
import ReviewRequestEmail from '@emails/ReviewRequestEmail'
import TierSubscriptionUpdatedEmail from '@emails/TierSubscriptionUpdatedEmail'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gameplanhtx.com'

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { dateStyle: 'long' })

// Vendor application submitted → Admin
export async function sendNewApplicationAdminAlert(params: {
  to: string
  applicationId: string
  businessName: string
  applicantEmail: string
  yearsExperience?: number | null
}): Promise<void> {
  const html = await render(
    createElement(AdminNewApplicationEmail, {
      businessName: params.businessName,
      applicantEmail: params.applicantEmail,
      yearsExperience: params.yearsExperience ?? null,
      reviewUrl: `${APP_URL}/admin/applications/${params.applicationId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: `New vendor application: ${params.businessName}`,
    html,
  })
}

// Vendor application approved → Vendor
export async function sendVendorApprovedEmail(params: {
  to: string
  businessName: string
}): Promise<void> {
  const html = await render(
    createElement(VendorApprovedEmail, {
      businessName: params.businessName,
      onboardingUrl: `${APP_URL}/vendor/connect`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: "You're approved! Welcome to Game Plan HTX",
    html,
  })
}

// Vendor application rejected → Vendor
export async function sendVendorRejectedEmail(params: {
  to: string
  businessName: string
  notes?: string | null
}): Promise<void> {
  const html = await render(
    createElement(VendorRejectedEmail, {
      businessName: params.businessName,
      notes: params.notes ?? null,
    })
  )
  await sendEmail({
    to: params.to,
    subject: 'Your Game Plan HTX application',
    html,
  })
}

// New inquiry received → Vendor
export async function sendNewInquiryEmail(params: {
  to: string
  vendorBusinessName: string
  plannerName: string
  messagePreview: string
  conversationId: string
}): Promise<void> {
  const html = await render(
    createElement(NewInquiryEmail, {
      vendorBusinessName: params.vendorBusinessName,
      plannerName: params.plannerName,
      messagePreview: params.messagePreview,
      conversationUrl: `${APP_URL}/vendor/messages/${params.conversationId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: `New inquiry from ${params.plannerName}`,
    html,
  })
}

// New message received → Vendor or Planner
export async function sendNewMessageEmail(params: {
  to: string
  recipientName: string
  recipientRole: 'planner' | 'vendor'
  senderName: string
  messageBody: string
  conversationId: string
}): Promise<void> {
  const conversationUrl =
    params.recipientRole === 'vendor'
      ? `${APP_URL}/vendor/messages/${params.conversationId}`
      : `${APP_URL}/dashboard/messages/${params.conversationId}`
  const html = await render(
    createElement(NewMessageEmail, {
      recipientName: params.recipientName,
      senderName: params.senderName,
      messageBody: params.messageBody,
      conversationUrl,
    })
  )
  await sendEmail({
    to: params.to,
    subject: `New message from ${params.senderName}`,
    html,
  })
}

// Quote received → Planner
export async function sendQuoteReceivedEmail(params: {
  to: string
  plannerName: string
  vendorBusinessName: string
  amount: number
  eventDate: string
  conversationId: string
}): Promise<void> {
  const html = await render(
    createElement(QuoteReceivedEmail, {
      plannerName: params.plannerName,
      vendorBusinessName: params.vendorBusinessName,
      amount: formatCurrency(params.amount),
      eventDate: formatDate(params.eventDate),
      quoteUrl: `${APP_URL}/dashboard/messages/${params.conversationId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: `New quote from ${params.vendorBusinessName}`,
    html,
  })
}

// Booking confirmed → Planner
export async function sendBookingConfirmedPlannerEmail(params: {
  to: string
  vendorBusinessName: string
  eventDate: string
  amount: number
  bookingId: string
}): Promise<void> {
  const html = await render(
    createElement(BookingConfirmedEmail, {
      recipientRole: 'planner',
      otherPartyName: params.vendorBusinessName,
      eventDate: formatDate(params.eventDate),
      amount: formatCurrency(params.amount),
      bookingId: params.bookingId,
      dashboardUrl: `${APP_URL}/dashboard/bookings/${params.bookingId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: 'Booking confirmed — Game Plan HTX',
    html,
  })
}

// Booking confirmed → Vendor
export async function sendBookingConfirmedVendorEmail(params: {
  to: string
  plannerName: string
  eventDate: string
  payout: number
  bookingId: string
}): Promise<void> {
  const html = await render(
    createElement(BookingConfirmedEmail, {
      recipientRole: 'vendor',
      otherPartyName: params.plannerName,
      eventDate: formatDate(params.eventDate),
      amount: formatCurrency(params.payout),
      bookingId: params.bookingId,
      dashboardUrl: `${APP_URL}/vendor/bookings/${params.bookingId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: 'New booking — Game Plan HTX',
    html,
  })
}

// Payment received → Vendor
export async function sendPaymentReceivedEmail(params: {
  to: string
  amount: number
  payout: number
  eventDate: string
}): Promise<void> {
  const html = await render(
    createElement(PaymentReceivedEmail, {
      amount: formatCurrency(params.amount),
      payout: formatCurrency(params.payout),
      eventDate: formatDate(params.eventDate),
      earningsUrl: `${APP_URL}/vendor/earnings`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: 'Payment received — Game Plan HTX',
    html,
  })
}

// Review request → Planner (sent 24hrs after the event date)
export async function sendReviewRequestEmail(params: {
  to: string
  plannerName: string
  vendorBusinessName: string
  bookingId: string
}): Promise<void> {
  const html = await render(
    createElement(ReviewRequestEmail, {
      plannerName: params.plannerName,
      vendorBusinessName: params.vendorBusinessName,
      reviewUrl: `${APP_URL}/dashboard/bookings/${params.bookingId}`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: `How was your event with ${params.vendorBusinessName}?`,
    html,
  })
}

// Tier subscription updated → Vendor
export async function sendTierSubscriptionUpdatedEmail(params: {
  to: string
  businessName: string
  tier: VendorTier
}): Promise<void> {
  const html = await render(
    createElement(TierSubscriptionUpdatedEmail, {
      businessName: params.businessName,
      tier: params.tier,
      settingsUrl: `${APP_URL}/vendor/settings`,
    })
  )
  await sendEmail({
    to: params.to,
    subject: 'Your subscription has been updated',
    html,
  })
}
