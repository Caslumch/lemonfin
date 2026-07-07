const STATS = [
  { k: "Categorização", v: "Automática", d: "A IA classifica cada gasto sozinha" },
  { k: "Resposta", v: "Em segundos", d: "Consulte tudo pelo WhatsApp" },
  { k: "Idioma", v: "100% PT-BR", d: "Entende o jeito que você fala" },
  { k: "Segurança", v: "Criptografados", d: "Em trânsito e em repouso" },
];

export function Proof() {
  return (
    <section style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <div
          className="lf-proof-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}
        >
          {STATS.map((s) => (
            <div key={s.k}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-on-dark-muted)",
                  marginBottom: 8,
                }}
              >
                {s.k}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 30,
                  letterSpacing: "-0.02em",
                  color: "var(--lemon-400)",
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
