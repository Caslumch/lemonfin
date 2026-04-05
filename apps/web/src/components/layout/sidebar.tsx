"use client";

import { useAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Home,
  ArrowUpDown,
  Layers,
  CreditCard,
  Lightbulb,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { sidebarCollapsedAtom, sidebarMobileOpenAtom } from "@/store/sidebar";
import { themeAtom } from "@/store/theme";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transacoes", label: "Transacoes", icon: ArrowUpDown },
  { href: "/categorias", label: "Categorias", icon: Layers },
  { href: "/cartoes", label: "Cartoes", icon: CreditCard },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [mobileOpen, setMobileOpen] = useAtom(sidebarMobileOpenAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  function cycleTheme() {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  }

  const ThemeIcon = theme === "dark" ? Moon : Sun;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="w-7 h-7 bg-lima rounded-sm flex items-center justify-center shrink-0">
          <span className="font-[family-name:var(--font-display)] font-bold text-dark text-sm">
            $
          </span>
        </div>
        {!collapsed && (
          <span className="font-[family-name:var(--font-display)] text-lg font-extrabold text-fg">
            LemonFin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150",
                active
                  ? "bg-lima font-semibold text-dark"
                  : "text-fg-secondary hover:bg-subtle hover:text-fg",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-fg-muted hover:text-fg hover:bg-subtle transition-all duration-150 w-full cursor-pointer",
            collapsed && "justify-center px-0"
          )}
          title={`Tema: ${theme}`}
        >
          <ThemeIcon size={20} />
          {!collapsed && (
            <span className="text-sm capitalize">{theme === "system" ? "Sistema" : theme === "dark" ? "Escuro" : "Claro"}</span>
          )}
        </button>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-md text-fg-muted hover:text-fg hover:bg-subtle transition-all duration-150 w-full cursor-pointer",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <>
              <PanelLeftClose size={20} />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-border px-4 py-4",
          collapsed && "px-2"
        )}
      >
        {session?.user && (
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}
          >
            <Avatar name={session.user.name || "U"} size="default" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-fg-muted truncate">
                  {session.user.email}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-fg-muted hover:text-danger transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-surface border-r border-border h-screen sticky top-0 transition-[width] duration-200 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[220px] bg-surface border-r border-border transform transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 text-fg-muted hover:text-fg cursor-pointer"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
