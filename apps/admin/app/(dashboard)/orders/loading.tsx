/** Orders-States "লোড হচ্ছে": skeleton table while the list loads. */
export default function Loading() {
  const widths = [96, 120, 80, 108, 90];
  const sk = "animate-pulse rounded-sm bg-[#ededed]";
  return (
    <div className="tab:px-6 tab:pt-5 wide:px-8 wide:pt-6 p-4">
      <div
        aria-busy="true"
        aria-label="অর্ডার লোড হচ্ছে"
        className="border-border overflow-hidden rounded-xl border bg-white shadow-xs"
      >
        <div className="border-border flex h-10 items-center gap-4 border-b px-3">
          <span className={`${sk} size-4`} />
          <span className={`${sk} h-2.5 w-[70px]`} />
          <span className={`${sk} h-2.5 w-[90px]`} />
          <span className={`${sk} ml-auto h-2.5 w-[60px]`} />
        </div>
        {widths.map((w) => (
          <div
            key={w}
            className="border-border flex h-[60px] items-center gap-4 border-b px-3 last:border-b-0"
          >
            <span className={`${sk} size-4`} />
            <span className="flex flex-col gap-1.5">
              <span className={`${sk} h-3 w-[76px]`} />
              <span className={`${sk} h-2.5 w-[110px]`} />
            </span>
            <span className="flex flex-col gap-1.5">
              <span className={`${sk} h-3`} style={{ width: w }} />
              <span className={`${sk} h-2.5 w-[84px]`} />
            </span>
            <span className={`${sk} ml-auto h-[22px] w-16`} />
          </div>
        ))}
      </div>
    </div>
  );
}
