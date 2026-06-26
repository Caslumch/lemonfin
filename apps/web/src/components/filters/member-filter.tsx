"use client";

import { Users } from "lucide-react";
import { Select } from "@/components/ui/select";
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
    <Select
      value={memberId ?? ""}
      onChange={(v) => setMemberId(v || undefined)}
      aria-label="Filtrar por membro da família"
      size="md"
      icon={<Users size={16} />}
      className="sm:w-48"
      options={[
        { value: "", label: "Toda a família" },
        ...members.map((m) => ({
          value: m.user.id,
          label: m.user.name.split(" ")[0],
        })),
      ]}
    />
  );
}
