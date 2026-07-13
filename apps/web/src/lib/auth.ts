import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

// Renova a sessão na API (rotação: o refresh token usado é revogado e um novo
// volta). Falhou = sessão morta (revogada/expirada/reuso detectado) → marca o
// erro para o SessionGuard deslogar o usuário.
async function refreshSession(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token.refreshToken }),
      }
    );
    if (!res.ok) throw new Error(`refresh failed: ${res.status}`);

    const data = await res.json();
    return {
      ...token,
      accessToken: data.token as string,
      refreshToken: data.refreshToken as string,
      accessTokenExpires: new Date(data.tokenExpiresAt as string).getTime(),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        directToken: {},
        refreshToken: {},
        tokenExpiresAt: {},
        userId: {},
        name: {},
      },
      async authorize(credentials) {
        // Token mode: the caller already authenticated (incl. 2FA) against
        // the API and has an access token. We must NOT trust the id/name/email
        // sent by the client — anyone could forge a session with an arbitrary
        // identity. Validate the token against the API and derive identity from
        // /users/me. An invalid/expired token makes the call 401 → login fails.
        // The refreshToken passes through unvalidated here — it's validated by
        // the API on the first /auth/refresh (worst case: session dies in 15m).
        if (credentials?.directToken) {
          const token = credentials.directToken as string;
          const meRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!meRes.ok) return null;

          const me = await meRes.json();
          if (!me?.id) return null;

          return {
            id: me.id as string,
            name: (me.name as string) ?? null,
            email: (me.email as string) ?? null,
            accessToken: token,
            refreshToken: (credentials.refreshToken as string) ?? null,
            accessTokenExpires: credentials.tokenExpiresAt
              ? new Date(credentials.tokenExpiresAt as string).getTime()
              : Date.now(),
          };
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-in`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!res.ok) return null;

        const data = await res.json();

        // With 2FA enabled the API responds TOTP_REQUIRED instead of a token.
        // This path can't complete 2FA, so treat it as a failed authorize;
        // the login page handles the 2FA flow before calling signIn().
        if (data.status === "TOTP_REQUIRED" || !data.token) return null;

        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          accessToken: data.token,
          refreshToken: data.refreshToken ?? null,
          accessTokenExpires: data.tokenExpiresAt
            ? new Date(data.tokenExpiresAt).getTime()
            : Date.now(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login inicial: semeia o token NextAuth com a sessão da API.
      if (user) {
        const u = user as {
          id: string;
          accessToken: string;
          refreshToken: string | null;
          accessTokenExpires: number;
        };
        token.id = u.id;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.accessTokenExpires = u.accessTokenExpires;
        return token;
      }

      // Access ainda válido (folga de 60s para não expirar em voo).
      const expires = (token.accessTokenExpires as number) ?? 0;
      if (Date.now() < expires - 60_000) return token;

      // Sem refresh token (sessão criada antes do deploy do refresh): não há
      // como renovar — marca o erro e o SessionGuard leva ao login.
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" as const };
      }

      return refreshSession(token);
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      (session as unknown as { accessToken: string }).accessToken =
        token.accessToken as string;
      // Exposto para o SessionGuard derrubar a sessão quando o refresh morrer.
      (session as unknown as { error?: string }).error = token.error as
        | string
        | undefined;
      return session;
    },
  },
  events: {
    // Logout também revoga a sessão de longa duração na API (best-effort: se
    // falhar, o token expira sozinho e o lado local já foi limpo).
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const refreshToken = token?.refreshToken as string | undefined;
      if (!refreshToken) return;
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // best-effort
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Vida da SESSÃO = vida do refresh token da API (60d, rotacionado a cada
    // uso — quem usa o app segue logado). O access token (15min) é renovado
    // pelo callback jwt acima; se a renovação falhar (revogado/expirado/roubo
    // detectado), session.error derruba a sessão via SessionGuard.
    maxAge: 60 * 24 * 60 * 60, // 60 dias
  },
});
