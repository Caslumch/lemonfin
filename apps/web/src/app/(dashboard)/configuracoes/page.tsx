"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, Copy, LogOut, Plus, KeyRound, Loader2, Crown, UserCheck, User, Save } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

function phoneToInternational(phone: string | null): string {
  if (!phone) return "";
  return `+${phone}`;
}

export default function ConfiguracoesPage() {
  const { fetchApi } = useApi();
  const { data: session, update: updateSession } = useSession();
  const currentUserId = session?.user?.id;

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(false);

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

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(false);
    try {
      const data = await fetchApi<UserProfile>("/users/me");
      setProfile(data);
      setProfileName(data.name);
      setProfilePhone(phoneToInternational(data.phone));
    } catch (error) {
      logApiError("load:profile", error);
      setProfileError(true);
    } finally {
      setLoadingProfile(false);
    }
  }, [fetchApi]);

  const fetchFamily = useCallback(async () => {
    try {
      const data = await fetchApi<Family | null>("/families/me");
      setFamily(data);
    } catch (error) {
      logApiError("load:family", error);
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchProfile();
    fetchFamily();
  }, [fetchProfile, fetchFamily]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const phoneDigits = profilePhone.replace(/\D/g, "");
      const phone = phoneDigits.length >= 10 ? phoneDigits : null;
      const updated = await fetchApi<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: profileName, phone }),
      });
      setProfile(updated);
      toast.success("Perfil atualizado!");
      // Update session name if changed
      if (updated.name !== session?.user?.name) {
        updateSession({ name: updated.name });
      }
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    setCreating(true);
    try {
      await fetchApi("/families", {
        method: "POST",
        body: JSON.stringify({ name: familyName.trim() }),
      });
      toast.success("Família criada com sucesso!");
      setFamilyName("");
      fetchFamily();
    } catch {
      toast.error("Erro ao criar família");
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
      toast.success("Você entrou na família!");
      setJoinCode("");
      fetchFamily();
    } catch {
      toast.error("Código inválido ou você já faz parte de uma família");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      await fetchApi("/families/leave", { method: "DELETE" });
      toast.success("Você saiu da família");
      setFamily(null);
    } catch {
      toast.error("Erro ao sair da família. Donos não podem sair.");
    } finally {
      setLeaving(false);
    }
  }

  function copyCode() {
    if (!family) return;
    navigator.clipboard.writeText(family.code);
    toast.success("Código copiado!");
  }

  const roleLabel: Record<string, string> = {
    OWNER: "Dono",
    ADMIN: "Admin",
    MEMBER: "Membro",
  };

  return (
    <>
      <ContentHeader title="Configurações" />

      <div className="px-5 pb-8 pt-2 md:px-8 space-y-6 max-w-2xl">
        {/* Profile section */}
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <User size={18} className="text-lima" />
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
              Meu perfil
            </h2>
          </div>

          {loadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-fg-muted" />
            </div>
          ) : profileError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-fg-secondary">
                Não foi possível carregar seu perfil.
              </p>
              <Button variant="outline" size="sm" onClick={fetchProfile}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                id="profileName"
                label="Nome"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />

              <div>
                <label
                  htmlFor="profileEmail"
                  className="block text-sm font-medium text-fg mb-1.5"
                >
                  E-mail
                </label>
                <p className="text-sm text-fg-muted">{profile?.email}</p>
              </div>

              <div className="w-full">
                <label
                  htmlFor="profilePhone"
                  className="block text-sm font-medium text-fg mb-1.5"
                >
                  Telefone
                </label>
                <PhoneInput
                  defaultCountry="br"
                  value={profilePhone}
                  onChange={setProfilePhone}
                  inputClassName="!w-full !rounded-md !border-[1.5px] !border-border !bg-surface !px-3.5 !py-2.5 !text-sm !font-[family-name:var(--font-body)] !text-fg placeholder:!text-fg-muted !transition-colors !duration-150 focus:!border-fg focus:!outline-none"
                  countrySelectorStyleProps={{
                    buttonClassName:
                      "!rounded-l-md !border-[1.5px] !border-border !bg-surface !px-2 !py-2.5 hover:!bg-muted !transition-colors",
                  }}
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} className="mr-2" />
                    Salvar alterações
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Family section */}
        <div className="rounded-[20px] border border-border bg-surface shadow-xs p-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <Users size={18} className="text-lima" />
            <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-fg">
              Família
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
                <p className="text-sm text-fg-muted mb-1">Nome da família</p>
                <p className="text-fg font-medium">{family.name}</p>
              </div>

              <div>
                <p className="text-sm text-fg-muted mb-2">Código de convite</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-[12px] border border-border bg-muted px-4 py-2.5 font-[family-name:var(--font-mono)] text-sm text-fg tracking-widest text-center">
                    {family.code}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyCode} title="Copiar código">
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs text-fg-muted mt-1.5">
                  Compartilhe este código para convidar alguém
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
                      className="flex items-center gap-3 rounded-[12px] border border-border bg-page px-4 py-3"
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
                      Sair da família
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
                  Crie uma família para compartilhar seus dados financeiros
                </p>
                <form onSubmit={handleCreate} className="flex gap-2">
                  <Input
                    id="familyName"
                    placeholder="Nome da família"
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
                  Entre em uma família existente com um código de convite
                </p>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <Input
                    id="joinCode"
                    placeholder="Código de 8 caracteres"
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
