// src/components/Amount.tsx
"use client";

import React from "react";
import { formatCurrency, formatSigned } from "@/lib/money";

type Props = {
  value: number | string;
  currency?: string; // default USD
  direction?: "credit" | "debit" | "none"; // show +/-
  className?: string;
  minFrac?: number;
  maxFrac?: number;
  ariaLabel?: string;
};

export default function Amount({
  value,
  currency = "USD",
  direction = "none",
  className = "",
  minFrac,
  maxFrac,
  ariaLabel,
}: Props) {
  const text =
    direction === "none"
      ? formatCurrency(value, currency, {
          minimumFractionDigits: minFrac,
          maximumFractionDigits: maxFrac,
        })
      : formatSigned(value, currency, direction);

  return (
    <span className={className} aria-label={ariaLabel || text}>
      {text}
    </span>
  );
}
