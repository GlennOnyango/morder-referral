import type * as React from "react";
import { cn } from "../../lib/utils";

const Input = ({ className, ...props }: React.ComponentProps<"input">) => (
  <input
    className={cn(
      "w-full rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.75",
      "font-[inherit] text-[0.95rem] text-[#0d2230]",
      "transition-[border-color,box-shadow] duration-160 ease-out",
      "placeholder:text-[#506071]/60",
      "focus:outline-none focus:border-emerald-700/70 focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)]",
      "read-only:cursor-default read-only:bg-slate-50/90 read-only:text-[#506071]",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
);

export { Input };
