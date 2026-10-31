import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-sm leading-6 text-forest placeholder:text-forest/40",
        className,
      )}
      {...props}
    />
  );
}
