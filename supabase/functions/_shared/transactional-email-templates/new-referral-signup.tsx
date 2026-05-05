import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ClientHunter AI'

interface Props {
  name?: string
  dashboardUrl?: string
}

const NewReferralSignupEmail = ({ name, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Someone just signed up using your referral link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New referral signup 🚀</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>
          Great news — a new user just signed up to {SITE_NAME} using your referral link. You'll earn a commission as soon as they upgrade to Pro.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Status</Text>
          <Text style={cardValue}>Referral tracked · awaiting Pro upgrade</Text>
        </Section>
        {dashboardUrl ? (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={dashboardUrl} style={button}>View your affiliate dashboard</Button>
          </Section>
        ) : null}
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewReferralSignupEmail,
  subject: 'New signup from your referral link 🚀',
  displayName: 'New referral signup',
  previewData: { name: 'Jane', dashboardUrl: 'https://clienthunterai.com/dashboard/affiliate' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, color: '#64748B', margin: '0 0 4px', letterSpacing: '0.5px' }
const cardValue = { fontSize: '15px', fontWeight: 'bold', color: '#3B82F6', margin: 0 }
const button = { backgroundColor: '#3B82F6', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '24px 0 0' }
