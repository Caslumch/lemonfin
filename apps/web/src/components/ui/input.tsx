"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  error?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-fg mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-muted select-none">
              {prefix}
            </span>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full rounded-lg border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm font-[family-name:var(--font-body)] text-fg placeholder:text-fg-muted transition-colors duration-150",
              "focus:border-fg focus:outline-none",
              error && "border-danger focus:border-danger",
              prefix && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
