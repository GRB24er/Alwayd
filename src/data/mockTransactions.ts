// src/data/mockTransactions.ts
// Investment growth: 2003-12-05 → 2023-12-05 (20 years), start $9.6M, end $45,458,575.89

export const mockTransactions = [
  { 
    id: "tx-2003-12-05-deposit", 
    date: "2003-12-05", 
    description: "Initial Investment Deposit - Wire Transfer from Checking", 
    amount: 9600000.00, 
    type: "deposit",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INV-2003-INITIAL"
  },
  { 
    id: "tx-2004-12-05-int", 
    date: "2004-12-05", 
    description: "Annual Interest Credit — Year 1 (8.0854%)", 
    amount: 776203.07, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2004-ANNUAL"
  },
  { 
    id: "tx-2005-12-05-int", 
    date: "2005-12-05", 
    description: "Annual Interest Credit — Year 2 (8.0854%)", 
    amount: 838962.57, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2005-ANNUAL"
  },
  { 
    id: "tx-2006-12-05-int", 
    date: "2006-12-05", 
    description: "Annual Interest Credit — Year 3 (8.0854%)", 
    amount: 906796.46, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2006-ANNUAL"
  },
  { 
    id: "tx-2007-12-05-int", 
    date: "2007-12-05", 
    description: "Annual Interest Credit — Year 4 (8.0854%)", 
    amount: 980115.02, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2007-ANNUAL"
  },
  { 
    id: "tx-2008-12-05-int", 
    date: "2008-12-05", 
    description: "Annual Interest Credit — Year 5 (8.0854%)", 
    amount: 1059360.55, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2008-ANNUAL"
  },
  { 
    id: "tx-2009-12-05-int", 
    date: "2009-12-05", 
    description: "Annual Interest Credit — Year 6 (8.0854%)", 
    amount: 1145009.47, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2009-ANNUAL"
  },
  { 
    id: "tx-2010-12-05-int", 
    date: "2010-12-05", 
    description: "Annual Interest Credit — Year 7 (8.0854%)", 
    amount: 1237576.58, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2010-ANNUAL"
  },
  { 
    id: "tx-2011-12-05-int", 
    date: "2011-12-05", 
    description: "Annual Interest Credit — Year 8 (8.0854%)", 
    amount: 1337617.78, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2011-ANNUAL"
  },
  { 
    id: "tx-2012-12-05-int", 
    date: "2012-12-05", 
    description: "Annual Interest Credit — Year 9 (8.0854%)", 
    amount: 1445734.20, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2012-ANNUAL"
  },
  { 
    id: "tx-2013-12-05-int", 
    date: "2013-12-05", 
    description: "Annual Interest Credit — Year 10 (8.0854%)", 
    amount: 1562575.16, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2013-ANNUAL"
  },
  { 
    id: "tx-2014-12-05-int", 
    date: "2014-12-05", 
    description: "Annual Interest Credit — Year 11 (8.0854%)", 
    amount: 1688841.60, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2014-ANNUAL"
  },
  { 
    id: "tx-2015-12-05-int", 
    date: "2015-12-05", 
    description: "Annual Interest Credit — Year 12 (8.0854%)", 
    amount: 1825290.38, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2015-ANNUAL"
  },
  { 
    id: "tx-2016-12-05-int", 
    date: "2016-12-05", 
    description: "Annual Interest Credit — Year 13 (8.0854%)", 
    amount: 1972739.40, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2016-ANNUAL"
  },
  { 
    id: "tx-2017-12-05-int", 
    date: "2017-12-05", 
    description: "Annual Interest Credit — Year 14 (8.0854%)", 
    amount: 2132071.04, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2017-ANNUAL"
  },
  { 
    id: "tx-2018-12-05-int", 
    date: "2018-12-05", 
    description: "Annual Interest Credit — Year 15 (8.0854%)", 
    amount: 2304235.81, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2018-ANNUAL"
  },
  { 
    id: "tx-2019-12-05-int", 
    date: "2019-12-05", 
    description: "Annual Interest Credit — Year 16 (8.0854%)", 
    amount: 2490246.31, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2019-ANNUAL"
  },
  { 
    id: "tx-2020-12-05-int", 
    date: "2020-12-05", 
    description: "Annual Interest Credit — Year 17 (8.0854%)", 
    amount: 2691180.32, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2020-ANNUAL"
  },
  { 
    id: "tx-2021-12-05-int", 
    date: "2021-12-05", 
    description: "Annual Interest Credit — Year 18 (8.0854%)", 
    amount: 2908184.48, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2021-ANNUAL"
  },
  { 
    id: "tx-2022-12-05-int", 
    date: "2022-12-05", 
    description: "Annual Interest Credit — Year 19 (8.0854%)", 
    amount: 3142468.84, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2022-ANNUAL"
  },
  { 
    id: "tx-2023-12-05-int", 
    date: "2023-12-05", 
    description: "Annual Interest Credit — Year 20 (8.0854%)", 
    amount: 3400577.85, 
    type: "interest",
    accountType: "investment",
    status: "Completed" as const, 
    category: "Investment Account",
    reference: "INT-2023-ANNUAL"
  }
];

// Checking account transactions - May 29, 2025 deposit
export const checkingTransactions = [
  {
    id: "tx-2025-05-29-deposit",
    date: "2025-05-29",
    description: "Wire Transfer Deposit",
    amount: 4000.00,
    type: "deposit",
    accountType: "checking",
    status: "Completed" as const,
    category: "Deposit",
    reference: "DEP-2025-05-29"
  }
];

// Savings account credit from 2003
export const savingsTransactions = [
  {
    id: "tx-2003-06-15-credit",
    date: "2003-06-15",
    description: "Account Credit - Initial Funding",
    amount: 1000.00,
    type: "credit",
    accountType: "savings",
    status: "Completed" as const,
    category: "Account Credit",
    reference: "CR-2003-INITIAL"
  }
];

// Calculate total investment value
export const calculateTotalInvestment = () => {
  return mockTransactions.reduce((total, tx) => total + tx.amount, 0);
};

// Export all transactions combined for display
export const allTransactions = [...mockTransactions, ...checkingTransactions, ...savingsTransactions];

export default mockTransactions;