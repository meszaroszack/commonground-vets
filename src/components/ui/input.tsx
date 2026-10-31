import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-sand bg-white px-4 text-sm text-forest placeholder:text-forest/40",
        className,
      )}
      {...props}
    />
  );
}
