// URL pública do site (páginas legais). Configurável via EXPO_PUBLIC_WEB_URL;
// default = domínio Vercel em produção. Trocar quando o domínio custom
// (app.lemonfin.com.br) estiver no ar.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://lemonfin-web.vercel.app";

export const PRIVACY_URL = `${WEB_URL}/privacidade`;
export const TERMS_URL = `${WEB_URL}/termos`;
