import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@lemonfin/shared"],
};

// withSentryConfig habilita a instrumentação de build do Sentry. Sem as envs de
// org/projeto (SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN) o upload de source
// maps é pulado — o build funciona normalmente; só não sobe os maps.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});
