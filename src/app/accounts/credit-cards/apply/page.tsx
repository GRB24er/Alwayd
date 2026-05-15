// src/app/accounts/credit-cards/apply/page.tsx
import CreditCardApplicationForm from '@/components/CreditCardApplication';

export default function ApplyCreditCardPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%)',
      padding: '20px'
    }}>
      <CreditCardApplicationForm />
    </div>
  );
}