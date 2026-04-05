"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, Copy, LogOut, Plus, KeyRound, Loader2, Crown, UserCheck } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Family {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: FamilyMember[];
}

export default function ConfiguracoesPage() {
  const { fetchApi } = useApi();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  // Create form
  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Leave
  const [leaving, setLeaving] = useState(false);

  const fetchFamily = useCallback(async () => {
    try {
      const data = await fetchApi<Family | null>("/families/me");
      setFamily(data);
    } catch {
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    setCreating(true);
    try {
      await fetchApi("/families", {
        method: "POST",
        body: JSON.stringify({ name: familyName.trim() }),
      });
      toast.success("Familia criada com sucesso!");
      setFamilyName("");
      fetchFamily();
    } catch {
      toast.error("Erro ao criar familia");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await fetchApi("/families/join", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      toast.success("Voce entrou na familia!");
      setJoinCode("");
      fetchFamily();
    } catch {
      toast.error("Codigo invalido ou voce ja faz parte de uma familia");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      await fetchApi("/families/leave", { method: "DELETE" });
      toast.success("Voce saiu da familia");
      setFamily(null);
    } catch {
      toast.error("Erro ao sair da familia. Donos nao podem sair.");
    } finally {
      setLeaving(false);
    }
  }

  function copyCode() {
    if (!family) return;
    navigator.clipboard.writeText(family.code);
    toast.success("Codigo copiado!");
  }

  const roleLabel: Record<string, string> = {
    OWNER: "Dono",
    ADMIN: "Admin",
    MEMBER: "Membro",
  };

  return (
    <>
      <ContentHeader title="Configuracoes" />

      <div className="p-5 md:p-7 space-y-6 max-w-2xl">
        {/* Family section */}
        <div className="rounded-lg border border-border bg-surface p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <Users size={18} className="text-lima" />
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
              Familia
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-fg-muted" />
            </div>
          ) : family ? (
            /* Has family */
            <div className="space-y-5">
              {/* Family name + code */}
              <div>
                <p className="text-sm text-fg-muted mb-1">Nome da familia</p>
                <p className="text-fg font-medium">{family.name}</p>
              </div>

              <div>
                <p className="text-sm text-fg-muted mb-2">Codigo de convite</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-muted px-4 py-2.5 font-[family-name:var(--font-mono)] text-sm text-fg tracking-widest text-center">
                    {family.code}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyCode} title="Copiar codigo">
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs text-fg-muted mt-1.5">
                  Compartilhe este codigo para convidar alguem
                </p>
              </div>

              {/* Members */}
              <div>
                <p className="text-sm text-fg-muted mb-2">
                  Membros ({family.members.length})
                </p>
                <div className="space-y-2">
                  {family.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-page px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {member.role === "OWNER" ? (
                          <Crown size={14} className="text-lima" />
                        ) : (
                          <UserCheck size={14} className="text-fg-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg font-medium truncate">
                          {member.user.name}
                        </p>
                        <p className="text-xs text-fg-muted truncate">
                          {member.user.email}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          member.role === "OWNER"
                            ? "bg-lima/15 text-lima"
                            : "bg-muted text-fg-muted"
                        )}
                      >
                        {roleLabel[member.role]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave button (only for non-owners) */}
              {currentUserId && family.ownerId !== currentUserId && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-2" />
                      Saindo...
                    </>
                  ) : (
                    <>
                      <LogOut size={14} className="mr-2" />
                      Sair da familia
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            /* No family */
            <div className="space-y-6">
              {/* Create */}
              <div>
                <p className="text-sm text-fg-muted mb-3">
                  Crie uma familia para compartilhar seus dados financeiros
                </p>
                <form onSubmit={handleCreate} className="flex gap-2">
                  <Input
                    id="familyName"
                    placeholder="Nome da familia"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={creating} className="shrink-0">
                    {creating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={16} className="mr-1" />
                        Criar
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-fg-muted">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Join */}
              <div>
                <p className="text-sm text-fg-muted mb-3">
                  Entre em uma familia existente com um codigo de convite
                </p>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <Input
                    id="joinCode"
                    placeholder="Codigo de 8 caracteres"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().slice(0, 8))
                    }
                    className="tracking-widest text-center font-[family-name:var(--font-mono)]"
                    maxLength={8}
                    required
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={joining || joinCode.length !== 8}
                    className="shrink-0"
                  >
                    {joining ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <KeyRound size={16} className="mr-1" />
                        Entrar
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
