import Link from "next/link";
import { btn } from "@/components/btn";
import { StatusCard } from "@/components/shell/status-card";
import { getDict } from "@/lib/i18n/server";

/** States.dc.html "পেজ পাওয়া যায়নি", inside the app shell. */
export default async function NotFound() {
  const { t } = await getDict();
  const size = { size: "lg", className: "desk:h-9 desk:px-4 desk:text-sm" } as const;
  return (
    <>
      <StatusCard
        mark={
          <span className="tabular text-[56px] leading-none font-bold text-[#d4d4d4]">404</span>
        }
        title={t.notFound.title}
        body={t.notFound.body}
        actions={
          <>
            <Link href="/orders" className={btn({ variant: "outline", ...size })}>
              {t.notFound.orders}
            </Link>
            <Link href="/" className={btn(size)}>
              {t.notFound.dash}
            </Link>
          </>
        }
      />
    </>
  );
}
