import { cn } from "@repo/ui/lib/utils";

/** The design's `.wrap`: 1204px max width with a 32px gutter. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("wrap", className)} {...props} />;
}
