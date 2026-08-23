"use client";

import { Button } from "react-aria-components";
import type { ReactNode } from "react";

/** The three circular control sizes in the design. */
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
  children: ReactNode;
  /** Required — these buttons are icon-only, so they carry no text label. */
  "aria-label": string;
  onPress?: () => void;
  isDisabled?: boolean;
  size?: IconButtonSize;
  className?: string;
}

const sizeClass: Record<IconButtonSize, string> = {
  sm: "size-[34px]", // song row controls
  md: "size-[42px]", // carousel arrows
  lg: "size-[54px]", // transport play/pause
};

function IconButton({
  children,
  onPress,
  isDisabled,
  size = "sm",
  className = "",
  "aria-label": ariaLabel,
}: IconButtonProps) {
  return (
    <Button
      aria-label={ariaLabel}
      onPress={onPress}
      isDisabled={isDisabled}
      className={`${sizeClass[size]} flex flex-none items-center justify-center rounded-full disabled:cursor-default ${className}`}
    >
      {children}
    </Button>
  );
}

export default IconButton;
