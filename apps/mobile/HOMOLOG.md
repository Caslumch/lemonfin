# Homologação — app instalável no celular (sem Expo Go, sem loja)

Objetivo: ter o LemonFin **standalone** (JS empacotado, roda sem Metro/sem
expor) instalado no **S23** e no **iPhone 15**, sem publicar nas lojas.

O app aponta pra **API de produção** (`EXPO_PUBLIC_API_URL`), então o build
instalado funciona sozinho — não precisa de backend local.

Perfil usado: `preview` do `eas.json` (`distribution: internal`).

---

## Pré-requisito (uma vez)

```bash
npm i -g eas-cli
eas login                                # conta Expo (grátis)
pnpm --filter mobile exec eas init       # cria o projeto EAS e grava extra.eas.projectId
```

---

## 🤖 Android (S23) — grátis e permanente

Gera um **APK** pra instalar direto no aparelho (não precisa de Google Play):

```bash
pnpm mobile:apk
# = eas build --platform android --profile preview
```

- O build roda na nuvem (~10–15 min). No fim, o EAS mostra um **link/QR**.
- Abra o link no **S23** → baixe o `.apk` → instale (pode pedir pra permitir
  "instalar apps de fontes desconhecidas").
- Pronto: app com ícone lima, standalone, apontando pra produção.

Pra atualizar depois de mexer no código: rode `pnpm mobile:apk` de novo e
reinstale o novo APK (ou use EAS Update/OTA no futuro).

---

## 🍎 iPhone 15 — precisa de assinatura Apple

A Apple exige assinatura pra instalar em iPhone físico. Duas formas:

### A) Grátis (Apple ID normal + Xcode) — expira em 7 dias

Precisa do **Mac com Xcode** e o iPhone **plugado via cabo**.

```bash
pnpm mobile:ios-device
# = expo run:ios --device --configuration Release
```

- Na 1ª vez o Xcode pede pra escolher um **Team** → use seu Apple ID pessoal
  (Xcode ▸ Settings ▸ Accounts ▸ adicionar Apple ID → "Personal Team").
- Compila em **Release** (JS embutido → roda **sem Metro**) e instala no iPhone.
- No iPhone: Ajustes ▸ Geral ▸ **VPN e Gerenciamento de Dispositivos** →
  confie no seu certificado de desenvolvedor.
- ⚠️ **Caduca a cada 7 dias** (é rodar o comando de novo). Máx. 3 apps por
  Apple ID grátis.

### B) US$ 99/ano (Apple Developer) — por link, sem cabo, dura o ano

Com a conta paga, o EAS faz o build assinado e você instala por link (igual ao
Android). Registre o device na 1ª vez (o EAS pergunta):

```bash
pnpm --filter mobile exec eas device:create   # registra o UDID do iPhone (1ª vez)
pnpm mobile:build:ios                          # eas build -p ios --profile preview
```

- Instala pelo Safari via link, **permanente** (renova junto com a assinatura).
- É também o caminho pra **TestFlight** e, depois, a **App Store**.

---

## Resumo

| Aparelho | Comando | Custo | Duração |
|---|---|---|---|
| S23 (Android) | `pnpm mobile:apk` | grátis | permanente |
| iPhone 15 (grátis) | `pnpm mobile:ios-device` | grátis | 7 dias (renovar) |
| iPhone 15 (pago) | `pnpm mobile:build:ios` | US$ 99/ano | 1 ano |

> `eas.json` e `app.json` (ícone/splash/bundle id `ai.adalink.lemonfin`) já estão
> configurados — ver `README.md`.
