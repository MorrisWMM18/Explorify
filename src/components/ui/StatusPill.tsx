interface StatusPillProps {
  children: React.ReactNode;
}

// The header's "Connected to Spotify" indicator: a pill with dot + label from md: up,
// just the dot below that (the label stays available to screen readers).
function StatusPill({ children }: StatusPillProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-2 md:rounded-full md:border md:border-hairline-hi md:bg-glass md:px-3.5 md:py-1.5 md:shadow-control">
      <span className="size-2.5 flex-none rounded-full bg-online md:size-[7px]" aria-hidden="true" />
      <span className="sr-only md:not-sr-only">{children}</span>
    </div>
  );
}

export default StatusPill;
