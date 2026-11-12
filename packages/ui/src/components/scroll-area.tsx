"use client";

import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";

function ScrollArea({
  className,
  children,
  viewportClassName,
  viewportRef,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Classes for the scrolling element, e.g. a max-height or the content padding. */
  viewportClassName?: string;
  /** The scrolling element, for callers that set scrollTop themselves. */
  viewportRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    // Thin overlay bar that shows only while scrolling, so it never sits on content at rest.
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type="scroll"
      scrollHideDelay={700}
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          // Radix wraps children in a display:table div; block keeps truncate and flex children working.
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&>div]:!block",
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none transition-opacity select-none data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100",
        orientation === "vertical" && "h-full w-2 py-1 pr-0.5",
        orientation === "horizontal" && "h-2 flex-col px-1 pb-0.5",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-[#d4d4d4] hover:bg-[#a3a3a3]"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
