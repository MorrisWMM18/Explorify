import type { ReactNode } from "react";
import GlassBackdrop from "./GlassBackdrop";
import Header from "./Header";

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <GlassBackdrop />
      <Header />

      <div className="relative z-10 flex-1 overflow-auto">
        <main className="mx-auto flex max-w-[1180px] flex-col gap-13 px-12 pb-[90px] pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
