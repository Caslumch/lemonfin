"use client";

import { Users } from "lucide-react";
import { useFamilyMembers } from "@/hooks/use-family";
import { useMemberFilter } from "@/hooks/use-member-filter";

/**
 * Seletor de membro da família. Só aparece quando há 2+ membros — para usuário
 * solo (a maioria) não renderiza nada, mantendo a UI idêntica ao que era.
 *
 * O valor selecionado vai para a URL (?membro=<id>) via useMemberFilter e é
 * lido pelos hooks de dados de cada tela.
 */
export function MemberFilter() {
  const members = useFamilyMembers();
  const { memberId, setMemberId } = useMemberFilter();

  if (members.length < 2) return null;

  return (
    <div className="relative">
      <Users
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted"
      />
      <select
        value={memberId ?? ""}
        onChange={(e) => setMemberId(e.target.value || undefined)}
        aria-label="Filtrar por membro da família"
        className="rounded-[12px] border-[1.5px] border-border bg-surface py-2 pl-10 pr-3.5 text-sm text-fg transition-colors focus:border-fg focus:outline-none cursor-pointer"
      >
        <option value="">Toda a família</option>
        {members.map((m) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name.split(" ")[0]}
          </option>
        ))}
      </select>
    </div>
  );
}
