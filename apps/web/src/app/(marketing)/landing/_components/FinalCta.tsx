import { ArrowRight } from "lucide-react";
import { Button } from "./ds";
import { CTA_URL } from "./shared";

export function FinalCta() {
  return (
    <section style={{ background: "var(--bg-content)", padding: "0 0 96px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "var(--radius-3xl)",
            background: "radial-gradient(120% 120% at 80% 0%, #1E1E24, #0D0D0D 60%)",
            padding: "clamp(40px, 6vw, 72px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: -80,
              left: "20%",
              width: 360,
              height: 360,
              background: "radial-gradient(circle, rgba(212,244,0,0.18), transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(30px, 4vw, 48px)",
                letterSpacing: "-0.03em",
                color: "#fff",
                textWrap: "balance",
              }}
            >
              Comece a organizar seu dinheiro
              <br />
              ainda hoje, no seu WhatsApp.
            </h2>
            <p
              style={{
                margin: "18px auto 0",
                maxWidth: 480,
                fontSize: 17,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.6,
              }}
            >
              Sem planilha, sem app pra instalar. Só mandar uma mensagem.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
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
                Começar por R$ 14,90/mês
              </Button>
            </div>
            <div
              style={{ marginTop: 16, fontSize: 13.5, color: "rgba(255,255,255,0.5)" }}
            >
              7 dias de garantia · cancele quando quiser
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
