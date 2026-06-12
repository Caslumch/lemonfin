import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    // Recuperação de senha: o usuário está deslogado, então precisa ser
    // acessível sem sessão. Tratada como página de auth para que um usuário
    // já logado seja levado para a home (não faz sentido "esquecer a senha"
    // estando autenticado).
    request.nextUrl.pathname.startsWith("/esqueci-senha");

  // Rotas públicas de marketing (landing) — acessíveis sem login.
  const isPublicPage = request.nextUrl.pathname.startsWith("/landing");

  if (!session && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
