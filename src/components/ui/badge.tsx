import type * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-sand bg-alabaster px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-forest/80",
        className,
      )}
      {...props}
    />
  );
}
