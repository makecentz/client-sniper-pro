import * as React from 'npm:react@18.3.1'
import { Section, Text, Link } from 'npm:@react-email/components@0.0.22'

export const BrandHeader = () => (
  <Section style={header}>
    <Text style={logo}>
      <span style={{ color: '#ffffff' }}>Client</span>
      <span style={{ color: '#3B82F6' }}>Hunter</span>
      <span style={{ color: '#ffffff' }}> AI</span>
    </Text>
    <Text style={tagline}>Find clients. Close deals.</Text>
  </Section>
)

export const BrandFooter = () => (
  <Section style={footer}>
    <Text style={footerText}>
      ClientHunter AI ·{' '}
      <Link href="https://clienthunterai.com" style={footerLink}>clienthunterai.com</Link>
    </Text>
    <Text style={footerText}>
      <Link href="mailto:clienthunterainow@gmail.com" style={footerLink}>clienthunterainow@gmail.com</Link>
      {' '}· (445) 326-9638
    </Text>
  </Section>
)

const header = {
  backgroundColor: '#0B1220',
  borderRadius: '10px 10px 0 0',
  borderBottom: '3px solid #3B82F6',
  padding: '20px 24px',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const logo = { fontSize: '24px', fontWeight: 800, margin: 0, fontFamily: 'Arial, sans-serif', letterSpacing: '-0.02em' }
const tagline = { fontSize: '12px', color: '#94A3B8', margin: '4px 0 0' }
const footer = { borderTop: '1px solid #e2e8f0', marginTop: '28px', paddingTop: '16px', textAlign: 'center' as const }
const footerText = { fontSize: '12px', color: '#64748b', margin: '2px 0' }
const footerLink = { color: '#3B82F6', textDecoration: 'none' }
