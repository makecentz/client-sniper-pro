
## Plan: Add Legal Pages and Footer Links

### Overview
Add Terms of Service, Privacy Policy, and Customer Support pages with standard legal verbage, and update the footer to include navigation links to these pages.

### Contact Information to Use
- **Address:** 5429 Baltimore Ave, Philadelphia PA 19143
- **Email:** ecomexpertsllc@gmail.com
- **Phone:** (267) 652-1512

### Implementation Steps

1. **Create Terms of Service Page** (`src/pages/TermsOfService.tsx`)
   - Standard SaaS terms covering: acceptance of terms, service description, user accounts, acceptable use, intellectual property, limitation of liability, termination, governing law, and contact information

2. **Create Privacy Policy Page** (`src/pages/PrivacyPolicy.tsx`)
   - Standard privacy policy covering: information collection, use of data, data sharing, cookies, data security, user rights, third-party services, and contact information

3. **Create Customer Support Page** (`src/pages/CustomerSupport.tsx`)
   - Support page with: contact methods (email, phone, address), FAQ section, response time expectations, and support hours

4. **Add Routes** (`src/App.tsx`)
   - Add routes for `/terms`, `/privacy`, and `/support`

5. **Update Footer** (`src/pages/Landing.tsx`)
   - Replace simple copyright footer with a proper footer containing:
     - Logo
     - Navigation links (Terms, Privacy, Support)
     - Contact information (address, email, phone)
     - Copyright notice

### Technical Details
- Use existing shadcn/ui components (Card, Button, Separator)
- Match existing dark theme styling
- Ensure responsive layout
- Use React Router Link components for navigation
