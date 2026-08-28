import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "./auth-provider";
import { LockProvider } from "./lock-provider";

// Ordem importa: QueryClient por fora (AuthProvider usa useQueryClient para
// limpar o cache no logout). LockProvider por dentro do Auth (lê `status` e só
// trava conteúdo autenticado).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LockProvider>{children}</LockProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
