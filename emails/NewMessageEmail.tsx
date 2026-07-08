import { EmailButton, EmailHeading, EmailLayout, EmailText } from './components/shared'

export interface NewMessageEmailProps {
  recipientName: string
  senderName: string
  messageBody: string
  conversationUrl: string
}

export default function NewMessageEmail({
  recipientName,
  senderName,
  messageBody,
  conversationUrl,
}: NewMessageEmailProps) {
  return (
    <EmailLayout previewText={`New message from ${senderName}`}>
      <EmailHeading>New message</EmailHeading>
      <EmailText>
        Hi {recipientName}, <strong>{senderName}</strong> sent you a message on Game Plan HTX:
      </EmailText>
      <EmailText>&ldquo;{messageBody}&rdquo;</EmailText>
      <EmailButton href={conversationUrl}>View conversation</EmailButton>
    </EmailLayout>
  )
}

NewMessageEmail.PreviewProps = {
  recipientName: 'Bloom & Co Events',
  senderName: 'Jordan Lee',
  messageBody: 'Does that package include setup and teardown?',
  conversationUrl: 'https://gameplanhtx.com/vendor/messages/123',
} satisfies NewMessageEmailProps
