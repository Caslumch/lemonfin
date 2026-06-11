import type { CSSProperties, ReactNode } from "react";
import { Sparkles, Check, Bot, Mic, MessageCircle } from "lucide-react";

/* ---- section building blocks --------------------------------------------- */

export function Eyebrow({
  children,
  dark,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 14px 7px 11px",
        borderRadius: "var(--radius-full)",
        background: dark ? "rgba(212,244,0,0.12)" : "var(--lemon-100)",
        color: dark ? "var(--lemon-400)" : "#5C6B00",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      <span style={{ display: "inline-flex" }}>
        <Sparkles size={15} />
      </span>
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
  dark,
  max = 620,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  dark?: boolean;
  max?: number;
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: max,
        marginLeft: align === "center" ? "auto" : 0,
        marginRight: align === "center" ? "auto" : 0,
      }}
    >
      {eyebrow && (
        <div style={{ marginBottom: 18 }}>
          <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(28px, 3.4vw, 42px)",
          lineHeight: 1.08,
          letterSpacing: "-0.025em",
          color: dark ? "#fff" : "var(--text-primary)",
          textWrap: "balance",
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            margin: "16px 0 0",
            fontSize: "clamp(15px, 1.4vw, 17px)",
            lineHeight: 1.6,
            color: dark ? "var(--text-on-dark-muted)" : "var(--text-secondary)",
            textWrap: "pretty",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function CheckItem({
  children,
  dark,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 12, listStyle: "none" }}>
      <span
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          marginTop: 1,
          borderRadius: "var(--radius-full)",
          background: "var(--lemon-400)",
          color: "var(--dark)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={14} strokeWidth={2.4} />
      </span>
      <span
        style={{
          fontSize: 15.5,
          lineHeight: 1.5,
          color: dark ? "rgba(255,255,255,0.82)" : "var(--text-secondary)",
        }}
      >
        {children}
      </span>
    </li>
  );
}

/* ---- WhatsApp phone mock -------------------------------------------------- */

function Bubble({
  side,
  children,
  time,
  accent,
}: {
  side: "in" | "out";
  children: ReactNode;
  time: string;
  accent?: boolean;
}) {
  const out = side === "out";
  return (
    <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "9px 12px 7px",
          borderRadius: out ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: out ? "#1F3D34" : accent ? "#13261f" : "#1F2C34",
          color: "#E9EDEF",
          fontSize: 13.5,
          lineHeight: 1.45,
          boxShadow: "0 1px 1px rgba(0,0,0,0.2)",
        }}
      >
        {accent && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              color: "var(--lemon-400)",
              fontWeight: 700,
              fontSize: 12.5,
            }}
          >
            <Bot size={14} /> LemonFin
          </div>
        )}
        {children}
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(233,237,239,0.5)",
            textAlign: "right",
            marginTop: 3,
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

function VoiceBubble({ side, dur }: { side: "in" | "out"; dur: string }) {
  const out = side === "out";
  const heights = [6, 10, 16, 8, 20, 12, 7, 14, 18, 9];
  return (
    <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: 200,
          padding: "10px 13px",
          borderRadius: "14px 14px 4px 14px",
          background: "#1F3D34",
          color: "#E9EDEF",
        }}
      >
        <span style={{ color: "var(--lemon-400)", display: "inline-flex" }}>
          <Mic size={18} />
        </span>
        <svg viewBox="0 0 120 24" width="120" height="22" style={{ flex: 1 }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const h = heights[i % 10];
            return (
              <rect
                key={i}
                x={i * 4}
                y={(24 - h) / 2}
                width="2"
                height={h}
                rx="1"
                fill={i < 12 ? "var(--lemon-400)" : "rgba(233,237,239,0.4)"}
              />
            );
          })}
        </svg>
        <span style={{ fontSize: 11, color: "rgba(233,237,239,0.6)" }}>{dur}</span>
      </div>
    </div>
  );
}

export function PhoneChat({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        width: 296,
        borderRadius: 44,
        background: "#0D0D0D",
        padding: 10,
        boxShadow:
          "0 40px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: 36,
          overflow: "hidden",
          background: "#0B141A",
          position: "relative",
        }}
      >
        {/* WA header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "14px 16px",
            background: "#1F2C34",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--lemon-400)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--dark)",
            }}
          >
            <Bot size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14.5 }}>LemonFin</div>
            <div style={{ color: "#22C55E", fontSize: 11.5 }}>online</div>
          </div>
          <MessageCircle size={20} style={{ color: "#25D366" }} />
        </div>
        {/* chat */}
        <div
          style={{
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 380,
            background: "linear-gradient(180deg, #0B141A, #0E1A1F)",
          }}
        >
          <VoiceBubble side="out" dur="0:04" />
          <Bubble side="in" time="14:32" accent>
            <span>
              Anotado! <b style={{ color: "#fff" }}>R$ 45,00</b> em Alimentação 🍔
            </span>
            <div
              style={{
                marginTop: 8,
                background: "rgba(212,244,0,0.1)",
                border: "1px solid rgba(212,244,0,0.25)",
                borderRadius: 12,
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: 11, color: "rgba(233,237,239,0.6)" }}>
                Almoço · hoje
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                − R$ 45,00
              </div>
            </div>
          </Bubble>
          <Bubble side="out" time="14:33">
            Quanto gastei com comida esse mês?
          </Bubble>
          <Bubble side="in" time="14:33" accent>
            <span>
              Você gastou <b style={{ color: "#fff" }}>R$ 612,40</b> em Alimentação — 18%
              a mais que no mês passado. Quer ver o resumo? 📊
            </span>
          </Bubble>
        </div>
      </div>
    </div>
  );
}

/* ---- browser frame -------------------------------------------------------- */

export function BrowserFrame({
  children,
  url = "app.lemonfin.com",
  style,
}: {
  children: ReactNode;
  url?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-2xl)",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 40px 90px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          background: "#0D0D0D",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
        <div
          style={{
            flex: 1,
            margin: "0 12px",
            textAlign: "center",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-full)",
            padding: "5px 0",
            fontSize: 11.5,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
