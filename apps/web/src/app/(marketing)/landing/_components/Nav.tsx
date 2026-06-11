"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "./ds";
import { LemonMark, CTA_URL, LOGIN_URL } from "./shared";

const LINKS: [string, string][] = [
  ["Recursos", "#features"],
  ["Painel", "#painel"],
  ["Metas", "#metas"],
  ["Planos", "#pricing"],
  ["FAQ", "#faq"],
];

export function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(13,13,13,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <a
          href="#top"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
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
        <nav
          className="lf-nav-links"
          style={{ display: "flex", gap: 4, marginLeft: 18, flex: 1 }}
        >
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                padding: "8px 14px",
                fontSize: 14.5,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href={LOGIN_URL}
          className="lf-nav-login"
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        >
          Entrar
        </a>
        <Button
          variant="primary"
          pill
          href={CTA_URL}
          iconRight={<MessageCircle size={18} />}
        >
          Começar agora
        </Button>
      </div>
    </header>
  );
}
