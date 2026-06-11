import type { ReactNode } from "react";
import { TrendingUp, Wallet } from "lucide-react";
import { Card, StatCard, TransactionRow, Badge, Avatar } from "./ds";
import { SectionHead, CheckItem, PhoneChat } from "./primitives";

function FeatureRow({
  id,
  eyebrow,
  title,
  sub,
  bullets,
  visual,
  flip,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  sub: string;
  bullets?: string[];
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div
      id={id}
      className="lf-feat-row"
      style={{
        maxWidth: 1140,
        margin: "0 auto",
        padding: "0 28px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 64,
        alignItems: "center",
      }}
    >
      <div
        className={flip ? "lf-feat-text-flip" : undefined}
        style={{ order: flip ? 2 : 1 }}
      >
        <SectionHead eyebrow={eyebrow} title={title} sub={sub} max={520} />
        {bullets && (
          <ul
            style={{
              margin: "26px 0 0",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {bullets.map((b, i) => (
              <CheckItem key={i}>{b}</CheckItem>
            ))}
          </ul>
        )}
      </div>
      <div
        className={flip ? "lf-feat-visual-flip" : undefined}
        style={{ order: flip ? 1 : 2, display: "flex", justifyContent: "center" }}
      >
        {visual}
      </div>
    </div>
  );
}

/* ---- visual: WhatsApp capture (phone) ------------------------------------- */
function CaptureVisual() {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: "-30px -10px",
          background:
            "radial-gradient(circle at 50% 40%, var(--lemon-100), transparent 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
      <PhoneChat style={{ position: "relative", zIndex: 1 }} />
    </div>
  );
}

/* ---- visual: painel financeiro (dashboard) -------------------------------- */
function PainelVisual() {
  return (
    <Card radius="2xl" padding={20} shadow="lg" style={{ width: "100%", maxWidth: 480 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}
        >
          Painel
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>Junho 2026</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <StatCard
          label="Entradas"
          value="R$ 4.200"
          valueColor="success"
          iconTone="success"
          icon={<TrendingUp size={22} />}
          style={{ padding: 14 }}
        />
        <StatCard
          tone="dark"
          label="Saldo"
          value="R$ 4.067"
          icon={<Wallet size={22} />}
          style={{ padding: 14 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TransactionRow
          title="Almoço iFood"
          category="alimentacao"
          categoryLabel="Alimentação"
          amount={45}
          type="expense"
          style={{ padding: "11px 14px" }}
        />
        <TransactionRow
          title="Salário"
          category="salario"
          categoryLabel="Salário"
          amount={4200}
          type="income"
          style={{ padding: "11px 14px" }}
        />
        <TransactionRow
          title="Uber"
          category="transporte"
          categoryLabel="Transporte"
          amount={24.9}
          type="expense"
          style={{ padding: "11px 14px" }}
        />
      </div>
    </Card>
  );
}

/* ---- visual: metas & categorias ------------------------------------------- */
function GoalBar({
  label,
  pct,
  value,
  color,
}: {
  label: string;
  pct: number;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 7,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 9,
          borderRadius: "var(--radius-full)",
          background: "var(--surface-inset)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-full)",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function MetasVisual() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        maxWidth: 460,
      }}
    >
      <Card radius="2xl" padding={22} shadow="lg">
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 18,
          }}
        >
          Suas metas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <GoalBar
            label="Reserva de emergência"
            pct={72}
            value="R$ 7.200 / 10.000"
            color="var(--lemon-400)"
          />
          <GoalBar
            label="Viagem"
            pct={45}
            value="R$ 1.350 / 3.000"
            color="var(--grape-500)"
          />
          <GoalBar
            label="Gastos com comida"
            pct={88}
            value="R$ 612 / 700"
            color="var(--warning)"
          />
        </div>
      </Card>
      <Card radius="2xl" padding={20} shadow="md">
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 12,
          }}
        >
          Por categoria
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Badge category="alimentacao">Alimentação · R$ 612</Badge>
          <Badge category="transporte">Transporte · R$ 240</Badge>
          <Badge category="moradia">Moradia · R$ 1.500</Badge>
          <Badge category="lazer">Lazer · R$ 180</Badge>
        </div>
      </Card>
    </div>
  );
}

/* ---- conta compartilhada (full band) -------------------------------------- */
function SharedSection() {
  const people = [
    { n: "Ana", r: "Você" },
    { n: "Bruno", r: "Cônjuge" },
    { n: "Marina", r: "Filha" },
    { n: "Pedro", r: "Sócio" },
  ];
  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
      <Card
        radius="3xl"
        padding={48}
        tone="dark"
        shadow="lg"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 280,
            height: 280,
            background: "radial-gradient(circle, rgba(108,92,231,0.3), transparent 70%)",
            filter: "blur(10px)",
          }}
        />
        <div
          className="lf-shared-grid"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div>
            <SectionHead
              dark
              eyebrow="Conta compartilhada"
              title="Uma conta. Toda a família no mesmo painel."
              sub="Cada pessoa registra os gastos pelo próprio WhatsApp e tudo converge para um só lugar. Você mantém a visão completa — sem compartilhar senha."
              max={460}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              justifyContent: "center",
            }}
          >
            {people.map((p) => (
              <div
                key={p.n}
                style={{
                  width: 130,
                  padding: "20px 14px",
                  borderRadius: "var(--radius-xl)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}
              >
                <Avatar name={p.n} size="lg" style={{ margin: "0 auto 10px" }} />
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14.5 }}>{p.n}</div>
                <div style={{ color: "var(--text-on-dark-muted)", fontSize: 12.5 }}>
                  {p.r}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" style={{ background: "var(--bg-content)", padding: "96px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 110 }}>
        <FeatureRow
          eyebrow="Registrar gastos"
          title="Anote seus gastos por áudio ou texto."
          sub="Manda um áudio do jeito que você fala. O LemonFin entende, categoriza sozinho e te devolve organizado — em segundos, sem abrir nenhum app."
          bullets={[
            "Consulte qualquer gasto pelo WhatsApp",
            "Tudo já chega categorizado",
            "Resumo do dia direto pra você",
          ]}
          visual={<CaptureVisual />}
          flip
        />
        <FeatureRow
          id="painel"
          eyebrow="Seu painel financeiro"
          title="Seu dinheiro organizado num só painel."
          sub="Gastos, cartões e metas num dashboard limpo. Você sempre sabe o que entrou, o que saiu e quanto pode gastar."
          bullets={[
            "Gastos separados por categoria",
            "Acompanhe metas e limites",
            "Exporte seus dados quando quiser",
          ]}
          visual={<PainelVisual />}
        />
        <FeatureRow
          id="metas"
          eyebrow="Metas & categorias"
          title="Defina metas e veja se está cumprindo."
          sub="Crie metas por objetivo e acompanhe a evolução. O LemonFin avisa quando você está chegando perto do limite de uma categoria."
          bullets={[
            "Metas por objetivo, no seu ritmo",
            "Alertas de limite por categoria",
            "Comparativo mês a mês",
          ]}
          visual={<MetasVisual />}
          flip
        />
        <SharedSection />
      </div>
    </section>
  );
}
