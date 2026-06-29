import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        directToken: {},
        userId: {},
        name: {},
      },
      async authorize(credentials) {
        // Token mode: the caller already authenticated (incl. 2FA) against
        // the API and has an access token. We must NOT trust the id/name/email
        // sent by the client — anyone could forge a session with an arbitrary
        // identity. Validate the token against the API and derive identity from
        // /users/me. An invalid/expired token makes the call 401 → login fails.
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as { accessToken: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      (session as unknown as { accessToken: string }).accessToken =
        token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
