import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Admin buttons, exactly admin.css .btn: 36px / 8px radius / 14px 500, sm 32, xs 28, lg 44.
 * Use on <button> or <Link>: className={btn({ variant: "outline", size: "lg" })}.
 */
const variants = cva(
  "focus-visible:ring-ring inline-flex flex-none cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap no-underline outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:flex-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs",
        outline: "border-border text-foreground hover:bg-accent bg-white shadow-xs",
        secondary: "bg-muted text-foreground",
        ghost: "text-foreground hover:bg-accent bg-transparent",
        destructive: "bg-destructive text-white shadow-xs",
        link: "text-primary h-auto px-0 underline underline-offset-4",
      },
      size: {
        default: "h-9 px-4 text-sm leading-5",
        sm: "h-8 gap-1.5 px-3 text-[13px]",
        xs: "h-7 gap-1.5 rounded-sm px-2.5 text-xs",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-9 p-0",
        iconSm: "size-8 p-0",
        iconLg: "size-11 p-0",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type BtnProps = VariantProps<typeof variants> & { className?: string };

/** Class names for an admin button; a passed className wins over the size defaults. */
export function btn(props: BtnProps = {}): string {
  return cn(variants(props));
}
