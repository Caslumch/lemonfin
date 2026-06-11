import {
  MessageCircle,
  ArrowRight,
  Zap,
  Check,
  Bell,
  Wallet,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { Button, StatCard, CreditCard, IconButton } from "./ds";
import { PhoneChat, BrowserFrame } from "./primitives";
import { CTA_URL } from "./shared";

const SEALS = ["7 dias de garantia", "Sem instalar app", "100% em português"];

const MARQUEE_ITEMS = [
  "Categorização automática",
  "Conecte seus cartões",
  "Metas que você cumpre",
  "Resumo diário no Zap",
  "Conta compartilhada",
  "100% em português",
  "Registre por áudio",
  "Sem planilha",
];

function Marquee() {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.3)",
        overflow: "hidden",
        padding: "16px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          width: "max-content",
          animation: "lf-marquee 32s linear infinite",
        }}
      >
        {row.map((t, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "0 28px",
              color: "rgba(255,255,255,0.62)",
              fontSize: 15,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--lemon-400)", display: "inline-flex" }}>
              <Sparkles size={15} />
            </span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(120% 80% at 70% -10%, #1E1E24 0%, #0D0D0D 60%)",
      }}
    >
      {/* glow accents */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: "8%",
          width: 360,
          height: 360,
          background: "radial-gradient(circle, rgba(212,244,0,0.18), transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 120,
          right: "4%",
          width: 380,
          height: 380,
          background: "radial-gradient(circle, rgba(108,92,231,0.22), transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="lf-hero-grid"
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "72px 28px 90px",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        {/* copy */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 15px 7px 12px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#25D366", display: "inline-flex" }}>
              <MessageCircle size={15} />
            </span>
            Suas finanças por IA, direto no WhatsApp
          </span>
          <h1
            style={{
              margin: "22px 0 0",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(38px, 5vw, 62px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#fff",
              textWrap: "balance",
            }}
          >
            Controle seu dinheiro
            <br />
            mandando um <span style={{ color: "var(--lemon-400)" }}>áudio.</span>
          </h1>
          <p
            style={{
              margin: "22px 0 0",
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 480,
              textWrap: "pretty",
            }}
          >
            Fale ou escreva seus gastos no WhatsApp. O LemonFin entende, categoriza e
            organiza tudo num painel — gastos, cartões e metas, sem planilha e sem
            esforço.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="primary"
              size="lg"
              pill
              href={CTA_URL}
              iconRight={<ArrowRight size={19} />}
            >
              Começar agora
            </Button>
            <Button
              variant="ghost"
              size="lg"
              pill
              href="#features"
              style={{ color: "#fff", background: "rgba(255,255,255,0.08)" }}
              iconLeft={<Zap size={18} />}
            >
              Ver como funciona
            </Button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 28,
              color: "rgba(255,255,255,0.55)",
              fontSize: 13.5,
              flexWrap: "wrap",
            }}
          >
            {SEALS.map((seal) => (
              <span
                key={seal}
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                <Check size={15} strokeWidth={2.4} style={{ color: "var(--lemon-400)" }} />{" "}
                {seal}
              </span>
            ))}
          </div>
        </div>

        {/* mockup cluster */}
        <div className="lf-hero-mock" style={{ position: "relative", minHeight: 480 }}>
          <BrowserFrame style={{ position: "relative", zIndex: 1 }}>
            <div style={{ background: "var(--bg-content)", padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 18,
                      color: "var(--text-primary)",
                    }}
                  >
                    Olá, Lucas 👋
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    Seu mês em ordem
                  </div>
                </div>
                <IconButton
                  variant="light"
                  size="sm"
                  icon={<Bell size={16} />}
                  ariaLabel="Notificações"
                />
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
              >
                <StatCard
                  tone="dark"
                  label="Saldo total"
                  value="R$ 6.556"
                  icon={<Wallet size={22} />}
                  style={{ padding: 16 }}
                />
                <StatCard
                  label="Economia"
                  value="R$ 1.867"
                  valueColor="success"
                  iconTone="lemon"
                  icon={<PiggyBank size={22} />}
                  style={{ padding: 16 }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <CreditCard
                  balance="R$ 3.265,75"
                  number="**** 2342"
                  exp="05/29"
                  stacked={false}
                />
              </div>
            </div>
          </BrowserFrame>
          <PhoneChat
            style={{
              position: "absolute",
              right: -18,
              bottom: -54,
              zIndex: 2,
              width: 232,
              transform: "scale(0.92)",
            }}
          />
        </div>
      </div>

      <Marquee />
    </section>
  );
}
