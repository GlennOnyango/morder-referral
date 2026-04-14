import type * as React from "react";
import { cn } from "../../lib/utils";

const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card"
    className={cn("rounded-2xl border border-slate-700/15 bg-white/90 shadow-sm", className)}
    {...props}
  />
);

const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="card-content" className={cn("p-4", className)} {...props} />
);

export { Card, CardContent };
