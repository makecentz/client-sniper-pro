import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  subject?: string
  message?: string
  submittedAt?: string
}

const Email = ({ name, email, subject, message, submittedAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form submission from {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Contact Submission</Heading>
        <Text style={muted}>A visitor sent a message from the ClientHunter AI website.</Text>

        <Section style={card}>
          <Text style={label}>From</Text>
          <Text style={value}>{name} &lt;{email}&gt;</Text>

          <Text style={label}>Subject</Text>
          <Text style={value}>{subject || '(no subject)'}</Text>

          <Text style={label}>Submitted</Text>
          <Text style={value}>{submittedAt}</Text>

          <Hr style={hr} />

          <Text style={label}>Message</Text>
          <Text style={{ ...value, whiteSpace: 'pre-wrap' }}>{message}</Text>
        </Section>

        <Text style={muted}>Reply directly to {email} to respond.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New contact form submission from ${data?.name ?? 'website visitor'}`,
  displayName: 'Contact Notification (Admin)',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Question about Pro plan',
    message: 'Hi — do you offer annual billing?',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#0f172a' }
const container = { padding: '24px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 8px', color: '#0f172a' }
const muted = { fontSize: '13px', color: '#475569', margin: '0 0 16px' }
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '18px 20px',
  background: '#f8fafc',
}
const label = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#64748b', margin: '10px 0 2px' }
const value = { fontSize: '15px', color: '#0f172a', margin: '0 0 6px', lineHeight: '1.5' }
const hr = { borderColor: '#e2e8f0', margin: '14px 0' }
