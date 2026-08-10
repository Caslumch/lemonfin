import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "./auth-provider";

// Ordem importa: QueryClient por fora (AuthProvider usa useQueryClient para
// limpar o cache no logout).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
