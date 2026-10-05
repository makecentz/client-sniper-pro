/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Confirm your email for ClientHunter AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>🎯 ClientHunter AI</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Welcome aboard!</Heading>
          <Text style={text}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={link}>
              <strong>ClientHunter AI</strong>
            </Link>
            . You're one step away from finding your next clients.
          </Text>
          <Text style={text}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
          <Text style={footer}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#0F172A', fontFamily: "'Inter', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto', padding: '40px 20px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#3B82F6', margin: '0' }
const content = { backgroundColor: '#1E293B', borderRadius: '12px', padding: '32px 28px', border: '1px solid #334155' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#F8FAFC', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#94A3B8', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#3B82F6', textDecoration: 'underline' }
const button = {
  backgroundColor: '#3B82F6',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '20px',
}
const footer = { fontSize: '12px', color: '#64748B', margin: '24px 0 0', borderTop: '1px solid #334155', paddingTop: '16px' }
