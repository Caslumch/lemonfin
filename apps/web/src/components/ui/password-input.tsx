"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

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
          <input
            id={id}
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn(
              "w-full rounded-[12px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 pr-10 text-sm font-[family-name:var(--font-body)] text-fg placeholder:text-fg-muted transition-colors duration-150",
              "focus:border-fg focus:outline-none",
              error && "border-danger focus:border-danger",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors"
            tabIndex={-1}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
