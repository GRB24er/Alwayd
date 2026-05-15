'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

export default function BackButton() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="backBtn">
      ← Back
    </button>
  );
}
