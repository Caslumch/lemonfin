import { QueryClient } from "@tanstack/react-query";

// Config alinhada ao web (providers/query-provider): dados financeiros toleram
// 30s de "stale"; 1 retry. refetchOnWindowFocus não existe no RN — usamos
// refetchOnReconnect e o AppState (ver hooks) quando necessário.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});
