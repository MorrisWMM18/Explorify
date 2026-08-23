"use client";

import { useSession, signOut } from "next-auth/react";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import StatusPill from "../ui/StatusPill";

function Header() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="relative z-20 flex h-[74px] flex-none items-center justify-between px-11">
      {/* Explorify + Home tab */}
      <div className="flex items-center gap-[30px]">
        <div className="flex items-center gap-[11px]">
          <div
            className="accent-gloss size-[30px] flex-none rounded-swatch shadow-control"
            data-role="logo-mark"
          />
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">
            Explorify
          </span>
        </div>

        <nav className="flex items-center gap-1 rounded-chip p-1">
          <span className="rounded-[9px] px-4 py-[7px] text-sm font-medium" aria-current="page">
            Home
          </span>
        </nav>
      </div>

      {/* Spotify connect status + Account */}
      <div className="flex items-center gap-[18px]">
        <StatusPill>Connected to Spotify</StatusPill>

        <MenuTrigger>
          <Button
            aria-label={user?.name ? `Account menu for ${user.name}` : "Account menu"}
            className="flex items-center gap-2.5"
          >
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                width={32}
                height={32}
                className="size-8 flex-none rounded-full object-cover"
              />
            ) : (
              <span className="size-8 flex-none rounded-full" />
            )}
            <span className="text-sm font-medium">{user?.name}</span>
          </Button>
          <Popover
            placement="bottom end"
            offset={12}
            className="glass-menu min-w-[var(--trigger-width)] rounded-panel p-1.5 entering:[animation:menu-in_0.18s_var(--ease-slide)] exiting:[animation:menu-out_0.13s_ease-in]"
          >
            <Menu onAction={() => signOut()} className="outline-none">
              <MenuItem
                id="signout"
                className="cursor-pointer rounded-row px-5 py-2.5 text-center text-sm font-medium text-ink-2 outline-none hover:bg-glass-hover focus:bg-glass-hover pressed:bg-glass-hover"
              >
                Log out
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </header>
  );
}

export default Header;
