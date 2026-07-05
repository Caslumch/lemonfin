# LemonFin — Mobile (Expo / React Native)

App nativo (iOS + Android) que consome a **mesma API NestJS** do web. É um
_companion_ do canal principal (WhatsApp): visualização do painel, transações e
ajustes. Stack: **Expo SDK 54 + Expo Router + NativeWind + TanStack Query + Jotai**.

## Rodando localmente

```bash
# 1. Instalar deps (na raiz do monorepo)
pnpm install

# 2. Alinhar as versões nativas ao SDK do Expo (importante — ajusta ranges)
pnpm --filter mobile exec expo install --fix

# 3. Configurar a URL da API
cp apps/mobile/.env.example apps/mobile/.env
#   iOS simulador:   http://localhost:3001
#   Android emulador: http://10.0.2.2:3001
#   Device físico:   http://<IP-da-sua-máquina>:3001

# 4. Subir a API (noutro terminal)
pnpm --filter api dev

# 5. Iniciar o app
pnpm --filter mobile start      # depois: i (iOS), a (Android)
```

> `expo start` também roda via `pnpm dev` (turbo) junto com api/web.

## Arquitetura

```
app/                       rotas (Expo Router, file-based)
  _layout.tsx              carrega fontes + Providers + Stack
  index.tsx                gate: redireciona por estado de auth
  (auth)/                  login, register  (público)
  (app)/                   tabs protegidas: início, transações, ajustes
src/
  lib/api.ts               fetch client (espelha apps/web/src/lib/api.ts)
  lib/auth.ts              endpoints /auth + SecureStore
  lib/token-store.ts       token em memória p/ o api client (sem ciclo de import)
  providers/auth-provider  sessão (hidrata do SecureStore, 401 → logout)
  hooks/                   React Query sobre a API
  components/ui/           Button, TextField, Screen (design system)
  theme/ + tailwind.config tokens espelhando design-system.md
```

- **Auth:** login via `POST /auth/sign-in` → JWT guardado no **expo-secure-store**.
  O contrato bate com `sign-in.use-case.ts` (`SUCCESS` | `TOTP_REQUIRED`).
- **Dados:** React Query contra a API; nada de dado de servidor no Jotai.
- **Estilo:** NativeWind (Tailwind v3) com os tokens do LemonFin (`primary #D4F400`,
  fontes Outfit / DM Sans / JetBrains Mono via `@expo-google-fonts`).

## Billing "reader-mode" (iOS)

A tela de Ajustes **não** exibe preço/compra — a assinatura é gerenciada no site.
Isso evita o gatilho de In-App Purchase da Apple. Ver issues **#10/#11** e o
`docs/mobile-strategy.md` (a criar).

## Ainda falta (próximas fatias)

- Verificação TOTP (2FA) no login (hoje sinaliza, mas não abre a tela).
- Push notifications (migrar os alertas do `alerts.service`).
- Face ID unlock (`expo-local-authentication`), câmera de comprovante.
- `packages/shared` como fonte dos tipos (issue **#05**).

## Publicação (EAS Build)

O Expo Go é só pra dev — pra ter o app instalável de verdade (TestFlight/Play
interno → lojas) usa-se o **EAS Build** (compila na nuvem, sem precisar de
Xcode local).

Já configurado neste repo:
- `app.json`: ícone (`assets/icon.png`), adaptive icon (Android), splash
  (`assets/splash-icon.png`, fundo `#0D0D0D`), bundle id `ai.adalink.lemonfin`.
- `eas.json`: perfis `development` / `preview` (APK interno) / `production`.

Pré-requisitos (feitos por você, são interativos): conta **Expo**, conta
**Apple Developer** (US$ 99/ano, iOS) e/ou **Google Play** (US$ 25, Android).

Passos:
```bash
npm i -g eas-cli
eas login                 # sua conta Expo
pnpm --filter mobile exec eas init          # cria o projeto EAS (preenche extra.eas.projectId)
pnpm --filter mobile exec eas build -p ios --profile preview     # binário interno p/ testar
pnpm --filter mobile exec eas build -p android --profile preview
# produção + envio pras lojas:
pnpm --filter mobile exec eas build -p ios --profile production
pnpm --filter mobile exec eas submit -p ios
```
Obs.: os ícones/splash só aparecem no **build EAS**, não no Expo Go (que usa o
ícone do próprio Expo Go).

## Notas de monorepo

- `metro.config.js` está configurado para o workspace (watchFolders + nodeModulesPaths).
- O `.npmrc` da raiz usa `shamefully-hoist=true`, o que evita a maioria dos
  problemas de resolução do Metro com pnpm.
