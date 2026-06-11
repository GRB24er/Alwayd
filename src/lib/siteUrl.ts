// Canonical public origin for customer-facing links that must always show the
// bank's real domain — most importantly the QR verification URLs printed on
// receipts, statements, loan agreements and restriction notices.
//
// We deliberately do NOT fall back to the incoming request's origin or to
// NEXTAUTH_URL: on Vercel those resolve to the deployment URL
// (e.g. *.vercel.app), which on a scanned document looks untrustworthy and can
// make a client doubt the receipt is genuine. Set NEXT_PUBLIC_SITE_URL in the
// environment to override; otherwise we use the production bank domain.

const DEFAULT_SITE_URL = "https://www.aldwycheuropeancapital.com";

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_SITE_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getPublicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? normalize(configured) : DEFAULT_SITE_URL;
}

// Full public verification URL for a document reference.
export function verificationUrlFor(reference: string): string {
  return `${getPublicSiteUrl()}/verify/${encodeURIComponent(reference)}`;
}
