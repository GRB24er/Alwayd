// Client-side helpers shared by the money-moving pages.

// Extracts a human-readable message from an API error payload. Transfer
// endpoints return either { error } or, for validation failures, a per-field
// { errors } map — surface the field messages instead of a generic failure.
export function apiErrorMessage(data: unknown, fallback = "Request failed"): string {
  const d = data as { error?: string; errors?: Record<string, string> } | null;
  if (d?.error) return d.error;
  if (d?.errors && typeof d.errors === "object") {
    const messages = Object.values(d.errors).filter(Boolean);
    if (messages.length) return messages.join(" · ");
  }
  return fallback;
}

// Unique key for the Idempotency-Key header required by money-moving
// endpoints; prevents a double-click or retry from creating two transfers.
export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  // randomUUID needs a secure context; getRandomValues does not.
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const buf = new Uint8Array(16);
  c.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}
