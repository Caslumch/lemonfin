"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHead } from "./primitives";

const FAQS = [
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O LemonFin funciona inteiro pelo WhatsApp. Você também tem um painel no navegador para ver relatórios e metas, mas o dia a dia é todo na conversa — sem baixar nada.",
  },
  {
    q: "Como o registro por áudio funciona?",
    a: "Você manda um áudio falando naturalmente, tipo “gastei 45 no almoço”. A IA entende, identifica o valor, a categoria e registra na hora. Funciona também por texto.",
  },
  {
    q: "A categorização é automática mesmo?",
    a: "Sim. Cada gasto chega já classificado por categoria (Alimentação, Transporte, Moradia…). Com o tempo, o sistema aprende seus hábitos e fica ainda mais preciso.",
  },
  {
    q: "Posso compartilhar a conta com outras pessoas?",
    a: "Pode. Na conta compartilhada, família, casal ou sócios lançam pelo próprio WhatsApp e tudo converge para o mesmo painel — sem ninguém compartilhar senha.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Operamos com criptografia de ponta a ponta e conformidade com a LGPD. Seus dados financeiros não são compartilhados com terceiros.",
  },
  {
    q: "E se eu não gostar?",
    a: "Você tem 7 dias de garantia incondicional. Se não for pra você, devolvemos 100% do valor — sem burocracia.",
  },
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "22px 4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ fontSize: 16.5, fontWeight: 600, color: "var(--text-primary)" }}>
          {q}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: "var(--radius-full)",
            background: open ? "var(--lemon-400)" : "var(--surface-inset)",
            color: "var(--text-primary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform var(--duration-base) var(--ease-out)",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <ChevronDown size={17} />
        </span>
      </button>
      {open && (
        <p
          style={{
            margin: "0 4px 22px",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: 680,
            textWrap: "pretty",
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" style={{ background: "var(--bg-content)", padding: "96px 0" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 28px" }}>
        <SectionHead
          align="center"
          eyebrow="Tire suas dúvidas"
          title="Perguntas frequentes"
          max={620}
        />
        <div style={{ marginTop: 40 }}>
          {FAQS.map((f, i) => (
            <FaqItem
              key={i}
              q={f.q}
              a={f.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
