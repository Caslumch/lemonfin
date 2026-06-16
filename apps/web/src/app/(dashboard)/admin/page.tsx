"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Tabs } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
import { OverviewTab } from "./_components/overview-tab";
import { UsersTab } from "./_components/users-tab";
import { AiCostTab } from "./_components/ai-cost-tab";
import { TrendsTab } from "./_components/trends-tab";

interface Profile {
  isSuperAdmin?: boolean;
}

export default function AdminPage() {
  const { fetchApi, token } = useApi();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [tab, setTab] = useState("overview");

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
      .catch((e) => {
        if (!active) return;
        logApiError("admin:guard", e);
        setState("denied");
        router.replace("/");
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
      <div className="px-5 pb-8 pt-2 md:px-8 max-w-3xl">
        <div className="mb-6">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "overview", label: "Visão geral" },
              { value: "users", label: "Usuários" },
              { value: "ai", label: "Custo de IA" },
              { value: "trends", label: "Tendências" },
            ]}
          />
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "ai" && <AiCostTab />}
        {tab === "trends" && <TrendsTab />}
      </div>
    </>
  );
}
