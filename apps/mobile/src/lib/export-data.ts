import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "./api";

// Export de dados (LGPD — portabilidade). Busca o JSON completo da conta,
// grava num arquivo temporário e abre a folha de compartilhar (salvar em
// Arquivos, enviar por e-mail, etc.).
export async function exportUserData(): Promise<void> {
  const data = await api<unknown>("/users/me/export");
  const uri = `${FileSystem.cacheDirectory}lemonfin-dados.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      dialogTitle: "Exportar meus dados",
      UTI: "public.json",
    });
  }
}
