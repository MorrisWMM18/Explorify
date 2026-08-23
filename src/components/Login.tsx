"use client";

import { signIn } from "next-auth/react";
import GlassBackdrop from "./shell/GlassBackdrop";
import GlassPanel from "./ui/GlassPanel";
import PillButton from "./ui/PillButton";

function Login() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <GlassBackdrop />

      <GlassPanel
        radius="card"
        className="relative z-10 flex flex-col items-center gap-6 p-12 text-center"
      >
        <div className="flex items-center gap-[11px]">
          <div
            className="accent-gloss size-[30px] flex-none rounded-swatch shadow-control"
            data-role="logo-mark"
          />
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">
            Explorify
          </span>
        </div>

        <h1 className="max-w-[26ch] font-display text-[34px] font-semibold leading-[1.1]">
          Find your next song from the one you&apos;re playing now
        </h1>

        <PillButton
          variant="glass"
          onPress={() => signIn("spotify")}
          className="px-[30px] py-3.5"
        >
          Log in with Spotify
        </PillButton>
      </GlassPanel>
    </div>
  );
}

export default Login;
