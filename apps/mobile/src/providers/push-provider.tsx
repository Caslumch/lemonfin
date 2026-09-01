import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import { registerDevice, unregisterDevice } from "@/lib/push";
import { setOnSignOut } from "@/lib/token-store";

// Notificações em foreground também aparecem (banner + som). Definido no nível
// do módulo para valer desde o boot.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Roteia o tap na notificação conforme o `data.type` enviado pelo backend.
function routeFromData(data: unknown) {
  const type = (data as { type?: string } | undefined)?.type;
  if (type === "bill_reminder") router.navigate("/extrato");
  else router.navigate("/");
}

// Registra o device de push ao autenticar e dá baixa no logout. Deve ficar
// DENTRO do AuthProvider (usa `status`).
export function PushProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const registered = useRef(false);

  // Registra uma vez por sessão autenticada; baixa (DELETE) roda no signOut
  // via hook (token ainda válido).
  useEffect(() => {
    if (status === "authenticated" && !registered.current) {
      registered.current = true;
      void registerDevice();
      setOnSignOut(unregisterDevice);
    }
    if (status === "unauthenticated") {
      registered.current = false;
      setOnSignOut(null);
    }
  }, [status]);

  // Tap na notificação (app aberto ou em background).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      routeFromData(res.notification.request.content.data);
    });
    // App aberto A PARTIR de uma notificação (cold start).
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (res) routeFromData(res.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
