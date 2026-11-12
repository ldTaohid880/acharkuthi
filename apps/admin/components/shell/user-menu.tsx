"use client";

import type { AdminRole } from "@repo/auth";
import { signOut } from "@repo/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/dict";
import type { ShellUser } from "./app-shell";

/** Top-bar user button and its menu (Topbar.dc.html + the open menu in Account-Desktop.dc.html). */
export function UserMenu({ role, user, t }: { role: AdminRole; user: ShellUser; t: Dict }) {
  const router = useRouter();
  const pathname = usePathname();
  const owner = role === "owner";
  const item = "h-8 gap-2 rounded-sm px-2 text-sm focus:bg-accent [&_svg]:size-4";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.topbar.userMenu}
        className="focus-visible:ring-ring wide:h-10 flex h-11 flex-none items-center gap-2 rounded-md border-0 bg-transparent pr-2 pl-1 outline-none focus-visible:ring-[3px]"
      >
        <Avatar initials={user.initials} owner={owner} />
        <span className="flex flex-col text-left leading-[1.15]">
          <span className="text-[13px] font-medium">{user.name}</span>
          <span className="text-muted-foreground text-[11px]">
            {owner ? t.roles.owner : t.roles.staff}
          </span>
        </span>
        <ChevronDown className="text-muted-foreground size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-62 rounded-lg p-1 shadow-md">
        <div className="border-border mb-1 border-b px-2 pt-2 pb-2.5">
          <div className="font-medium">{user.name}</div>
          <div className="text-muted-foreground text-xs">
            {user.email} · {owner ? t.roles.ownerShort : t.roles.staffShort}
          </div>
        </div>
        <DropdownMenuItem asChild className={cn(item, pathname === "/account" && "bg-accent")}>
          <Link href="/account">
            <User aria-hidden />
            {t.nav.items.account}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className={cn(item, "text-danger-text focus:text-danger-text [&_svg]:text-danger-text")}
          onSelect={async () => {
            await signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOut aria-hidden />
          {t.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Avatar({
  initials,
  owner,
  size = "sm",
}: {
  initials: string;
  owner: boolean;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-semibold",
        size === "sm" ? "size-6 text-[10px]" : "size-10 text-sm",
        owner ? "bg-primary text-white" : "bg-[#e5e5e5] text-[#404040]",
      )}
    >
      {initials}
    </span>
  );
}
