/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Your verification code for ClientHunter AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>🎯 ClientHunter AI</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirm your identity</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code will expire shortly. If you didn't request this, you can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#0F172A', fontFamily: "'Inter', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto', padding: '40px 20px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#3B82F6', margin: '0' }
const content = { backgroundColor: '#1E293B', borderRadius: '12px', padding: '32px 28px', border: '1px solid #334155' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#F8FAFC', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#94A3B8', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#3B82F6',
  backgroundColor: '#0F172A',
  borderRadius: '8px',
  padding: '16px 24px',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#64748B', margin: '24px 0 0', borderTop: '1px solid #334155', paddingTop: '16px' }
