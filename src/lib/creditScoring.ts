// src/lib/creditScoring.ts
import CreditCardApplication from '@/models/CreditCardApplication';

// Define valid risk levels as a type
type RiskLevel = 'low' | 'medium' | 'high' | 'very_high' | null | undefined;

// Credit Score Ranges
const CREDIT_SCORE_RANGES = {
  EXCELLENT: { min: 750, max: 850 },
  GOOD: { min: 700, max: 749 },
  FAIR: { min: 650, max: 699 },
  POOR: { min: 550, max: 649 },
  VERY_POOR: { min: 300, max: 549 }
};

// Card Type Requirements
const CARD_REQUIREMENTS = {
  platinum: {
    minCreditScore: 750,
    minIncome: 75000,
    maxDebtToIncome: 40,
    benefits: {
      creditLimit: { min: 10000, max: 50000 },
      apr: { min: 14.99, max: 18.99 },
      annualFee: 495,
      rewards: '3% cashback on all purchases'
    }
  },
  gold: {
    minCreditScore: 700,
    minIncome: 50000,
    maxDebtToIncome: 45,
    benefits: {
      creditLimit: { min: 5000, max: 25000 },
      apr: { min: 16.99, max: 21.99 },
      annualFee: 295,
      rewards: '2% cashback on dining and travel'
    }
  },
  silver: {
    minCreditScore: 650,
    minIncome: 35000,
    maxDebtToIncome: 50,
    benefits: {
      creditLimit: { min: 2000, max: 15000 },
      apr: { min: 18.99, max: 24.99 },
      annualFee: 95,
      rewards: '1.5% cashback on all purchases'
    }
  },
  basic: {
    minCreditScore: 600,
    minIncome: 20000,
    maxDebtToIncome: 55,
    benefits: {
      creditLimit: { min: 500, max: 5000 },
      apr: { min: 21.99, max: 26.99 },
      annualFee: 0,
      rewards: '1% cashback on all purchases'
    }
  },
  student: {
    minCreditScore: 0, // No credit history required
    minIncome: 0, // Can include financial aid
    maxDebtToIncome: 60,
    benefits: {
      creditLimit: { min: 300, max: 2000 },
      apr: { min: 19.99, max: 26.99 },
      annualFee: 0,
      rewards: '1% cashback, 2% on textbooks'
    }
  },
  secured: {
    minCreditScore: 0, // For building/rebuilding credit
    minIncome: 15000,
    maxDebtToIncome: 70,
    benefits: {
      creditLimit: { min: 200, max: 2000 }, // Based on security deposit
      apr: { min: 22.99, max: 28.99 },
      annualFee: 39,
      rewards: 'Build credit history'
    }
  }
};

/**
 * Simulate credit bureau check (in production, integrate with real APIs)
 */
export async function performCreditCheck(applicationId: string): Promise<any> {
  try {
    const application = await CreditCardApplication.findById(applicationId);
    if (!application) throw new Error('Application not found');

    // Simulate credit score (in production, call Experian/Equifax/TransUnion API)
    const creditScore = simulateCreditScore(application);
    
    // Simulate credit report data
    const creditReport = {
      creditScore,
      paymentHistory: creditScore > 700 ? 'Excellent' : creditScore > 650 ? 'Good' : 'Fair',
      creditUtilization: Math.floor(Math.random() * 30) + 10, // 10-40%
      creditAge: Math.floor(Math.random() * 10) + 2, // 2-12 years
      totalAccounts: Math.floor(Math.random() * 10) + 3,
      hardInquiries: Math.floor(Math.random() * 3),
      publicRecords: creditScore > 650 ? 0 : Math.floor(Math.random() * 2),
      
      // Detailed history
      accounts: generateMockAccounts(creditScore),
      inquiries: generateMockInquiries()
    };

    // Calculate risk score
    const riskScore = calculateRiskScore(creditScore, application);
    
    // Update application with credit check results
    application.creditCheck = {
      provider: 'experian',
      checkedAt: new Date(),
      creditScore,
      creditReport: {
        reportId: `RPT-${Date.now()}`,
        reportUrl: `/credit-reports/${application._id}`
      },
      paymentHistory: creditReport.paymentHistory,
      creditUtilization: creditReport.creditUtilization,
      creditAge: creditReport.creditAge,
      totalAccounts: creditReport.totalAccounts,
      hardInquiries: creditReport.hardInquiries,
      publicRecords: creditReport.publicRecords,
      riskScore,
      riskCategory: getRiskCategory(riskScore)
    };

    application.status = 'credit_check_completed';
    await application.save();

    // Perform internal scoring
    await performInternalScoring(application);

    return creditReport;
  } catch (error) {
    console.error('Credit check error:', error);
    throw error;
  }
}

/**
 * Internal scoring algorithm
 */
export async function performInternalScoring(application: any): Promise<any> {
  try {
    const creditScore = application.creditCheck?.creditScore || 0;
    const annualIncome = application.employmentInfo?.annualIncome || 0;
    const monthlyIncome = annualIncome / 12;
    const debtToIncomeRatio = application.internalScoring?.debtToIncomeRatio || 0;
    
    // Calculate scoring factors (0-100 scale)
    const factors = {
      creditScoreFactor: Math.min(100, (creditScore / 850) * 100),
      
      incomeStabilityFactor: calculateIncomeStability(
        annualIncome,
        application.employmentInfo?.yearsEmployed || 0
      ),
      
      debtToIncomeRatio: Math.max(0, 100 - debtToIncomeRatio),
      
      employmentStabilityFactor: calculateEmploymentStability(
        application.employmentInfo?.status,
        application.employmentInfo?.yearsEmployed || 0
      ),
      
      residentialStabilityFactor: calculateResidentialStability(
        application.personalInfo?.currentAddress?.yearsAtAddress || 0,
        application.personalInfo?.currentAddress?.residenceType
      ),
      
      bankingRelationshipFactor: 50 // Default, would check actual banking history
    };

    // Calculate weighted total score
    const weights = {
      creditScoreFactor: 0.35,
      incomeStabilityFactor: 0.20,
      debtToIncomeRatio: 0.20,
      employmentStabilityFactor: 0.10,
      residentialStabilityFactor: 0.05,
      bankingRelationshipFactor: 0.10
    };

    const totalScore = Object.keys(factors).reduce((sum, key) => {
      return sum + (factors[key as keyof typeof factors] * weights[key as keyof typeof weights]);
    }, 0);

    // Determine card eligibility and terms
    const cardType = application.cardPreferences?.cardType || 'basic';
    const cardRequirements = CARD_REQUIREMENTS[cardType as keyof typeof CARD_REQUIREMENTS];
    
    let recommendedAction: string;
    let creditLimit = 0;
    let interestRate = 0;
    let recommendationReason = '';

    // Check eligibility
    if (creditScore < cardRequirements.minCreditScore) {
      recommendedAction = 'decline';
      recommendationReason = `Credit score (${creditScore}) below minimum requirement (${cardRequirements.minCreditScore})`;
    } else if (annualIncome < cardRequirements.minIncome) {
      recommendedAction = 'decline';
      recommendationReason = `Annual income below minimum requirement`;
    } else if (debtToIncomeRatio > cardRequirements.maxDebtToIncome) {
      recommendedAction = 'decline';
      recommendationReason = `Debt-to-income ratio (${debtToIncomeRatio.toFixed(1)}%) exceeds maximum`;
    } else if (totalScore < 50) {
      recommendedAction = 'manual_review';
      recommendationReason = 'Overall score requires manual review';
    } else {
      recommendedAction = 'approve';
      
      // Calculate credit limit based on score and income
      const scoreMultiplier = totalScore / 100;
      const incomeBasedLimit = monthlyIncome * 2; // 2x monthly income as base
      const scoreAdjustedLimit = incomeBasedLimit * scoreMultiplier;
      
      creditLimit = Math.min(
        cardRequirements.benefits.creditLimit.max,
        Math.max(
          cardRequirements.benefits.creditLimit.min,
          Math.round(scoreAdjustedLimit / 100) * 100 // Round to nearest 100
        )
      );

      // Calculate interest rate based on score
      const aprRange = cardRequirements.benefits.apr.max - cardRequirements.benefits.apr.min;
      const scoreAdjustment = (100 - totalScore) / 100;
      interestRate = cardRequirements.benefits.apr.min + (aprRange * scoreAdjustment);
      
      recommendationReason = `Qualified for ${cardType} card with automated approval`;
    }

    // Update application with scoring results
    application.internalScoring = {
      scoreCalculatedAt: new Date(),
      ...factors,
      totalScore,
      creditLimit,
      interestRate: Math.round(interestRate * 100) / 100,
      recommendedAction,
      recommendationReason
    };

    // Update status based on recommendation
    if (recommendedAction === 'approve') {
      application.status = 'approved';
      application.workflow.decision = {
        type: 'approved',
        madeBy: 'system',
        madeAt: new Date(),
        reason: recommendationReason
      };
      application.workflow.approval = {
        creditLimit,
        interestRate,
        annualFee: cardRequirements.benefits.annualFee,
        cardType
      };
    } else if (recommendedAction === 'decline') {
      application.status = 'declined';
      application.workflow.decision = {
        type: 'declined',
        madeBy: 'system',
        madeAt: new Date(),
        reason: recommendationReason
      };
    } else {
      application.status = 'manual_review';
    }

    await application.save();
    
    return {
      totalScore,
      factors,
      recommendation: recommendedAction,
      creditLimit,
      interestRate,
      reason: recommendationReason
    };

  } catch (error) {
    console.error('Internal scoring error:', error);
    throw error;
  }
}

// Helper functions
function simulateCreditScore(application: any): number {
  // Base score
  let score = 650;
  
  // Adjust based on income
  const income = application.employmentInfo?.annualIncome || 0;
  if (income > 100000) score += 50;
  else if (income > 75000) score += 30;
  else if (income > 50000) score += 20;
  else if (income > 30000) score += 10;
  
  // Adjust based on employment
  if (application.employmentInfo?.yearsEmployed > 5) score += 30;
  else if (application.employmentInfo?.yearsEmployed > 2) score += 15;
  
  // Add some randomness
  score += Math.floor(Math.random() * 100) - 50;
  
  // Ensure within valid range
  return Math.max(300, Math.min(850, score));
}

function calculateRiskScore(creditScore: number, application: any): number {
  let risk = 100;
  
  // Credit score impact (40% weight)
  risk -= (creditScore / 850) * 40;
  
  // Income stability (30% weight)
  const income = application.employmentInfo?.annualIncome || 0;
  if (income > 50000) risk -= 30;
  else if (income > 30000) risk -= 20;
  else if (income > 20000) risk -= 10;
  
  // Employment history (20% weight)
  const yearsEmployed = application.employmentInfo?.yearsEmployed || 0;
  risk -= Math.min(20, yearsEmployed * 4);
  
  // Debt-to-income (10% weight)
  const dti = application.internalScoring?.debtToIncomeRatio || 50;
  if (dti < 30) risk -= 10;
  else if (dti < 40) risk -= 5;
  
  return Math.max(0, Math.min(100, risk));
}

function getRiskCategory(riskScore: number): RiskLevel {
  if (riskScore < 20) return 'low';
  if (riskScore < 40) return 'medium';
  if (riskScore < 60) return 'high';
  return 'very_high';
}

function calculateIncomeStability(income: number, yearsEmployed: number): number {
  let score = 0;
  
  // Income level (60% of score)
  if (income > 100000) score += 60;
  else if (income > 75000) score += 50;
  else if (income > 50000) score += 40;
  else if (income > 30000) score += 30;
  else if (income > 20000) score += 20;
  else score += 10;
  
  // Employment duration (40% of score)
  score += Math.min(40, yearsEmployed * 8);
  
  return score;
}

function calculateEmploymentStability(status: string, years: number): number {
  let baseScore = 0;
  
  switch (status) {
    case 'employed': baseScore = 70; break;
    case 'self_employed': baseScore = 60; break;
    case 'retired': baseScore = 80; break;
    case 'student': baseScore = 40; break;
    default: baseScore = 20;
  }
  
  // Add years bonus
  baseScore += Math.min(30, years * 5);
  
  return Math.min(100, baseScore);
}

function calculateResidentialStability(years: number, type: string): number {
  let baseScore = 0;
  
  switch (type) {
    case 'own': baseScore = 70; break;
    case 'rent': baseScore = 50; break;
    case 'live_with_parents': baseScore = 40; break;
    default: baseScore = 30;
  }
  
  // Add years bonus
  baseScore += Math.min(30, years * 10);
  
  return Math.min(100, baseScore);
}

function generateMockAccounts(creditScore: number) {
  // Generate realistic account history based on credit score
  return [
    {
      creditor: 'Chase Bank',
      accountType: 'Credit Card',
      balance: 2500,
      limit: 10000,
      paymentStatus: creditScore > 650 ? 'Current' : 'Late 30 days',
      opened: '2019-03-15'
    },
    {
      creditor: 'Auto Loan Services',
      accountType: 'Auto Loan',
      balance: 15000,
      originalAmount: 25000,
      paymentStatus: 'Current',
      opened: '2021-06-01'
    }
  ];
}

function generateMockInquiries() {
  return [
    {
      creditor: 'Capital One',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      type: 'Hard'
    },
    {
      creditor: 'Discover',
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      type: 'Soft'
    }
  ];
}