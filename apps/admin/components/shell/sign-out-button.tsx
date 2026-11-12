"use client";

import { signOut } from "@repo/auth/client";
import { useRouter } from "next/navigation";

export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
