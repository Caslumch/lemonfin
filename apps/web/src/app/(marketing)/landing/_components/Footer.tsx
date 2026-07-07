"use client";

import { LemonMark, CTA_URL, LOGIN_URL } from "./shared";

const COLS: { h: string; links: { label: string; href: string }[] }[] = [
  {
    h: "Produto",
    links: [
      { label: "Recursos", href: "#features" },
      { label: "Painel", href: "#painel" },
      { label: "Metas", href: "#metas" },
      { label: "Planos", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    h: "Conta",
    links: [
      { label: "Entrar", href: LOGIN_URL },
      { label: "Assinar plano", href: CTA_URL },
      { label: "Privacidade", href: "#" },
      { label: "Termos de uso", href: "#" },
    ],
  },
  {
    h: "Suporte",
    links: [
      { label: "Falar no WhatsApp", href: "#" },
      { label: "contato@lemonfin.com", href: "mailto:contato@lemonfin.com" },
    ],
  },
];

const TAGS = ["IA no WhatsApp", "Criptografia"];

export function Footer() {
  return (
    <footer
      style={{
        background: "#0D0D0D",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "64px 0 32px",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <div
          className="lf-foot-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 40,
          }}
        >
          <div>
            <a
              href="#top"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                marginBottom: 16,
              }}
            >
              <LemonMark size={32} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                LemonFin
              </span>
            </a>
            <p
              style={{
                margin: 0,
                maxWidth: 280,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Suas finanças pessoais por IA, organizadas direto no WhatsApp.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {TAGS.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "5px 11px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.h}>
              <div
                style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}
              >
                {c.h}
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                {c.links.map((l) => (
                  <li key={l.label} style={{ listStyle: "none" }}>
                    <a
                      href={l.href}
                      style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.55)",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                      }
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
            © 2026 LemonFin. Todos os direitos reservados.
          </span>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
            Feito com 🍋 no Brasil
          </span>
        </div>
      </div>
    </footer>
  );
}
