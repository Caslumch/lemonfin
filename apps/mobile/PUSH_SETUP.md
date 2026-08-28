# Push notifications — setup

O código do app já registra o device e trata os pushes. Faltam passos que
dependem de contas externas (Expo/Firebase/Apple) e **não** podem ser feitos só
no código. Push **não funciona no Expo Go** — precisa de um build (dev/preview).

## 1. Linkar o projeto no EAS (obrigatório)

```bash
cd apps/mobile
eas init
```

Isso cria o projeto na sua conta Expo e escreve `extra.eas.projectId` no
`app.json`. Sem esse `projectId` o app não consegue emitir o token de push
(a função `registerDevice` faz no-op e loga um aviso). **Commite** o `app.json`
atualizado.

## 2. Android (testável de graça no S23) — FCM

O Expo entrega push no Android via **FCM (Firebase)**. Passos:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/) (grátis).
2. Adicione um app Android com o package `ai.adalink.lemonfin`.
3. Baixe o `google-services.json`.
4. Suba a credencial FCM V1 pro Expo:
   ```bash
   eas credentials
   # Android → Push Notifications → forneça o google-services.json / service account
   ```
   (ou o EAS pede isso automaticamente no primeiro build de push).
5. Gere o APK e instale no S23:
   ```bash
   pnpm mobile:apk          # eas build -p android --profile preview
   ```

## 3. iOS (precisa do Apple Developer $99) — APNs

Push no iOS exige uma **APNs Key**, que só existe com o Apple Developer Program.
Enquanto não houver a conta, o código fica pronto mas o iPhone não recebe push.
Quando tiver:

```bash
eas credentials   # iOS → Push Notifications → gerar/So subir a APNs Key
pnpm mobile:build:ios
```

## 4. Testar

Com o app (build) instalado e logado:

1. Configurações → **Notificações no celular** deve estar ligado (pede permissão
   do SO na primeira vez).
2. Envie um teste pelo [Expo Push Tool](https://expo.dev/notifications) colando o
   Expo push token do device, **ou** aguarde os crons de lembrete (09:00 e 08:00
   BRT) — os lembretes de vencimento e o resumo diário saem também por push
   (premium; trial conta).
3. Tap na notificação abre o extrato (lembrete de conta) ou a home (resumo).

## Como funciona no código

- `src/lib/push.ts` — permissão, obtenção do Expo token, `POST/DELETE /devices`.
- `src/providers/push-provider.tsx` — registra ao logar, dá baixa no logout,
  handler de foreground e roteamento no tap.
- `src/components/push-notification-setting.tsx` — toggle de opt-out.
- Backend: `POST/DELETE /devices` + canal `push` nos lembretes (PR da API).
