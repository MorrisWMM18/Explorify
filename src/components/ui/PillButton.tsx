"use client";

import { Button } from "react-aria-components";
import type { ReactNode } from "react";

type PillVariant = "accent" | "glass";

interface PillButtonProps {
  children: ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  variant?: PillVariant;
  className?: string;
}

const variantClass: Record<PillVariant, string> = {
  accent: "accent-gloss text-white hover:brightness-105 pressed:brightness-95",
  glass: "glass-panel text-ink hover:bg-glass-hover",
};

function PillButton({
  children,
  onPress,
  isDisabled,
  variant = "glass",
  className = "",
}: PillButtonProps) {
  return (
    <Button
      onPress={onPress}
      isDisabled={isDisabled}
      data-variant={variant}
      className={`inline-flex cursor-pointer items-center justify-center rounded-full font-medium shadow-control transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60 ${variantClass[variant]} ${className}`}
    >
      {children}
    </Button>
  );
}

export default PillButton;
