import type { ElementType, ReactNode } from "react";

type PanelRadius = "card" | "panel" | "row";

interface GlassPanelProps {
  children: ReactNode;
  /** Matches the design's radius scale: card 26px, panel 22px, row 14px. */
  radius?: PanelRadius;
  /** Render as <section>/<article>/etc. where the semantics call for it. */
  as?: ElementType;
  className?: string;
}

const radiusClass: Record<PanelRadius, string> = {
  card: "rounded-card",
  panel: "rounded-panel",
  row: "rounded-row",
};

/**
 * The shared frosted surface. No react-aria import, so this stays usable
 * from server components.
 */
function GlassPanel({
  children,
  radius = "card",
  as: Component = "div",
  className = "",
}: GlassPanelProps) {
  return (
    <Component className={`glass-panel ${radiusClass[radius]} ${className}`}>
      {children}
    </Component>
  );
}

export default GlassPanel;
