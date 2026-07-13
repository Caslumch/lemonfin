import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// IMPORTANTE: o proxy usa o WRAPPER `auth(fn)` do NextAuth (não `await auth()`
// solto). Quando o access token vence, o callback jwt renova a sessão AQUI no
// proxy — e só o wrapper propaga o Set-Cookie do token rotacionado para a
// resposta. Com `await auth()` + resposta própria, o cookie novo era
// DESCARTADO: o navegador reapresentava o refresh token velho para sempre e,
// passada a janela de graça, a sessão caía (usuário deslogado ao voltar de
// manhã, mesmo com sessão renovável).
export const proxy = auth((request) => {
  const session = request.auth;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    // Recuperação de senha: o usuário está deslogado, então precisa ser
    // acessível sem sessão. Tratada como página de auth para que um usuário
    // já logado seja levado para a home (não faz sentido "esquecer a senha"
    // estando autenticado).
    request.nextUrl.pathname.startsWith("/esqueci-senha");

  // Rotas públicas de marketing (landing) e jurídicas (privacidade/termos/
  // exclusão de conta) — acessíveis sem login. As páginas legais precisam ser
  // públicas: são lidas antes do cadastro e por buscadores/lojas de app (o
  // Google Play exige um link WEB de exclusão de conta no Data safety form).
  const isPublicPage =
    request.nextUrl.pathname.startsWith("/landing") ||
    request.nextUrl.pathname.startsWith("/privacidade") ||
    request.nextUrl.pathname.startsWith("/termos") ||
    request.nextUrl.pathname.startsWith("/excluir-conta");

  if (!session && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
