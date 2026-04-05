"use client";

import { useAtom } from "jotai";
import { Menu } from "lucide-react";
import { sidebarMobileOpenAtom } from "@/store/sidebar";

interface ContentHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function ContentHeader({ title, actions }: ContentHeaderProps) {
  const [, setMobileOpen] = useAtom(sidebarMobileOpenAtom);

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-5 md:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden text-fg-secondary hover:text-fg cursor-pointer"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-fg">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
