import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackHeader } from "@/components/ui/stack-header";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DeleteAccountSheet } from "@/components/delete-account-sheet";
import { exportUserData } from "@/lib/export-data";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import {
  type BillingStatus,
  useBillingStatus,
  useChangePassword,
  useFamily,
  useMe,
} from "@/hooks/use-financial-data";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";
import { formatDateBR } from "@/lib/format";

function planLabel(b?: BillingStatus): string {
  if (!b) return "—";
  if (b.coveredByFamily) return "Coberto pela família";
  if (b.hasPremiumAccess) return b.status === "TRIALING" ? "Período de teste" : "Ativo";
  return "Inativo";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 8 }}>
      {children}
    </Txt>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
      <Txt variant="small" color={palette.textTertiary}>{label}</Txt>
      <Txt variant="small" style={{ flex: 1, textAlign: "right" }} numberOfLines={1}>{value}</Txt>
    </View>
  );
}

function LinkRow({ label, url, first }: { label: string; url: string; first?: boolean }) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}
    >
      <Txt variant="bodyMedium">{label}</Txt>
      <Ionicons name="open-outline" size={16} color={palette.textTertiary} />
    </Pressable>
  );
}

export default function ConfiguracoesScreen() {
  const { palette } = useTheme();
  const { user } = useAuth();
  const me = useMe();
  const billing = useBillingStatus();
  const family = useFamily();
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserData();
    } catch (e) {
      Alert.alert("Não foi possível exportar", (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function submitPassword() {
    if (!current || next.length < 8) {
      Alert.alert("Campos inválidos", "Informe a senha atual e a nova (8+ caracteres).");
      return;
    }
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent("");
          setNext("");
          Alert.alert("Pronto", "Senha alterada com sucesso.");
        },
        onError: (e) => Alert.alert("Não foi possível", (e as Error).message),
      },
    );
  }

  const fam = family.data;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Configurações" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Conta */}
        <View>
          <SectionLabel>Conta</SectionLabel>
          <Card style={{ gap: 2 }}>
            <InfoRow label="Nome" value={me.data?.name ?? user?.name ?? "—"} />
            <InfoRow label="E-mail" value={me.data?.email ?? user?.email ?? "—"} />
            {me.data?.phone ? <InfoRow label="Telefone" value={me.data.phone} /> : null}
          </Card>
        </View>

        {/* Assinatura */}
        <View>
          <SectionLabel>Assinatura</SectionLabel>
          <Card style={{ gap: 2 }}>
            <InfoRow label="Status" value={planLabel(billing.data)} />
            {billing.data?.trialEndsAt ? (
              <InfoRow label="Teste até" value={formatDateBR(billing.data.trialEndsAt)} />
            ) : null}
            {billing.data?.currentPeriodEnd ? (
              <InfoRow label="Renova em" value={formatDateBR(billing.data.currentPeriodEnd)} />
            ) : null}
            <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 6 }}>
              Gerencie seu plano pela sua conta no site do LemonFin.
            </Txt>
          </Card>
        </View>

        {/* Família */}
        <View>
          <SectionLabel>Família</SectionLabel>
          <Card style={{ gap: 6 }}>
            {fam ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Txt variant="bodyMedium">{fam.name}</Txt>
                  <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={palette.textSecondary}>{fam.code}</Txt>
                </View>
                {fam.members.map((m) => (
                  <View key={m.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Txt variant="small" numberOfLines={1} style={{ flex: 1 }}>{m.user.name}</Txt>
                    <Txt variant="small" color={palette.textTertiary}>{m.role.toLowerCase()}</Txt>
                  </View>
                ))}
              </>
            ) : (
              <Txt variant="small" color={palette.textTertiary}>
                Você não faz parte de uma família. Crie ou entre numa pelo app web.
              </Txt>
            )}
          </Card>
        </View>

        {/* Segurança */}
        <View>
          <SectionLabel>Trocar senha</SectionLabel>
          <Card style={{ gap: 12 }}>
            <TextField label="Senha atual" value={current} onChangeText={setCurrent} secureTextEntry placeholder="••••••••" />
            <TextField label="Nova senha" value={next} onChangeText={setNext} secureTextEntry placeholder="Mínimo 8 caracteres" />
            <Button label="Salvar nova senha" onPress={submitPassword} loading={changePassword.isPending} disabled={!current || next.length < 8} />
          </Card>
        </View>

        {/* Meus dados (LGPD — portabilidade) */}
        <View>
          <SectionLabel>Meus dados</SectionLabel>
          <Card style={{ gap: 12 }}>
            <Txt variant="small" color={palette.textSecondary}>
              Baixe uma cópia de todos os seus dados (transações, cartões, metas,
              reservas…) em JSON.
            </Txt>
            <Button label="Exportar meus dados" variant="outline" onPress={handleExport} loading={exporting} />
          </Card>
        </View>

        {/* Zona de perigo — exclusão de conta (LGPD) */}
        <View>
          <SectionLabel>Zona de perigo</SectionLabel>
          <Card style={{ gap: 12 }}>
            <Txt variant="small" color={palette.textSecondary}>
              Excluir sua conta apaga permanentemente todos os seus dados.
            </Txt>
            <Button label="Excluir conta" variant="danger" onPress={() => setDeleting(true)} />
          </Card>
        </View>

        {/* Legal */}
        <View>
          <SectionLabel>Legal</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            <LinkRow label="Política de Privacidade" url={PRIVACY_URL} first />
            <LinkRow label="Termos de Uso" url={TERMS_URL} />
          </Card>
        </View>
      </ScrollView>
      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </View>
  );
}
