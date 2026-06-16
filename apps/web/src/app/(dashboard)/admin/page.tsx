"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { useApi } from "@/hooks/use-api";

interface Profile {
  isSuperAdmin?: boolean;
}

/**
 * Área do super-admin (dono da plataforma). A fundação só confirma o acesso;
 * os painéis (usuários, atividade, MRR) entram num PR seguinte.
 *
 * Proteção em camadas: o backend barra /admin/* com SuperAdminGuard (403); aqui
 * é UX — quem não é admin é redirecionado para a home.
 */
export default function AdminPage() {
  const { fetchApi, token } = useApi();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchApi<Profile>("/users/me")
      .then((p) => {
        if (!active) return;
        if (p.isSuperAdmin) setState("ok");
        else {
          setState("denied");
          router.replace("/");
        }
      })
      .catch(() => {
        if (active) {
          setState("denied");
          router.replace("/");
        }
      });
    return () => {
      active = false;
    };
  }, [fetchApi, token, router]);

  if (state !== "ok") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-fg-muted" />
      </div>
    );
  }

  return (
    <>
      <ContentHeader title="Administração" />
      <div className="px-5 pb-8 pt-2 md:px-8 max-w-2xl">
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} className="text-lima" />
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
              Painel do administrador
            </h2>
          </div>
          <p className="text-sm text-fg-secondary">
            Acesso de super-admin confirmado. Os painéis de usuários, atividade e
            assinaturas entram em breve.
          </p>
        </div>
      </div>
    </>
  );
}
