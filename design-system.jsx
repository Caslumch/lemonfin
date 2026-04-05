import { useState } from "react";

const TOKENS = {
  colors: {
    primary: { value: "#D4F400", name: "Lima", usage: "CTAs, active states, destaques" },
    primaryHover: { value: "#BDD900", name: "Lima Hover", usage: "Hover em botões primários" },
    primaryMuted: { value: "#D4F40020", name: "Lima Muted", usage: "Backgrounds sutis, badges" },
    dark: { value: "#0D0D0D", name: "Preto", usage: "Texto principal, sidebar" },
    darkSoft: { value: "#1A1A1A", name: "Preto Soft", usage: "Texto secundário forte" },
    gray900: { value: "#2D2D2D", name: "Gray 900", usage: "Ícones, labels" },
    gray600: { value: "#6B6B6B", name: "Gray 600", usage: "Texto auxiliar" },
    gray400: { value: "#9E9E9E", name: "Gray 400", usage: "Placeholders" },
    gray200: { value: "#E5E5E5", name: "Gray 200", usage: "Bordas, dividers" },
    gray100: { value: "#F2F2F2", name: "Gray 100", usage: "Backgrounds de cards" },
    gray50: { value: "#F9F9F9", name: "Gray 50", usage: "Background principal" },
    white: { value: "#FFFFFF", name: "Branco", usage: "Cards, superfícies elevadas" },
    success: { value: "#22C55E", name: "Verde", usage: "Entradas, valores positivos" },
    successMuted: { value: "#22C55E15", name: "Verde Muted", usage: "Background positivo" },
    danger: { value: "#EF4444", name: "Vermelho", usage: "Saídas, alertas, erros" },
    dangerMuted: { value: "#EF444415", name: "Vermelho Muted", usage: "Background negativo" },
    warning: { value: "#F59E0B", name: "Âmbar", usage: "Avisos, limites próximos" },
    warningMuted: { value: "#F59E0B15", name: "Âmbar Muted", usage: "Background de aviso" },
  },
  typography: {
    display: { size: "48px", weight: 700, lineHeight: 1.1, font: "'Outfit', sans-serif" },
    h1: { size: "32px", weight: 700, lineHeight: 1.2, font: "'Outfit', sans-serif" },
    h2: { size: "24px", weight: 600, lineHeight: 1.3, font: "'Outfit', sans-serif" },
    h3: { size: "18px", weight: 600, lineHeight: 1.4, font: "'Outfit', sans-serif" },
    body: { size: "15px", weight: 400, lineHeight: 1.6, font: "'DM Sans', sans-serif" },
    bodyMedium: { size: "15px", weight: 500, lineHeight: 1.6, font: "'DM Sans', sans-serif" },
    small: { size: "13px", weight: 400, lineHeight: 1.5, font: "'DM Sans', sans-serif" },
    caption: { size: "11px", weight: 600, lineHeight: 1.4, font: "'DM Sans', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" },
    mono: { size: "14px", weight: 500, lineHeight: 1.5, font: "'JetBrains Mono', monospace" },
  },
  spacing: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
  radii: { sm: "6px", md: "10px", lg: "14px", xl: "20px", full: "9999px" },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.04)",
    md: "0 2px 8px rgba(0,0,0,0.06)",
    lg: "0 4px 16px rgba(0,0,0,0.08)",
    xl: "0 8px 32px rgba(0,0,0,0.10)",
  },
};

const sections = [
  "cores", "tipografia", "espacamento", "componentes", "cards", "graficos", "sidebar", "dashboard"
];

export default function DesignSystem() {
  const [activeSection, setActiveSection] = useState("cores");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .fade-in-delay-1 { animation-delay: 0.05s; opacity: 0; }
        .fade-in-delay-2 { animation-delay: 0.1s; opacity: 0; }
        .fade-in-delay-3 { animation-delay: 0.15s; opacity: 0; }
        .fade-in-delay-4 { animation-delay: 0.2s; opacity: 0; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: TOKENS.colors.gray50.value, fontFamily: "'DM Sans', sans-serif", color: TOKENS.colors.dark.value }}>
        {/* Sidebar Nav */}
        <nav style={{
          width: 240, borderRight: `1px solid ${TOKENS.colors.gray200.value}`,
          background: TOKENS.colors.white.value, padding: "24px 0",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${TOKENS.colors.gray200.value}`, marginBottom: 8 }}>
            <div style={{ fontFamily: "'Outfit'", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: TOKENS.colors.primary.value, borderRadius: TOKENS.radii.sm, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>$</span>
              </div>
              finança
            </div>
            <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value, marginTop: 4, fontWeight: 500 }}>Design System v1.0</div>
          </div>

          <div style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.map(s => (
              <button key={s} onClick={() => setActiveSection(s)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border: "none", borderRadius: TOKENS.radii.md, cursor: "pointer",
                fontSize: 14, fontWeight: activeSection === s ? 600 : 450,
                background: activeSection === s ? TOKENS.colors.primary.value : "transparent",
                color: activeSection === s ? TOKENS.colors.dark.value : TOKENS.colors.gray600.value,
                textTransform: "capitalize", fontFamily: "'DM Sans'",
                transition: "all 0.15s ease",
              }}>
                {s === "cores" && "◐"}
                {s === "tipografia" && "Aa"}
                {s === "espacamento" && "⊞"}
                {s === "componentes" && "◧"}
                {s === "cards" && "▢"}
                {s === "graficos" && "◮"}
                {s === "sidebar" && "☰"}
                {s === "dashboard" && "⊟"}
                <span style={{ marginLeft: 2 }}>{s}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
          {activeSection === "cores" && <CoresSection />}
          {activeSection === "tipografia" && <TipografiaSection />}
          {activeSection === "espacamento" && <EspacamentoSection />}
          {activeSection === "componentes" && <ComponentesSection />}
          {activeSection === "cards" && <CardsSection />}
          {activeSection === "graficos" && <GraficosSection />}
          {activeSection === "sidebar" && <SidebarSection />}
          {activeSection === "dashboard" && <DashboardSection />}
        </main>
      </div>
    </>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="fade-in" style={{ marginBottom: 32 }}>
      <h1 style={{ fontFamily: "'Outfit'", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      <p style={{ color: TOKENS.colors.gray600.value, fontSize: 15, maxWidth: 560 }}>{subtitle}</p>
    </div>
  );
}

function CoresSection() {
  const groups = [
    { label: "Primária", keys: ["primary", "primaryHover", "primaryMuted"] },
    { label: "Neutras", keys: ["dark", "darkSoft", "gray900", "gray600", "gray400", "gray200", "gray100", "gray50", "white"] },
    { label: "Semânticas", keys: ["success", "successMuted", "danger", "dangerMuted", "warning", "warningMuted"] },
  ];

  return (
    <div>
      <SectionTitle title="Cores" subtitle="Paleta baseada em fundo claro com acento lima vibrante. Neutras frias para hierarquia, semânticas para feedback financeiro." />
      {groups.map((g, gi) => (
        <div key={g.label} className={`fade-in fade-in-delay-${gi + 1}`} style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>{g.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {g.keys.map(k => {
              const c = TOKENS.colors[k];
              const isLight = ["gray50", "gray100", "white", "primaryMuted", "successMuted", "dangerMuted", "warningMuted"].includes(k);
              return (
                <div key={k} style={{ width: 140 }}>
                  <div style={{
                    width: "100%", height: 72, background: c.value, borderRadius: TOKENS.radii.lg,
                    border: isLight ? `1px solid ${TOKENS.colors.gray200.value}` : "none",
                    boxShadow: TOKENS.shadows.sm,
                  }} />
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono'", color: TOKENS.colors.gray600.value }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value, marginTop: 2 }}>{c.usage}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TipografiaSection() {
  const entries = Object.entries(TOKENS.typography);
  return (
    <div>
      <SectionTitle title="Tipografia" subtitle="Outfit para headings e dados financeiros. DM Sans para corpo e UI. JetBrains Mono para valores numéricos e código." />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {entries.map(([key, t], i) => (
          <div key={key} className={`fade-in fade-in-delay-${Math.min(i + 1, 4)}`} style={{
            display: "flex", alignItems: "baseline", gap: 32, padding: "20px 0",
            borderBottom: `1px solid ${TOKENS.colors.gray200.value}`,
          }}>
            <div style={{ width: 120, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value }}>{key}</div>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono'", color: TOKENS.colors.gray600.value, marginTop: 4 }}>
                {t.size} / {t.weight}
              </div>
            </div>
            <div style={{
              fontSize: t.size, fontWeight: t.weight, lineHeight: t.lineHeight,
              fontFamily: t.font, letterSpacing: t.letterSpacing || "normal",
              textTransform: t.textTransform || "none",
            }}>
              {key === "mono" ? "R$ 23.548,64" : key === "caption" ? "CATEGORIA • ALIMENTAÇÃO" : "Controle seus gastos"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EspacamentoSection() {
  return (
    <div>
      <SectionTitle title="Espaçamento" subtitle="Escala de 4px com tokens nomeados. Usar consistentemente em padding, margin e gap." />
      <div className="fade-in fade-in-delay-1" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
        {TOKENS.spacing.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 50, fontSize: 12, fontFamily: "'JetBrains Mono'", color: TOKENS.colors.gray600.value, textAlign: "right" }}>{s}px</div>
            <div style={{ width: s, height: 24, background: TOKENS.colors.primary.value, borderRadius: 4, minWidth: s === 0 ? 2 : undefined, opacity: s === 0 ? 0.3 : 1 }} />
            <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value }}>space-{i}</div>
          </div>
        ))}
      </div>

      <div className="fade-in fade-in-delay-2" style={{ marginTop: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Border Radius</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {Object.entries(TOKENS.radii).map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, background: TOKENS.colors.white.value,
                border: `2px solid ${TOKENS.colors.dark.value}`, borderRadius: v,
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>{k}</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: TOKENS.colors.gray600.value }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-in fade-in-delay-3" style={{ marginTop: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Sombras</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {Object.entries(TOKENS.shadows).map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{
                width: 80, height: 80, background: TOKENS.colors.white.value,
                borderRadius: TOKENS.radii.lg, boxShadow: v,
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComponentesSection() {
  const [toggleOn, setToggleOn] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div>
      <SectionTitle title="Componentes" subtitle="Biblioteca de componentes base para a interface do assistente financeiro." />

      {/* Buttons */}
      <div className="fade-in fade-in-delay-1" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Botões</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{
            padding: "10px 24px", background: TOKENS.colors.primary.value,
            border: "none", borderRadius: TOKENS.radii.md, fontWeight: 600,
            fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>Primário</button>
          <button style={{
            padding: "10px 24px", background: TOKENS.colors.dark.value, color: TOKENS.colors.white.value,
            border: "none", borderRadius: TOKENS.radii.md, fontWeight: 600,
            fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>Secundário</button>
          <button style={{
            padding: "10px 24px", background: "transparent",
            border: `1.5px solid ${TOKENS.colors.gray200.value}`, borderRadius: TOKENS.radii.md,
            fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'",
            color: TOKENS.colors.dark.value,
          }}>Outline</button>
          <button style={{
            padding: "10px 24px", background: "transparent",
            border: "none", borderRadius: TOKENS.radii.md,
            fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'",
            color: TOKENS.colors.gray600.value,
          }}>Ghost</button>
          <button style={{
            padding: "10px 24px", background: TOKENS.colors.danger.value, color: TOKENS.colors.white.value,
            border: "none", borderRadius: TOKENS.radii.md, fontWeight: 600,
            fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>Danger</button>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <button style={{
            padding: "8px 16px", background: TOKENS.colors.primary.value,
            border: "none", borderRadius: TOKENS.radii.sm, fontWeight: 600,
            fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>Pequeno</button>
          <button style={{
            padding: "12px 28px", background: TOKENS.colors.primary.value,
            border: "none", borderRadius: TOKENS.radii.md, fontWeight: 600,
            fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans'",
          }}>Grande</button>
          <button style={{
            width: 40, height: 40, background: TOKENS.colors.primary.value,
            border: "none", borderRadius: TOKENS.radii.full, fontWeight: 700,
            fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>
      </div>

      {/* Inputs */}
      <div className="fade-in fade-in-delay-2" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Inputs</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", maxWidth: 600 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Valor</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: TOKENS.colors.gray400.value, fontSize: 14, fontWeight: 500 }}>R$</span>
              <input type="text" placeholder="0,00" style={{
                width: "100%", padding: "10px 14px 10px 40px", border: `1.5px solid ${TOKENS.colors.gray200.value}`,
                borderRadius: TOKENS.radii.md, fontSize: 14, fontFamily: "'DM Sans'",
                outline: "none", background: TOKENS.colors.white.value,
              }} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Categoria</label>
            <select style={{
              width: "100%", padding: "10px 14px", border: `1.5px solid ${TOKENS.colors.gray200.value}`,
              borderRadius: TOKENS.radii.md, fontSize: 14, fontFamily: "'DM Sans'",
              outline: "none", background: TOKENS.colors.white.value, color: TOKENS.colors.dark.value,
              appearance: "none",
            }}>
              <option>Alimentação</option>
              <option>Transporte</option>
              <option>Moradia</option>
              <option>Lazer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Badges & Pills */}
      <div className="fade-in fade-in-delay-3" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Badges & Tags</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "Alimentação", bg: "#FFF3E0", color: "#E65100" },
            { label: "Transporte", bg: "#E3F2FD", color: "#1565C0" },
            { label: "Moradia", bg: "#F3E5F5", color: "#7B1FA2" },
            { label: "Lazer", bg: "#E8F5E9", color: "#2E7D32" },
            { label: "Saúde", bg: "#FBE9E7", color: "#BF360C" },
            { label: "Educação", bg: "#E0F7FA", color: "#00838F" },
          ].map(t => (
            <span key={t.label} style={{
              padding: "4px 12px", borderRadius: TOKENS.radii.full,
              fontSize: 12, fontWeight: 600, background: t.bg, color: t.color,
            }}>{t.label}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <span style={{ padding: "4px 12px", borderRadius: TOKENS.radii.full, fontSize: 12, fontWeight: 600, background: TOKENS.colors.successMuted.value, color: TOKENS.colors.success.value }}>+ R$ 5.500</span>
          <span style={{ padding: "4px 12px", borderRadius: TOKENS.radii.full, fontSize: 12, fontWeight: 600, background: TOKENS.colors.dangerMuted.value, color: TOKENS.colors.danger.value }}>- R$ 320</span>
          <span style={{ padding: "4px 12px", borderRadius: TOKENS.radii.full, fontSize: 12, fontWeight: 600, background: TOKENS.colors.warningMuted.value, color: TOKENS.colors.warning.value }}>80% do limite</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-in fade-in-delay-4" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Tabs</div>
        <div style={{ display: "flex", gap: 0, background: TOKENS.colors.gray100.value, borderRadius: TOKENS.radii.md, padding: 3, width: "fit-content" }}>
          {["Geral", "Entradas", "Saídas"].map((t, i) => (
            <button key={t} onClick={() => setSelectedTab(i)} style={{
              padding: "8px 20px", border: "none", borderRadius: TOKENS.radii.sm,
              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans'",
              background: selectedTab === i ? TOKENS.colors.white.value : "transparent",
              color: selectedTab === i ? TOKENS.colors.dark.value : TOKENS.colors.gray600.value,
              boxShadow: selectedTab === i ? TOKENS.shadows.sm : "none",
              transition: "all 0.15s ease",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Toggle */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14 }}>Toggle</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div onClick={() => setToggleOn(!toggleOn)} style={{
            width: 44, height: 24, borderRadius: 12, cursor: "pointer",
            background: toggleOn ? TOKENS.colors.primary.value : TOKENS.colors.gray200.value,
            position: "relative", transition: "background 0.2s ease",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: TOKENS.colors.white.value,
              position: "absolute", top: 3,
              left: toggleOn ? 23 : 3, transition: "left 0.2s ease",
              boxShadow: TOKENS.shadows.md,
            }} />
          </div>
          <span style={{ fontSize: 14, color: TOKENS.colors.gray600.value }}>Notificações via WhatsApp</span>
        </div>
      </div>
    </div>
  );
}

function CardsSection() {
  return (
    <div>
      <SectionTitle title="Cards" subtitle="Padrões de cards para transações, resumos e alertas. Bordas sutis, sombras leves." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 720 }}>
        {/* Transaction Card */}
        <div className="fade-in fade-in-delay-1" style={{
          background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
          border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 12 }}>Transação</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: TOKENS.radii.md, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛒</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Mercado Livre</div>
                <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value }}>Alimentação • Hoje</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit'", color: TOKENS.colors.danger.value }}>- R$ 234,50</div>
              <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value }}>Débito</div>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="fade-in fade-in-delay-2" style={{
          background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
          border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 12 }}>Entrada</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: TOKENS.radii.md, background: TOKENS.colors.successMuted.value, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💰</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Salário</div>
                <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value }}>Renda • 05 Abr</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit'", color: TOKENS.colors.success.value }}>+ R$ 5.500</div>
              <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value }}>Pix</div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="fade-in fade-in-delay-3" style={{
          background: TOKENS.colors.dark.value, borderRadius: TOKENS.radii.lg,
          padding: 24, color: TOKENS.colors.white.value,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 4 }}>Saldo atual</div>
          <div style={{ fontFamily: "'Outfit'", fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
            R$ 3.248<span style={{ fontSize: 20, color: TOKENS.colors.gray400.value }}>,64</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: TOKENS.colors.gray600.value }}>Entradas</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.colors.success.value }}>R$ 5.500</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TOKENS.colors.gray600.value }}>Saídas</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.colors.danger.value }}>R$ 2.251,36</div>
            </div>
          </div>
        </div>

        {/* Alert Card */}
        <div className="fade-in fade-in-delay-4" style={{
          background: TOKENS.colors.warningMuted.value, borderRadius: TOKENS.radii.lg,
          border: `1px solid ${TOKENS.colors.warning.value}30`, padding: 20,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ fontSize: 20, marginTop: -2 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Atenção com Delivery</div>
              <div style={{ fontSize: 13, color: TOKENS.colors.gray900.value, lineHeight: 1.5 }}>
                Você já gastou R$ 680 com delivery esse mês — 85% do total do mês passado, e ainda faltam 12 dias.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Card */}
      <div className="fade-in fade-in-delay-4" style={{ marginTop: 20, maxWidth: 720 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 14, marginTop: 20 }}>Confirmação WhatsApp</div>
        <div style={{
          background: "#DCF8C6", borderRadius: "14px 14px 4px 14px", padding: 16,
          maxWidth: 340, boxShadow: TOKENS.shadows.sm, fontSize: 14, lineHeight: 1.6,
        }}>
          <div>✅ Registrado!</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>R$ 50,00 — Alimentação</div>
          <div style={{ fontSize: 12, color: "#4a4a4a", marginTop: 4 }}>Mercado • Débito • Hoje</div>
          <div style={{ fontSize: 10, color: "#8a8a8a", marginTop: 6, textAlign: "right" }}>12:34</div>
        </div>
      </div>
    </div>
  );
}

function GraficosSection() {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const values = [1200, 1800, 1400, 2100, 1600, 1900];
  const maxVal = Math.max(...values);

  const categories = [
    { name: "Alimentação", value: 1240, pct: 38, color: "#E65100" },
    { name: "Moradia", value: 850, pct: 26, color: "#7B1FA2" },
    { name: "Transporte", value: 420, pct: 13, color: "#1565C0" },
    { name: "Lazer", value: 380, pct: 12, color: "#2E7D32" },
    { name: "Outros", value: 360, pct: 11, color: "#6B6B6B" },
  ];

  return (
    <div>
      <SectionTitle title="Gráficos" subtitle="Padrões visuais para representar dados financeiros. Barras escuras, proporções claras." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 720 }}>
        {/* Bar Chart */}
        <div className="fade-in fade-in-delay-1" style={{
          background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
          border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Gastos mensais</div>
          <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value, marginBottom: 20 }}>Últimos 6 meses</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: `${(values[i] / maxVal) * 100}px`,
                  background: i === months.length - 1 ? TOKENS.colors.primary.value : TOKENS.colors.dark.value,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s ease",
                  minHeight: 4,
                }} />
                <div style={{ fontSize: 10, color: TOKENS.colors.gray400.value, marginTop: 6 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="fade-in fade-in-delay-2" style={{
          background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
          border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Por categoria</div>
          <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value, marginBottom: 16 }}>Abril 2026</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map(c => (
              <div key={c.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: TOKENS.colors.gray600.value }}>R$ {c.value.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: TOKENS.colors.gray100.value, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="fade-in fade-in-delay-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, gridColumn: "1 / -1" }}>
          {[
            { label: "Total gasto", value: "R$ 3.250", change: "+12%", negative: true },
            { label: "Economia", value: "R$ 2.250", change: "+8%", negative: false },
            { label: "Transações", value: "47", change: "-5%", negative: false },
            { label: "Média/dia", value: "R$ 108", change: "+3%", negative: true },
          ].map(s => (
            <div key={s.label} style={{
              background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
              border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 18,
            }}>
              <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value, marginBottom: 6 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Outfit'", fontSize: 24, fontWeight: 700 }}>{s.value}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: s.negative ? TOKENS.colors.danger.value : TOKENS.colors.success.value,
                }}>{s.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarSection() {
  const [collapsed, setCollapsed] = useState(false);
  const items = [
    { icon: "⌂", label: "Home", active: true },
    { icon: "↕", label: "Transações", active: false },
    { icon: "◑", label: "Categorias", active: false },
    { icon: "▭", label: "Cartões", active: false },
    { icon: "◮", label: "Insights", active: false },
    { icon: "⚙", label: "Configurações", active: false },
  ];

  return (
    <div>
      <SectionTitle title="Sidebar" subtitle="Navegação lateral colapsável inspirada na referência Lemon. Dois estados: expandida e compacta." />

      <div style={{ display: "flex", gap: 32 }}>
        {/* Expanded */}
        <div className="fade-in fade-in-delay-1">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 12 }}>Expandida</div>
          <div style={{
            width: 220, background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
            border: `1px solid ${TOKENS.colors.gray200.value}`, padding: 16, minHeight: 380,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontFamily: "'Outfit'", fontWeight: 800, fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
              <div style={{ width: 24, height: 24, background: TOKENS.colors.primary.value, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>$</div>
              finança
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {items.map(item => (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: TOKENS.radii.md, cursor: "pointer",
                  background: item.active ? TOKENS.colors.primary.value : "transparent",
                  fontWeight: item.active ? 600 : 450,
                  fontSize: 14, color: item.active ? TOKENS.colors.dark.value : TOKENS.colors.gray600.value,
                }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${TOKENS.colors.gray200.value}`, paddingTop: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 10, padding: "12px 8px 0" }}>
              <div style={{ width: 32, height: 32, borderRadius: TOKENS.radii.full, background: TOKENS.colors.gray100.value, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>J</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>João Silva</div>
                <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value }}>joao@email.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsed */}
        <div className="fade-in fade-in-delay-2">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: TOKENS.colors.gray400.value, marginBottom: 12 }}>Compacta</div>
          <div style={{
            width: 64, background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.lg,
            border: `1px solid ${TOKENS.colors.gray200.value}`, padding: "16px 0", minHeight: 380,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ width: 32, height: 32, background: TOKENS.colors.primary.value, borderRadius: TOKENS.radii.sm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, marginBottom: 24 }}>$</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, alignItems: "center" }}>
              {items.map(item => (
                <div key={item.label} style={{
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: TOKENS.radii.md, cursor: "pointer",
                  background: item.active ? TOKENS.colors.primary.value : "transparent",
                  fontSize: 18,
                }}>
                  {item.icon}
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${TOKENS.colors.gray200.value}`, paddingTop: 12, width: "100%", display: "flex", justifyContent: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: TOKENS.radii.full, background: TOKENS.colors.gray100.value, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>J</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection() {
  const transactions = [
    { icon: "🛒", name: "Supermercado Dia", cat: "Alimentação", date: "Hoje, 14:32", value: -182.40, method: "Débito" },
    { icon: "🚗", name: "Uber", cat: "Transporte", date: "Hoje, 12:05", value: -24.90, method: "Crédito" },
    { icon: "💰", name: "Freelance", cat: "Renda extra", date: "Ontem", value: 1200, method: "Pix" },
    { icon: "🍕", name: "iFood", cat: "Alimentação", date: "Ontem", value: -67.80, method: "Crédito" },
    { icon: "💡", name: "Conta de Luz", cat: "Moradia", date: "02 Abr", value: -145.00, method: "Pix" },
  ];

  return (
    <div>
      <SectionTitle title="Dashboard Preview" subtitle="Composição completa mostrando como os componentes se integram na tela principal." />

      <div className="fade-in fade-in-delay-1" style={{
        background: TOKENS.colors.white.value, borderRadius: TOKENS.radii.xl,
        border: `1px solid ${TOKENS.colors.gray200.value}`, overflow: "hidden",
        boxShadow: TOKENS.shadows.lg,
      }}>
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${TOKENS.colors.gray200.value}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700 }}>Home</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              padding: "8px 16px", background: "transparent", border: `1.5px solid ${TOKENS.colors.gray200.value}`,
              borderRadius: TOKENS.radii.md, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans'",
            }}>Abril 2026</button>
            <button style={{
              padding: "8px 16px", background: TOKENS.colors.primary.value, border: "none",
              borderRadius: TOKENS.radii.md, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans'",
            }}>+ Nova transação</button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: `1px solid ${TOKENS.colors.gray200.value}` }}>
          {[
            { label: "Saldo atual", value: "R$ 3.248,64", sub: null },
            { label: "Entradas", value: "R$ 6.700", sub: "+", color: TOKENS.colors.success.value },
            { label: "Saídas", value: "R$ 3.451,36", sub: "-", color: TOKENS.colors.danger.value },
            { label: "Economia", value: "R$ 3.248,64", sub: "48%", color: TOKENS.colors.success.value },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "20px 28px",
              borderRight: i < 3 ? `1px solid ${TOKENS.colors.gray200.value}` : "none",
            }}>
              <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'Outfit'", fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginTop: 2 }}>{s.sub === "+" ? "↑ " : s.sub === "-" ? "↓ " : ""}{s.sub === "48%" ? "48% da renda" : "este mês"}</div>}
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div style={{ padding: "20px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Transações recentes</div>
            <button style={{ fontSize: 13, color: TOKENS.colors.gray600.value, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans'" }}>Ver todas →</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {transactions.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0",
                borderBottom: i < transactions.length - 1 ? `1px solid ${TOKENS.colors.gray100.value}` : "none",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: TOKENS.radii.md,
                    background: t.value > 0 ? TOKENS.colors.successMuted.value : TOKENS.colors.gray100.value,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: TOKENS.colors.gray400.value }}>{t.cat} • {t.date}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: 15, fontWeight: 600, fontFamily: "'Outfit'",
                    color: t.value > 0 ? TOKENS.colors.success.value : TOKENS.colors.dark.value,
                  }}>
                    {t.value > 0 ? "+" : ""} R$ {Math.abs(t.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 11, color: TOKENS.colors.gray400.value }}>{t.method}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Bubble */}
      <div className="fade-in fade-in-delay-3" style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <div style={{
          width: 56, height: 56, borderRadius: TOKENS.radii.full,
          background: TOKENS.colors.dark.value, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: TOKENS.shadows.xl, position: "relative",
        }}>
          <span style={{ fontSize: 24 }}>💬</span>
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: TOKENS.radii.full,
            background: TOKENS.colors.primary.value, border: `2px solid ${TOKENS.colors.white.value}`,
          }} />
        </div>
      </div>
    </div>
  );
}
