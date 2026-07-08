import { Body, Button, Container, Head, Hr, Html, Preview, Text } from '@react-email/components'
import type { ReactNode } from 'react'

export const BRAND_NAME = 'Game Plan HTX'
const ACCENT = '#4F46E5'

const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily: 'Arial, Helvetica, sans-serif',
    margin: 0,
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: '0 auto',
    maxWidth: 480,
    padding: '32px 40px',
  },
  brand: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 24px',
  },
  heading: {
    color: '#111827',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 16px',
  },
  text: {
    color: '#374151',
    fontSize: 15,
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '32px 0 16px',
  },
  footer: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: '18px',
    margin: 0,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 24px',
    textDecoration: 'none',
  },
} as const

export function EmailLayout({
  previewText,
  children,
}: {
  previewText: string
  children: ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{BRAND_NAME}</Text>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            {BRAND_NAME} · Houston, TX
            <br />
            You&apos;re receiving this email because of activity on your {BRAND_NAME} account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>
}

export function EmailText({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button href={href} style={styles.button}>
      {children}
    </Button>
  )
}
