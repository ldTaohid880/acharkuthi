import { cn } from "@repo/ui/lib/utils";

export type IconName =
  | "arrow"
  | "basket"
  | "chat"
  | "chili"
  | "close"
  | "heart"
  | "jar"
  | "leaf"
  | "mango"
  | "menu"
  | "minus"
  | "plus"
  | "pot"
  | "search"
  | "sun"
  | "truck"
  | "user";

/** Recolourable mask icon (`currentColor`). Size with className, e.g. `size-5`. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <i className={cn("ak-i", `i-${name}`, className)} aria-hidden="true" />;
}

/** The design's three heat pods. `pods` is how many are filled. */
export function Heat({ pods, word }: { pods: 1 | 2 | 3; word?: string }) {
  return (
    <span className="ak-heat">
      <span className="pods" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= pods ? undefined : "off"} />
        ))}
      </span>
      {word}
    </span>
  );
}
