/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as payoutApproved } from './payout-approved.tsx'
import { template as payoutPaid } from './payout-paid.tsx'
import { template as newReferralSignup } from './new-referral-signup.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payout-approved': payoutApproved,
  'payout-paid': payoutPaid,
  'new-referral-signup': newReferralSignup,
}
