"use client";

import { useAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  ArrowUpDown,
  Layers,
  CreditCard,
  Target,
  PiggyBank,
  Repeat,
  Lightbulb,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { useApi } from "@/hooks/use-api";
import { sidebarCollapsedAtom, sidebarMobileOpenAtom } from "@/store/sidebar";
import { themeAtom } from "@/store/theme";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transacoes", label: "Transações", icon: ArrowUpDown },
  { href: "/categorias", label: "Categorias", icon: Layers },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/reservas", label: "Reservas", icon: PiggyBank },
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [mobileOpen, setMobileOpen] = useAtom(sidebarMobileOpenAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { fetchApi, token } = useApi();

  // Link "Admin" só aparece para super-admin (flag do /users/me).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<{ isSuperAdmin?: boolean }>("/users/me")
      .then((p) => active && setIsAdmin(!!p.isSuperAdmin))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchApi, token]);

  const items = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : navItems;

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
    <div className="flex flex-col h-full text-white/60">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-8">
        <LemonLogo size={30} className="shrink-0" />
        {!collapsed && (
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-white tracking-tight">
            LemonFin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm tracking-wide transition-all duration-150",
                active
                  ? "bg-[#6C5CE7] font-semibold text-white shadow-[0_8px_22px_rgba(108,92,231,0.40)]"
                  : "text-white/55 hover:text-white hover:bg-white/[0.07]",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-2 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-white/55 hover:text-white hover:bg-white/[0.07] transition-all duration-150 w-full cursor-pointer",
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
            "hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-white/55 hover:text-white hover:bg-white/[0.07] transition-all duration-150 w-full cursor-pointer",
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
          "px-4 py-4",
          collapsed && "px-2"
        )}
      >
        {session?.user && (
          <div
            className={cn(
              "flex items-center gap-2.5",
              collapsed && "justify-center"
            )}
          >
            <div className="w-[32px] h-[32px] rounded-full bg-[#6C5CE7] flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">
                {(session.user.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {session.user.name}
                </p>
                <p className="text-[11px] text-white/45 truncate">
                  {session.user.email}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-white/45 hover:text-danger transition-colors cursor-pointer"
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
          "hidden md:flex flex-col bg-shell-sidebar rounded-[28px] transition-[width] duration-200 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[220px] bg-shell-sidebar transform transition-transform duration-200 ease-in-out md:hidden",
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
