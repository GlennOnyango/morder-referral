import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
  {
  variants: {
    variant: {
      default: "border border-emerald-900/10 bg-gradient-to-br from-emerald-700 to-sky-700 text-white shadow-sm hover:shadow-md",
      primary: "border border-emerald-900/10 bg-gradient-to-br from-emerald-700 to-sky-700 text-white shadow-sm hover:shadow-md",
      ghost: "border border-slate-700/20 bg-white/70 text-slate-900 hover:bg-white",
      outline: "border border-rose-700/20 bg-rose-700/10 text-rose-700 hover:bg-rose-700/15",
      link: "rounded-none border-none bg-transparent p-0 text-sky-700 underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 text-sm",
      sm: "h-9 px-3 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10 p-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
