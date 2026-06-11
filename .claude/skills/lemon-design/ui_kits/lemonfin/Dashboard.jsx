/* LemonFin Dashboard — reference-style recreation, pt-BR. */
const DS = window.LemonFinDesignSystem_1143b6;

/* ---- small helpers -------------------------------------------------------- */
function CardHead({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>{title}</span>
      {right}
    </div>
  );
}
function Dropdown({ children }) {
  const Chevron = window.LFIcons.chevron;
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
      {children}<Chevron size={15} />
    </button>
  );
}
function Pill({ children, color }) {
  return (
    <span style={{ background: 'var(--dark)', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>{children}</span>
  );
}

/* ---- line chart ----------------------------------------------------------- */
function LineChart() {
  return (
    <svg viewBox="0 0 380 96" width="100%" height="96" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="incFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 70 C50 64 70 40 110 44 S180 78 230 60 300 22 380 30 L380 96 L0 96 Z" fill="url(#incFill)" />
      <path d="M0 70 C50 64 70 40 110 44 S180 78 230 60 300 22 380 30" fill="none" stroke="#6C5CE7" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="230" cy="60" r="5" fill="#fff" stroke="#6C5CE7" strokeWidth="2.5" />
    </svg>
  );
}

/* ---- bar chart ------------------------------------------------------------ */
function BarChart() {
  const data = [
    { m: 'Abr', h: 38 }, { m: 'Mai', h: 52 }, { m: 'Jun', h: 44 },
    { m: 'Jul', h: 86, active: true }, { m: 'Ago', h: 48 }, { m: 'Set', h: 60 },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 14 }}>
        {data.map((d) => (
          <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
            {d.active && <div style={{ position: 'absolute', top: -2 }}><Pill>R$ 2.121</Pill></div>}
            <div style={{
              width: '100%', maxWidth: 30, height: `${d.h}%`,
              borderRadius: '8px 8px 4px 4px',
              background: d.active ? 'var(--grape-500)'
                : 'repeating-linear-gradient(135deg, var(--gray-200), var(--gray-200) 4px, var(--gray-100) 4px, var(--gray-100) 8px)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginTop: 10 }}>
        {data.map((d) => (
          <span key={d.m} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{d.m}</span>
        ))}
      </div>
    </div>
  );
}

/* ---- merchant mini-list --------------------------------------------------- */
function MerchantChip({ label, color }) {
  return (
    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0, fontFamily: 'var(--font-display)' }}>{label}</div>
  );
}
function MiniTx({ chip, name, date, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0' }}>
      <MerchantChip {...chip} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{date}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', fontFeatureSettings: 'var(--num-features)' }}>{amount}</div>
    </div>
  );
}

/* ---- right column: cards + contacts --------------------------------------- */
function CardsPanel() {
  const { Card, IconButton, Button, CreditCard, Avatar } = DS;
  const Ic = window.LFIcons;
  const contacts = [
    { name: 'Daniel' }, { name: 'Emily' }, { name: 'Ryan' }, { name: 'Jason' }, { name: 'Luke', dimmed: true },
  ];
  return (
    <Card tone="dark" radius="2xl" padding={22} shadow="lg" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#fff' }}>Meus Cartões</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-on-dark-muted)', marginTop: 2 }}>2 cartões</div>
        </div>
        <IconButton variant="grape" size="sm" icon={React.createElement(Ic.plus)} ariaLabel="Adicionar cartão" />
      </div>

      <CreditCard balance="R$ 3.265,75" number="**** **** 1287 2342" exp="05/29" />

      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="ghost" pill block iconLeft={React.createElement(Ic.arrowUR, { size: 18 })} style={{ background: '#fff', color: 'var(--dark)' }}>Enviar</Button>
        <Button variant="ghost" pill block iconLeft={React.createElement(Ic.arrowDL, { size: 18 })} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Receber</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#fff' }}>Contatos recentes</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-on-dark-muted)', marginTop: 2 }}>24 contatos</div>
        </div>
        <IconButton variant="grape" size="sm" icon={React.createElement(Ic.plus)} ariaLabel="Adicionar contato" />
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {contacts.map((c) => (
          <div key={c.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <Avatar name={c.name} size="lg" dimmed={c.dimmed} />
            <span style={{ fontSize: 11.5, color: c.dimmed ? 'var(--text-on-dark-muted)' : 'rgba(255,255,255,0.85)' }}>{c.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---- main ----------------------------------------------------------------- */
function Dashboard() {
  const { StatCard, IconButton, Avatar, Card } = DS;
  const Ic = window.LFIcons;
  const kebab = <IconButton variant="ghost" size="sm" icon={React.createElement(Ic.kebab)} ariaLabel="Mais" />;

  return (
    <div style={{ display: 'flex', gap: 22 }}>
      {/* main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Bem-vindo de volta!</h1>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>Painel</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconButton variant="light" size="lg" icon={React.createElement(Ic.bell)} ariaLabel="Notificações" />
            <Avatar name="Lucas Machado" size="lg" />
          </div>
        </div>

        {/* stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <StatCard tone="dark" label="Saldo total" value="R$ 6.556,73" icon={React.createElement(Ic.wallet)} action={<IconButton variant="dark-ghost" size="sm" icon={React.createElement(Ic.kebab)} ariaLabel="Mais" />} />
          <StatCard label="Gastos do mês" value="R$ 3.450,65" iconTone="grape" icon={React.createElement(Ic.trendDn)} action={kebab} />
          <StatCard label="Economia" value="R$ 1.867,42" iconTone="lemon" icon={React.createElement(Ic.piggy)} action={kebab} />
        </div>

        {/* income + transactions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card radius="xl" padding={22}>
            <CardHead title="Receita" right={<Dropdown>30 dias</Dropdown>} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFeatureSettings: 'var(--num-features)' }}>R$ 6.556,73</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 700, color: 'var(--success-strong)' }}>
                {React.createElement(Ic.trendUp, { size: 15 })} +28%
              </span>
            </div>
            <div style={{ marginTop: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', right: 70, top: -6, zIndex: 2 }}><Pill>R$ 4.121</Pill></div>
              <LineChart />
            </div>
          </Card>

          <Card radius="xl" padding={22} style={{ display: 'flex', flexDirection: 'column' }}>
            <CardHead title="Transações" right={<Dropdown>Esta semana</Dropdown>} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <MiniTx chip={{ label: 'U', color: '#0D0D0D' }} name="Uber" date="28 jul. · Transporte" amount="− R$ 24,90" />
              <MiniTx chip={{ label: 'iF', color: '#EA1D2C' }} name="iFood" date="28 jul. · Alimentação" amount="− R$ 62,40" />
              <MiniTx chip={{ label: 'V', color: '#660099' }} name="Vivo" date="27 jul. · Outros" amount="− R$ 30,00" />
              <MiniTx chip={{ label: 'S', color: '#1DB954' }} name="Spotify" date="26 jul. · Lazer" amount="− R$ 21,90" />
            </div>
          </Card>
        </div>

        {/* expenses */}
        <Card radius="xl" padding={22}>
          <CardHead title="Despesas" right={<Dropdown>2025</Dropdown>} />
          <BarChart />
        </Card>
      </div>

      {/* right column */}
      <div style={{ width: 340, flexShrink: 0 }}>
        <CardsPanel />
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
