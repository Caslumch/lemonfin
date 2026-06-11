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
        // the API and has a valid access token. Skip re-calling /auth/sign-in.
        if (credentials?.directToken) {
          return {
            id: credentials.userId as string,
            name: (credentials.name as string) ?? null,
            email: (credentials.email as string) ?? null,
            accessToken: credentials.directToken as string,
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
