# Aldwych European Capital - Mobile App Design

## Brand Identity

- **App Name**: Aldwych European Capital
- **Primary Color**: Deep Navy Blue `#001A3D`
- **Secondary Color**: Gold/Champagne `#C9A962`
- **Accent Color**: Royal Blue `#0058D4`
- **Surface Dark**: `#0D1B2A`
- **Surface Light**: `#F8F9FA`
- **Success**: `#22C55E`
- **Error**: `#EF4444`
- **Warning**: `#F59E0B`
- **Text Primary (Dark)**: `#FFFFFF`
- **Text Primary (Light)**: `#0A0F1A`
- **Text Muted**: `#6B7280`

## Design Philosophy

Enterprise-grade banking experience inspired by Scotiabank, BMO, and Goldman Sachs mobile apps. Clean, premium, trustworthy. Dark mode by default with light mode support. Emphasis on data density without clutter. Gold accents for premium feel.

## Screen List

### Authentication
1. **Splash Screen** - Logo animation, brand identity
2. **Sign In** - Email/password, biometric option
3. **Sign Up** - Multi-step registration form
4. **Forgot Password** - Email verification flow

### Main Tabs (Bottom Navigation)
1. **Home (Dashboard)** - Account overview, quick actions, recent transactions
2. **Accounts** - All accounts list with balances, account details
3. **Transfers** - Internal, wire, international, scheduled transfers
4. **Cards** - Debit/credit card management, virtual cards
5. **More** - Profile, settings, security, support, investments, loans

### Secondary Screens
6. **Transaction History** - Full transaction list with filters and search
7. **Transaction Detail** - Individual transaction receipt/detail
8. **Send Money** - Recipient selection, amount, confirmation
9. **Pay Bills** - Bill payment management
10. **Deposit** - Fund deposit flow
11. **Investments** - Portfolio, trading, watchlist, research
12. **Loans** - Loan overview, applications, tracking
13. **Profile** - User information, KYC status
14. **Settings** - Preferences, notifications, language
15. **Security** - Password change, 2FA, biometrics, device management
16. **Support** - Chat, FAQ, contact
17. **Reports** - Analytics, statements, downloads
18. **Notifications** - Activity feed

## Primary Content and Functionality

### Home Screen (Dashboard)
- Greeting with time-of-day context
- Total cash balance (large, prominent)
- Investment balance summary
- Mini area chart showing 30-day trend
- Quick action buttons: Transfer, Pay Bills, Deposit, Reports
- Recent transactions (last 5-8)
- Account status banner (if restrictions apply)

### Accounts Screen
- Card-style account tiles (Checking, Savings, Investment)
- Each card shows: account name, masked number, balance, mini sparkline
- Tap to expand: full details, recent activity, account actions
- Pull-to-refresh

### Transfers Screen
- Transfer type selector: Internal, Wire, International, Scheduled
- Recent recipients (horizontal scroll)
- Transfer form: From account, To account/recipient, Amount, Note
- Confirmation sheet with summary
- Success/failure state with reference number

### Cards Screen
- Physical card visualization (3D tilt effect)
- Card details: number (masked), expiry, CVV (tap to reveal)
- Card controls: freeze, set limits, PIN change
- Virtual card generation
- Recent card transactions

### More Screen
- Grid/list of additional features
- Profile section at top with avatar and name
- Investments, Loans, Bills, Reports
- Settings, Security, Support
- Sign Out

## Key User Flows

### Quick Transfer Flow
1. User taps "Transfer" on Dashboard → Transfer screen
2. Selects "Internal Transfer"
3. Picks source account (dropdown)
4. Picks destination account or enters recipient
5. Enters amount
6. Reviews summary in bottom sheet
7. Confirms with biometric/PIN
8. Success screen with reference number

### View Account Details Flow
1. User taps account card on Accounts tab
2. Expands to full account detail view
3. Shows balance, available balance, account number
4. Recent transactions for that account
5. Action buttons: Transfer, Statement, Details

### Card Management Flow
1. User navigates to Cards tab
2. Swipes between cards (horizontal pager)
3. Taps "Manage Card" → Card settings sheet
4. Can freeze/unfreeze, change limits, view PIN
5. Tap "Transactions" → filtered card transactions

## Color Choices

### Dark Mode (Default)
- Background: `#0A0F1A` (near-black navy)
- Surface/Cards: `#141B2D` (dark navy)
- Elevated Surface: `#1C2438` (lighter navy)
- Primary Accent: `#C9A962` (gold)
- Secondary Accent: `#0058D4` (royal blue)
- Text: `#FFFFFF` / `#9CA3AF` (muted)
- Border: `#1F2937`

### Light Mode
- Background: `#F8F9FA` (off-white)
- Surface/Cards: `#FFFFFF`
- Elevated Surface: `#F3F4F6`
- Primary Accent: `#001A3D` (navy)
- Secondary Accent: `#C9A962` (gold)
- Text: `#0A0F1A` / `#6B7280` (muted)
- Border: `#E5E7EB`

## Typography
- Headlines: SF Pro Display (iOS) / Roboto (Android) - Bold
- Body: SF Pro Text / Roboto - Regular
- Numbers/Amounts: SF Pro Display / Roboto Mono - Medium (tabular figures)

## Layout Principles
- 16px horizontal padding on all screens
- 12px spacing between cards
- 24px section spacing
- Bottom tab bar: 56px height + safe area
- Card border radius: 16px
- Button border radius: 12px
- Minimum touch target: 44x44px
