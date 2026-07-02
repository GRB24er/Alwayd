"use client";

import Image from "next/image";

interface AppIconProps {
  name: string; // file name without extension
  alt?: string;
  size?: number;
  className?: string;
}

export default function AppIcon({ name, alt, size = 20, className }: AppIconProps) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={alt || name}
      width={size}
      height={size}
      className={className}
    />
  );
}
