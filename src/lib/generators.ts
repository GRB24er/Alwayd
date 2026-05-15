// File: src/lib/generators.ts

/**
 * Generates a random 10-digit account number, ensuring it doesn’t start with zero.
 */
export function generateAccountNumber(): string {
  let account = '';
  // First digit should be 1-9
  account += Math.floor(Math.random() * 9) + 1;
  // Then add 9 more digits (0-9)
  for (let i = 0; i < 9; i++) {
    account += Math.floor(Math.random() * 10);
  }
  return account;
}

/**
 * Returns a (pseudo) valid 9-digit routing number.
 * In production, you’d validate with the ABA checksum. Here we simply ensure 9 digits.
 */
export function generateRoutingNumber(): string {
  let routing = '';
  // Generate exactly 9 digits
  for (let i = 0; i < 9; i++) {
    routing += Math.floor(Math.random() * 10);
  }
  return routing;
}

/**
 * Generates a mock Bitcoin address. Real addresses are base58check or bech32;
 * for demonstration, we build “1” + 33 random alphanumeric chars.
 */
export function generateBitcoinAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let addr = '1'; // Legacy-style starting “1”
  for (let i = 0; i < 33; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}
