import type { ReactNode } from "react";
import { Nav } from "../landing/_components/Nav";
import { Footer } from "../landing/_components/Footer";

/**
 * Casca das páginas jurídicas (Privacidade / Termos). Reaproveita o Nav/Footer e
 * os tokens de tema da landing (via .lf-landing) para manter a identidade, com
 * uma coluna de leitura centralizada. Estilos inline para não depender de novas
 * classes no landing.css.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="lf-landing">
      <Nav />
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "96px 28px 80px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "var(--text-tertiary)",
          }}
        >
          Última atualização: {updatedAt}
        </p>

        <div className="lf-legal-prose" style={{ marginTop: 40 }}>
          {children}
        </div>
      </main>
      <Footer />

      {/* Tipografia do corpo do documento — escopada em .lf-legal-prose. */}
      <style>{`
        .lf-legal-prose {
          color: var(--text-secondary);
          font-size: 15.5px;
          line-height: 1.7;
        }
        .lf-legal-prose h2 {
          font-family: var(--font-display);
          font-size: 21px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 40px 0 12px;
          letter-spacing: -0.01em;
        }
        .lf-legal-prose h3 {
          font-size: 16.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 24px 0 8px;
        }
        .lf-legal-prose p { margin: 0 0 14px; }
        .lf-legal-prose ul { margin: 0 0 14px; padding-left: 22px; }
        .lf-legal-prose li { margin: 0 0 8px; }
        .lf-legal-prose strong { color: var(--text-primary); font-weight: 650; }
        .lf-legal-prose a { color: var(--grape-500); text-decoration: underline; }
        .lf-legal-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0 20px;
          font-size: 14px;
        }
        .lf-legal-prose th,
        .lf-legal-prose td {
          text-align: left;
          padding: 10px 12px;
          border: 1px solid var(--border-strong);
          vertical-align: top;
        }
        .lf-legal-prose th {
          background: var(--surface-inset);
          color: var(--text-primary);
          font-weight: 650;
        }
        .lf-legal-note {
          background: var(--surface-inset);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 16px 18px;
          margin: 8px 0 20px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
