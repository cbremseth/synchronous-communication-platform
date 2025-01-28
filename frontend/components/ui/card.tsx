import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background p-4 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
