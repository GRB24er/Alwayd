// src/lib/amortization.ts
// Standard fixed-rate amortization schedule for Aldwych loan facilities.
// Uses the level-payment formula:
//   M = P * (r * (1+r)^n) / ((1+r)^n - 1)
// where r is the monthly rate and n is the number of monthly periods.

export interface AmortizationRow {
  /** 1-indexed period number. */
  period: number;
  /** Scheduled due date of the payment. */
  dueDate: Date;
  /** Constant total payment for the period (principal + interest). */
  payment: number;
  /** Interest portion of the payment. */
  interest: number;
  /** Principal portion of the payment. */
  principal: number;
  /** Outstanding balance after the payment. */
  balance: number;
}

export interface AmortizationSummary {
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayable: number;
  firstPaymentDate: Date;
  finalPaymentDate: Date;
  schedule: AmortizationRow[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Adds N calendar months to a date, clamping the day-of-month if the
 *  target month is shorter (e.g. Jan 31 → Feb 28). */
function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  const targetMonth = out.getMonth() + months;
  out.setDate(1);
  out.setMonth(targetMonth);
  const daysInTargetMonth = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(d.getDate(), daysInTargetMonth));
  return out;
}

export function buildAmortization(opts: {
  principal: number;
  annualRatePercent: number;
  termMonths: number;
  startDate?: Date;
}): AmortizationSummary {
  const { principal, annualRatePercent, termMonths } = opts;
  const startDate = opts.startDate || new Date();

  if (principal <= 0) throw new Error('Principal must be positive');
  if (termMonths <= 0) throw new Error('Term must be at least 1 month');

  const r = annualRatePercent / 100 / 12;
  const n = termMonths;

  // Edge case: zero-interest loan
  const M = r === 0 ? principal / n : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const firstPaymentDate = addMonths(startDate, 1);
  let balance = principal;
  let totalInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let i = 1; i <= n; i++) {
    const interest = round2(balance * r);
    let principalPaid = round2(M - interest);
    let payment = round2(M);

    // On the final payment, balance out any rounding drift so the
    // remaining balance lands at exactly zero.
    if (i === n) {
      principalPaid = round2(balance);
      payment = round2(principalPaid + interest);
    }

    balance = round2(balance - principalPaid);
    totalInterest = round2(totalInterest + interest);

    schedule.push({
      period: i,
      dueDate: addMonths(startDate, i),
      payment,
      interest,
      principal: principalPaid,
      balance: Math.max(0, balance),
    });
  }

  return {
    principal: round2(principal),
    annualRate: annualRatePercent,
    termMonths: n,
    monthlyPayment: round2(M),
    totalInterest,
    totalRepayable: round2(principal + totalInterest),
    firstPaymentDate,
    finalPaymentDate: schedule[schedule.length - 1].dueDate,
    schedule,
  };
}
