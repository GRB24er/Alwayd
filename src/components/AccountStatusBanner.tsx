// Banner shown across the customer UI when the account is frozen, blocked,
// or closed. Loads the current restriction once on mount and offers a link
// to download the official PDF notice + contact compliance.

"use client";

import { useEffect, useState } from "react";

interface ActiveRestriction {
  referenceNumber: string;
  action: "freeze" | "block" | "close";
  status: string;
  reasonCategory: string;
  reasonNote: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  documentUrl: string;
}

const ACTION_TITLES = {
  freeze: "Your account is temporarily frozen",
  block: "Your account is currently blocked",
  close: "Your account has been closed",
} as const;

const ACTION_INTRO = {
  freeze:
    "Outgoing transactions — transfers, withdrawals, card payments — are suspended while this freeze is in effect. Incoming credits will continue to post.",
  block:
    "All account access is suspended pending resolution of the matter in the notice. Inbound transfers will be returned to the sender.",
  close:
    "This account has been permanently closed. Any residual balance will be remitted in accordance with your account terms.",
} as const;

const ACTION_BG = {
  freeze: { background: "#fef3c7", border: "1px solid #fcd34d", color: "#78350f" },
  block: { background: "#fee2e2", border: "1px solid #fca5a5", color: "#7f1d1d" },
  close: { background: "#e5e7eb", border: "1px solid #9ca3af", color: "#1f2937" },
} as const;

export default function AccountStatusBanner() {
  const [restriction, setRestriction] = useState<ActiveRestriction | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/accounts/restrictions")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.active) setRestriction(data.active);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !restriction) return null;

  const palette = ACTION_BG[restriction.action];

  return (
    <div
      role="alert"
      style={{
        ...palette,
        padding: "16px 20px",
        borderRadius: 10,
        margin: "16px 24px",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          {ACTION_TITLES[restriction.action]}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>
          {ACTION_INTRO[restriction.action]}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Reference: <strong>{restriction.referenceNumber}</strong>
          {restriction.effectiveUntil && (
            <>
              {" · "}Effective until{" "}
              <strong>{new Date(restriction.effectiveUntil).toLocaleDateString()}</strong>
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <a
          href={restriction.documentUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "8px 14px",
            background: "#1a1f2e",
            color: "#c9a962",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Download notice PDF
        </a>
        <a
          href="mailto:compliance@aldwychcapital.com"
          style={{
            padding: "8px 14px",
            background: "transparent",
            color: palette.color,
            border: `1px solid ${palette.color}`,
            borderRadius: 6,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Contact compliance
        </a>
      </div>
    </div>
  );
}
