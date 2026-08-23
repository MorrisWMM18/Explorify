interface StatusPillProps {
  children: React.ReactNode;
}

//The header's "Connected to Spotify" indicator: dot + label
function StatusPill({ children }: StatusPillProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-hairline-hi bg-glass px-3.5 py-1.5 text-sm text-ink-2 shadow-control">
      <span className="size-[7px] flex-none rounded-full bg-online" aria-hidden="true" />
      {children}
    </div>
  );
}

export default StatusPill;
