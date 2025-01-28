import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-thumb-gray-400",
        className,
      )}
    >
      {children}
    </div>
  );
}
