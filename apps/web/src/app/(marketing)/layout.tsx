import type { Metadata } from "next";
import "./landing/landing.css";

export const metadata: Metadata = {
  title: "LemonFin — Suas finanças por IA no WhatsApp",
  description:
    "Fale ou escreva seus gastos no WhatsApp. O LemonFin entende, categoriza e organiza tudo num painel — gastos, cartões e metas, sem planilha e sem esforço.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
