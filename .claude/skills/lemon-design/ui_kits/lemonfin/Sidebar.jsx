/* LemonFin sidebar — dark rail inside the shell. Logo, labeled nav, footer. */
const { NavItem, Avatar } = window.LemonFinDesignSystem_1143b6;

function Sidebar({ active, onNavigate }) {
  const Ic = window.LFIcons;
  const items = [
    { id: 'home', label: 'Home', icon: Ic.home },
    { id: 'transactions', label: 'Transações', icon: Ic.swap },
    { id: 'categories', label: 'Categorias', icon: Ic.layers },
    { id: 'cards', label: 'Cartões', icon: Ic.card },
    { id: 'goals', label: 'Metas', icon: Ic.target },
    { id: 'insights', label: 'Insights', icon: Ic.bulb },
    { id: 'settings', label: 'Configurações', icon: Ic.gear },
  ];

  return (
    <aside style={{
      width: 248, flexShrink: 0, alignSelf: 'stretch',
      background: 'var(--shell-sidebar)',
      display: 'flex', flexDirection: 'column',
      padding: '26px 18px 22px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px', marginBottom: 30 }}>
        <img src="../../assets/lemonfin-mark.svg" alt="" style={{ width: 34, height: 34 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, color: '#fff', letterSpacing: '-0.02em' }}>LemonFin</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((it) => (
          <NavItem
            key={it.id}
            tone="dark"
            icon={React.createElement(it.icon)}
            label={it.label}
            active={active === it.id}
            onClick={() => onNavigate(it.id)}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        <NavItem tone="dark" icon={React.createElement(Ic.sun)} label="Claro" onClick={() => {}} />
        <NavItem tone="dark" icon={React.createElement(Ic.logout, { style: { transform: 'scaleX(-1)' } })} label="Recolher" onClick={() => {}} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 8px 0', borderTop: '1px solid var(--border-dark)' }}>
        <Avatar name="Lucas Machado" size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Lucas Machado</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-on-dark-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>caslumach@gmail.com</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
