import { Lock } from "lucide-react";
import Link from "next/link";
import { btn } from "@/components/btn";
import { StatusCard } from "@/components/shell/status-card";
import { getDict } from "@/lib/i18n/server";

/** Staff opening an owner-only page (requireRole("owner") → forbidden()). States.dc.html "অ্যাক্সেস নেই". */
export default async function Forbidden() {
  const { t } = await getDict();
  return (
    <>
      <StatusCard
        mark={
          <span className="bg-muted desk:size-[52px] inline-flex size-12 items-center justify-center rounded-full text-[#525252]">
            <Lock className="size-5" aria-hidden />
          </span>
        }
        title={t.forbidden.title}
        body={t.forbidden.body}
        actions={
          <Link
            href="/"
            className={btn({ size: "lg", className: "desk:h-9 desk:px-4 desk:text-sm" })}
          >
            {t.forbidden.back}
          </Link>
        }
        foot={t.forbidden.code}
      />
    </>
  );
}
