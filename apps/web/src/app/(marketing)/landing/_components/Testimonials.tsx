import { Star } from "lucide-react";
import { Card, Avatar } from "./ds";
import { SectionHead } from "./primitives";

/* TODO: depoimentos placeholder — substituir por depoimentos reais antes de publicar */
const ITEMS = [
  {
    n: "Marina R.",
    r: "Autônoma",
    q: "Eu só mando áudio quando gasto e pronto. Nunca mais abri planilha — e finalmente sei pra onde vai meu dinheiro.",
  },
  {
    n: "Carlos T.",
    r: "Designer",
    q: "O resumo diário no WhatsApp mudou meu jogo. Bati minha meta de reserva pela primeira vez na vida.",
  },
  {
    n: "Ana e Bruno",
    r: "Casal",
    q: "A gente divide tudo na mesma conta. Cada um lança pelo próprio Zap e some a bagunça das contas do mês.",
  },
  {
    n: "Júlia M.",
    r: "Estudante",
    q: "Categoriza sozinho, fala em português de verdade e me avisa quando tô estourando o limite. Virou hábito.",
  },
  {
    n: "Rafael S.",
    r: "Freelancer",
    q: "Mando os gastos no fim do dia e o painel já mostra tudo separado. Simples desse jeito.",
  },
  {
    n: "Beatriz L.",
    r: "Empreendedora",
    q: "Conecto meus cartões e consulto saldo sem abrir o app do banco. Economizo um tempo absurdo.",
  },
];

function Stars() {
  return (
    <div style={{ display: "flex", gap: 2, color: "var(--lemon-500)" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ display: "inline-flex" }}>
          <Star size={16} fill="currentColor" stroke="none" />
        </span>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section style={{ background: "var(--bg-content)", padding: "96px 0" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <SectionHead
          align="center"
          eyebrow="Quem usa, recomenda"
          title="Feito pra quem cansou de planilha."
          sub="Histórias de pessoas que passaram a cuidar do dinheiro mandando uma mensagem."
          max={620}
        />
        <div
          className="lf-tst-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
            marginTop: 48,
          }}
        >
          {ITEMS.map((t) => (
            <Card key={t.n} radius="xl" padding={24} shadow="sm" interactive>
              <Stars />
              <p
                style={{
                  margin: "14px 0 20px",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  textWrap: "pretty",
                }}
              >
                “{t.q}”
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={t.n} size="md" />
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
                  >
                    {t.n}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>{t.r}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
