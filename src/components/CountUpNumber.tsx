'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

type Props = {
  value: number | string | null | undefined;
  decimals?: number;   // default 2
  prefix?: string;     // e.g., "$"
  suffix?: string;     // e.g., " USD"
  duration?: number;   // seconds, default 0.6
};

/** Safely coerce any input into a finite number (default 0). */
function toNumber(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'string') {
    // strip common formatting like commas or currency symbols
    const n = Number(input.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function CountUpNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  duration = 0.6,
}: Props) {
  const target = toNumber(value);
  const motionValue = useMotionValue<number>(toNumber(0));

  // Keep decimals sane (0..8)
  const places = Math.max(0, Math.min(8, decimals));

  // Format safely even if "latest" comes through as string for any reason
  const formatted = useTransform(motionValue, (latest) => {
    const n = typeof latest === 'number' ? latest : toNumber(latest);
    return `${prefix}${n.toFixed(places)}${suffix}`;
  });

  useEffect(() => {
    // Animate from the current motion value to the new target
    const controls = animate(motionValue, target, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [target, duration, motionValue]);

  return <motion.span>{formatted}</motion.span>;
}
