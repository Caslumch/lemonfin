import { MessageCircle, Lock, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "./ds";
import { Eyebrow } from "./primitives";
import { CTA_URL } from "./shared";

const INCLUDES = [
  "LemonFin no WhatsApp, ilimitado",
  "Painel financeiro completo",
  "Registro por áudio ou texto",
  "Categorização automática por IA",
  "Metas e alertas de limite",
  "Conta compartilhada",
  "Resumo diário no WhatsApp",
  "Exportação dos seus dados",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        background: "radial-gradient(120% 90% at 50% 0%, #1E1E24, #0D0D0D 60%)",
        padding: "96px 0",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-block", marginBottom: 18 }}>
            <Eyebrow dark>Oferta de lançamento</Eyebrow>
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(28px, 3.4vw, 42px)",
              letterSpacing: "-0.025em",
              color: "#fff",
              textWrap: "balance",
            }}
          >
            Um plano. Tudo incluso.
          </h2>
          <p
            style={{
              margin: "14px auto 0",
              maxWidth: 520,
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            Suas finanças por IA no WhatsApp, sem pegadinha. Cancele quando quiser.
          </p>
        </div>

        <div
          className="lf-price-card"
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1.05fr",
            gap: 0,
            borderRadius: "var(--radius-3xl)",
            overflow: "hidden",
            boxShadow: "var(--shadow-xl)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* left: price */}
          <div
            style={{
              background: "var(--lemon-400)",
              color: "var(--dark)",
              padding: "44px 38px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              Plano LemonFin
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 16 }}
            >
              <span style={{ fontSize: 18, fontWeight: 600 }}>R$</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 64,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                14,99
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.7 }}>/mês</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>
              <s style={{ opacity: 0.5 }}>De R$ 29,90</s> · economize 50%
            </div>
            <div style={{ marginTop: 28 }}>
              <Button
                variant="secondary"
                size="lg"
                block
                pill
                href={CTA_URL}
                iconRight={<MessageCircle size={19} />}
              >
                Começar agora
              </Button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                marginTop: 18,
                fontSize: 12.5,
                fontWeight: 600,
                opacity: 0.75,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Lock size={14} /> Compra segura
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Shield size={14} /> 7 dias de garantia
              </span>
            </div>
          </div>
          {/* right: includes */}
          <div style={{ background: "#141418", padding: "44px 38px" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--text-on-dark-muted)",
                marginBottom: 20,
              }}
            >
              O que está incluso
            </div>
            <ul
              className="lf-incl-grid"
              style={{
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 18px",
              }}
            >
              {INCLUDES.map((it) => (
                <li
                  key={it}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    listStyle: "none",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      color: "var(--lemon-400)",
                      display: "inline-flex",
                      marginTop: 1,
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.4,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {it}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
