import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ClientHunter AI'

interface Props {
  name?: string
  amount?: number | string
}

const PayoutApprovedEmail = ({ name, amount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your affiliate payout has been approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payout approved 🎉</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi,'}
        </Text>
        <Text style={text}>
          Good news — your affiliate payout request{amount ? ` of $${Number(amount).toFixed(2)}` : ''} has been approved by the {SITE_NAME} team and is queued for processing.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Status</Text>
          <Text style={cardValue}>Approved · awaiting payment</Text>
        </Section>
        <Text style={text}>We'll send a follow-up email as soon as the payment is sent out.</Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PayoutApprovedEmail,
  subject: 'Your affiliate payout has been approved',
  displayName: 'Payout approved',
  previewData: { name: 'Jane', amount: 125.50 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, color: '#64748B', margin: '0 0 4px', letterSpacing: '0.5px' }
const cardValue = { fontSize: '15px', fontWeight: 'bold', color: '#3B82F6', margin: 0 }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '24px 0 0' }
