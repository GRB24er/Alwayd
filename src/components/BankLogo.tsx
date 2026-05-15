"use client";

import Image from "next/image";
import { useState } from "react";

interface BankLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function BankLogo({ width = 32, height = 32, className }: BankLogoProps) {
  const [src, setSrc] = useState("/images/logo.png");

  return (
    <Image
      src={src}
      alt="Horizon Global Capital"
      width={width}
      height={height}
      className={className}
      priority
      onError={() => setSrc("/icons/logo.svg")} // fallback if PNG missing
    />
  );
}
