import { useState } from "react";

/**
 * Design System — Finança Mobile v1.0
 * Herda os tokens do design system web e adiciona: camada dark,
 * navegação por abas, fluxo de chat da IA e gestos nativos.
 *
 * Uso: importe TOKENS no seu app React Native / web e use este arquivo
 * como referência viva navegável (renderiza um showcase com frames de celular).
 */

export const TOKENS = {
  // Acentos e semânticas — constantes nos dois temas
  accent: {
    primary: "#D4F400",
    primaryHover: "#BDD900",
    primaryMuted: "#D4F40020",
    success: "#22C55E",
    successMuted: "#22C55E15",
    danger: "#EF4444",
    dangerMuted: "#EF444415",
    warning: "#F59E0B",
    warningMuted: "#F59E0B15",
  },
  // Superfícies por tema
  light: {
    bg: "#F9F9F9",
    surface: "#FFFFFF",
    surfaceElevated: "#F2F2F2",
    border: "#E5E5E5",
    text: "#0D0D0D",
    textSecondary: "#6B6B6B",
    textTertiary: "#9E9E9E",
  },
  dark: {
    bg: "#0D0D0D",
    surface: "#161616",
    surfaceElevated: "#242424",
    border: "#2A2A2A",
    text: "#F5F5F5",
    textSecondary: "#9E9E9E",
    textTertiary: "#7A7A7A",
  },
  categories: {
    Alimentacao: { bg: "#FFF3E0", fg: "#E65100" },
    Transporte: { bg: "#E3F2FD", fg: "#1565C0" },
    Moradia: { bg: "#F3E5F5", fg: "#7B1FA2" },
    Lazer: { bg: "#E8F5E9", fg: "#2E7D32" },
    Saude: { bg: "#FBE9E7", fg: "#BF360C" },
    Educacao: { bg: "#E0F7FA", fg: "#00838F" },
    Compras: { bg: "#FFF8E1", fg: "#F57F17" },
    Freelance: { bg: "#EDE7F6", fg: "#4527A0" },
  },
  typography: {
    balance: { size: 40, weight: 700, font: "'Outfit', sans-serif" },
    title: { size: 24, weight: 700, font: "'Outfit', sans-serif" },
    section: { size: 18, weight: 600, font: "'Outfit', sans-serif" },
    body: { size: 16, weight: 400, font: "'DM Sans', sans-serif" },
    bodyMedium: { size: 16, weight: 500, font: "'DM Sans', sans-serif" },
    small: { size: 14, weight: 400, font: "'DM Sans', sans-serif" },
    caption: { size: 11, weight: 600, font: "'DM Sans', sans-serif", tracking: "0.06em", transform: "uppercase" },
    mono: { size: 14, weight: 500, font: "'JetBrains Mono', monospace" },
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40],
  screenPadding: 20,
  radii: { sm: 8, md: 12, lg: 16, xl: 24, sheet: 28, full: 9999 },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.04)",
    md: "0 2px 8px rgba(0,0,0,0.06)",
    lg: "0 8px 24px rgba(0,0,0,0.12)",
  },
  touchTarget: 48,
  safeArea: { top: 44, bottom: 34 },
};

const A = TOKENS.accent;

/* ---------- Frame de celular ---------- */
function Phone({ children, theme = "light", w = 300, h = 620 }) {
  const t = TOKENS[theme];
  return (
    <div style={{ width: w, height: h, background: "#0D0D0D", borderRadius: 44, padding: 10, boxShadow: "0 20px 50px rgba(0,0,0,.25)", flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", background: t.bg, borderRadius: 34, overflow: "hidden", position: "relative", color: t.text }}>
        {children}
      </div>
    </div>
  );
}

function StatusBar({ theme = "light" }) {
  const c = theme === "dark" ? "#F5F5F5" : "#0D0D0D";
  return (
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontSize: 13, fontWeight: 600, color: c }}>
      <span>9:41</span>
      <span style={{ fontSize: 12 }}>􀙇 􀛨 􀋨</span>
    </div>
  );
}

/* ---------- Ícones (line, 24px) ---------- */
const Icon = {
  home: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5M5 9v11h14V9" /></svg>,
  list: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h13M7 7 4 4M7 7 4 10M17 17H4M17 17l3-3M17 17l3 3" /></svg>,
  card: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /></svg>,
  user: (c) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  spark: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>,
  back: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>,
  send: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>,
};

/* ---------- Tab bar (Opção B: 4 + FAB) ---------- */
function TabBar({ theme = "light" }) {
  const t = TOKENS[theme];
  const tab = (icon, label, active) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? t.text : t.textTertiary }}>
      {icon(active ? t.text : t.textTertiary)}
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{label}</span>
    </div>
  );
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: theme === "dark" ? "rgba(22,22,22,.92)" : "rgba(255,255,255,.92)", backdropFilter: "blur(12px)", borderTop: `1px solid ${t.border}`, padding: "10px 16px 22px", display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>
      {tab(Icon.home, "Início", true)}
      {tab(Icon.list, "Extrato", false)}
      <div style={{ width: 56, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 54, height: 54, background: A.primary, borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(212,244,0,.5)", marginTop: -26 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      </div>
      {tab(Icon.card, "Cartões", false)}
      {tab(Icon.user, "Perfil", false)}
    </div>
  );
}

/* ---------- Tela Home ---------- */
function HomeScreen({ theme = "light", onOpenChat, assistant = "Limão" }) {
  const t = TOKENS[theme];
  const rows = [
    { icon: "🛒", name: "Supermercado Dia", cat: "Alimentação • Hoje", value: "- R$ 182,40", pos: false },
    { icon: "💰", name: "Freelance", cat: "Renda • Ontem", value: "+ R$ 1.200", pos: true },
    { icon: "🚗", name: "Uber", cat: "Transporte • Ontem", value: "- R$ 24,90", pos: false },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <StatusBar theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme === "dark" ? A.primary : "#0D0D0D", color: theme === "dark" ? "#0D0D0D" : A.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit'", fontWeight: 700 }}>J</div>
          <div><div style={{ fontSize: 13, color: t.textTertiary }}>Boa tarde,</div><div style={{ fontSize: 15, fontWeight: 700 }}>João</div></div>
        </div>
        <div style={{ background: theme === "dark" ? t.surface : "#0D0D0D", border: theme === "dark" ? `1px solid ${t.border}` : "none", borderRadius: 24, padding: 22, color: "#fff", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 10 }}>Saldo disponível</div>
          <div style={{ fontFamily: "'Outfit'", fontWeight: 700, fontSize: 38, lineHeight: 1 }}>R$ 3.248<span style={{ fontSize: 22, color: "#9E9E9E" }}>,64</span></div>
          <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
            <div><div style={{ fontSize: 11, color: "#6B6B6B" }}>Entradas</div><div style={{ fontSize: 14, fontWeight: 600, color: A.success }}>R$ 6.700</div></div>
            <div><div style={{ fontSize: 11, color: "#6B6B6B" }}>Saídas</div><div style={{ fontSize: 14, fontWeight: 600, color: A.danger }}>R$ 3.451</div></div>
          </div>
        </div>
        {/* Input da IA */}
        <div onClick={onOpenChat} style={{ cursor: "pointer", background: t.surface, border: `1.5px solid ${A.primary}`, borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 2px 10px rgba(212,244,0,.18)", marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: A.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.spark("#0D0D0D")}</div>
          <span style={{ flex: 1, fontSize: 14, color: t.textTertiary }}>Pergunte ao {assistant}…</span>
        </div>
        <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 17, marginBottom: 12 }}>Recentes</div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: i ? `1px solid ${t.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: theme === "dark" ? t.surfaceElevated : "#F2F2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{r.icon}</div>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 12, color: t.textTertiary }}>{r.cat}</div></div>
            </div>
            <div style={{ fontFamily: "'Outfit'", fontWeight: 700, fontSize: 15, color: r.pos ? A.success : t.text }}>{r.value}</div>
          </div>
        ))}
      </div>
      <TabBar theme={theme} />
    </div>
  );
}

/* ---------- Tela de Chat ---------- */
function ChatScreen({ theme = "light", onBack, assistant = "Limão" }) {
  const t = TOKENS[theme];
  return (
    <div style={{ position: "absolute", inset: 0, background: t.bg, display: "flex", flexDirection: "column" }}>
      <StatusBar theme={theme} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px 14px", borderBottom: `1px solid ${t.border}` }}>
        <div onClick={onBack} style={{ cursor: "pointer", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.surface, border: `1px solid ${t.border}` }}>{Icon.back(t.text)}</div>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: A.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.spark("#0D0D0D")}</div>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>{assistant}</div><div style={{ fontSize: 12, color: A.success }}>● Online</div></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Bubble theme={theme} me={false}>Oi João! 🍋 Sou o {assistant}. Posso ajudar com gastos, metas ou registrar uma transação.</Bubble>
        <Bubble theme={theme} me={true}>Quanto gastei com alimentação esse mês?</Bubble>
        <Bubble theme={theme} me={false}>
          Você gastou <b>R$ 1.240</b> em alimentação — 38% dos gastos.
          <div style={{ marginTop: 10, background: t.bg, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>Alimentação</span><span style={{ fontFamily: "'JetBrains Mono'", color: t.textSecondary }}>R$ 1.240</span></div>
            <div style={{ height: 6, background: t.border, borderRadius: 3, overflow: "hidden" }}><div style={{ width: "38%", height: "100%", background: "#E65100" }} /></div>
          </div>
        </Bubble>
      </div>
      <div style={{ padding: "10px 14px 22px", borderTop: `1px solid ${t.border}`, background: t.surface, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ flex: 1, background: t.surfaceElevated, borderRadius: 9999, padding: "12px 16px", fontSize: 14, color: t.textTertiary }}>Escreva sua pergunta…</div>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: A.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.send("#0D0D0D")}</div>
      </div>
    </div>
  );
}

function Bubble({ children, me, theme }) {
  const t = TOKENS[theme];
  return (
    <div style={{
      alignSelf: me ? "flex-end" : "flex-start", maxWidth: "82%",
      background: me ? A.primary : t.surface, color: "#0D0D0D",
      border: me ? "none" : `1px solid ${t.border}`,
      borderRadius: me ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
      padding: "12px 14px", fontSize: 14, lineHeight: 1.5,
      ...(me ? {} : { color: t.text }),
    }}>{children}</div>
  );
}

/* ---------- Showcase ---------- */
export default function DesignSystemMobile() {
  const [chatOpen, setChatOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const theme = dark ? "dark" : "light";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: "#EDEDED", fontFamily: "'DM Sans', sans-serif", padding: 48 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Outfit'", fontWeight: 700, fontSize: 40, marginBottom: 8 }}>Finança — Design System Mobile</h1>
          <p style={{ color: "#6B6B6B", fontSize: 16, marginBottom: 24 }}>Tokens em <code>TOKENS</code>. Toque no input para abrir o chat; alterne o tema.</p>
          <button onClick={() => setDark(d => !d)} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", fontFamily: "'DM Sans'", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 32 }}>
            {dark ? "☀️ Tema claro" : "🌙 Tema escuro"}
          </button>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <Phone theme={theme}>
              {chatOpen
                ? <ChatScreen theme={theme} onBack={() => setChatOpen(false)} />
                : <HomeScreen theme={theme} onOpenChat={() => setChatOpen(true)} />}
            </Phone>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{ fontFamily: "'Outfit'", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Fluxo do chat</h3>
              <p style={{ fontSize: 15, color: "#6B6B6B", lineHeight: 1.6 }}>
                Input fixo na Home (borda lima) → tela cheia com a IA → seta ← para voltar.
                A bubble do web vira uma tela empilhada, com entrada e saída sempre óbvias.
                Consulte <code>design-system-mobile.md</code> para o guia completo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
