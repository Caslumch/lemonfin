"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer focus:outline-2 focus:outline-offset-2 focus:outline-lima disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-lima text-dark hover:brightness-92 active:brightness-88",
        secondary:
          "bg-dark text-white hover:brightness-120 active:brightness-130",
        outline:
          "bg-transparent text-fg border-[1.5px] border-border hover:bg-subtle active:bg-muted",
        ghost:
          "bg-transparent text-fg-secondary hover:text-fg hover:bg-subtle active:bg-muted",
        danger:
          "bg-danger text-white hover:brightness-92 active:brightness-88",
      },
      size: {
        sm: "px-4 py-2 text-xs rounded-sm",
        default: "px-6 py-2.5 text-sm rounded-md",
        lg: "px-7 py-3 text-[15px] rounded-md",
        icon: "w-10 h-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
