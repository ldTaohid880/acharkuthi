/** Order detail card pieces (OrderDetail-* .card / phone .sec), shared with "নতুন অর্ডার". */
export const card =
  "border-border flex min-w-0 flex-col rounded-xl border bg-white shadow-xs max-tab:shadow-none";
export const body = "flex flex-col px-6 pt-4 pb-6 max-tab:gap-3 max-tab:p-4 max-tab:pt-3";
export const kv =
  "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:tabular-nums [&_dt]:text-muted-foreground";

/** Desktop board text vs the 1194 / 834 boards' shorter text. */
export function Wide({ wide, other }: { wide: string; other: string }) {
  return (
    <>
      <span className="wide:inline hidden">{wide}</span>
      <span className="wide:hidden">{other}</span>
    </>
  );
}

export function CardHead({
  title,
  phoneTitle,
  desc,
  phoneSub,
  aside,
}: {
  title: string;
  phoneTitle?: string;
  desc?: React.ReactNode;
  phoneSub?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="max-tab:px-4 max-tab:pt-4 flex items-start justify-between gap-3 px-6 pt-5">
      <div className="min-w-0">
        <h2 className="max-tab:text-[15px] text-base leading-6 font-semibold">
          {phoneTitle ? (
            <>
              <span className="max-tab:hidden">{title}</span>
              <span className="tab:hidden">{phoneTitle}</span>
            </>
          ) : (
            title
          )}
          {phoneSub ? (
            <span className="text-muted-foreground tab:hidden ml-1 text-xs leading-4 font-normal">
              {phoneSub}
            </span>
          ) : null}
        </h2>
        {desc ? (
          <p className="text-muted-foreground max-tab:hidden text-[13px] leading-5">{desc}</p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}
