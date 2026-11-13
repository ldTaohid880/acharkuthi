/** Order detail while it loads: the States board's skeleton bars, in the detail page's cards. */
export default function Loading() {
  const sk = "animate-pulse rounded-sm bg-[#ededed]";
  const card = (lines: number[]) => (
    <div className="border-border max-tab:p-4 flex flex-col gap-3 rounded-xl border bg-white p-6 shadow-xs">
      <span className={`${sk} h-4 w-32`} />
      {lines.map((w, i) => (
        <span key={i} className={`${sk} h-3`} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
  return (
    <div
      aria-busy="true"
      aria-label="অর্ডার লোড হচ্ছে"
      className="tab:px-6 tab:pt-5 wide:px-8 wide:pt-6 flex flex-col gap-4 p-4"
    >
      <div className="flex flex-col gap-2">
        <span className={`${sk} h-7 w-56`} />
        <span className={`${sk} h-3 w-72 max-w-full`} />
      </div>
      <div className="desk:flex-row flex flex-col gap-4">
        <div className="desk:flex-[1.45_1_0] flex min-w-0 flex-col gap-4">
          {card([90, 70, 80])}
          {card([60, 50, 55, 45])}
        </div>
        <div className="desk:flex-[1_1_0] flex min-w-0 flex-col gap-4">
          {card([70, 85, 60])}
          {card([50, 65])}
        </div>
      </div>
    </div>
  );
}
