// src/lib/accounts.ts
export type Currency = 'USD' | 'BTC';
export type AccountType = 'checking' | 'savings' | 'investment';

export type Money = Record<Currency, number>;
export type AccountSnapshot = Record<AccountType, Money>;

const ZERO: Money = { USD: 0, BTC: 0 };

export function emptySnapshot(): AccountSnapshot {
  return {
    checking: { ...ZERO },
    savings: { ...ZERO },
    investment: { ...ZERO },
  };
}

function isAccountType(val: any): val is AccountType {
  return val === 'checking' || val === 'savings' || val === 'investment';
}

/**
 * Read balances from user doc into a normalized snapshot.
 * Priority:
 *  1) user.accounts[]: [{ type, balances: { USD, BTC } }]
 *  2) Legacy: user.balance / user.btcBalance -> map to checking
 */
export function snapshotFromUser(user: any): AccountSnapshot {
  const snap = emptySnapshot();

  if (Array.isArray(user?.accounts)) {
    for (const a of user.accounts) {
      const tRaw = String(a?.type || '').toLowerCase();
      if (isAccountType(tRaw)) {
        const t: AccountType = tRaw; // narrowed
        const USD = Number(a?.balances?.USD ?? 0);
        const BTC = Number(a?.balances?.BTC ?? 0);
        snap[t] = { USD, BTC };
      }
    }
  } else {
    const USD = Number((user as any).balance ?? 0);
    const BTC = Number((user as any).btcBalance ?? 0);
    snap.checking = { USD, BTC };
  }

  return snap;
}

/**
 * Ensure user.accounts[] exists with 3 account types & numeric balances.
 * Call before posting; then save(user).
 */
export function ensureAccountsOnUser(user: any) {
  if (!Array.isArray(user.accounts)) user.accounts = [];
  const want: AccountType[] = ['checking', 'savings', 'investment'];

  for (const t of want) {
    let acc = user.accounts.find((x: any) => String(x?.type || '').toLowerCase() === t);
    if (!acc) {
      acc = { type: t, balances: { USD: 0, BTC: 0 } };
      user.accounts.push(acc);
    } else {
      if (!acc.balances) acc.balances = { USD: 0, BTC: 0 };
      if (typeof acc.balances.USD !== 'number') acc.balances.USD = 0;
      if (typeof acc.balances.BTC !== 'number') acc.balances.BTC = 0;
      acc.type = t; // normalize casing
    }
  }
}
