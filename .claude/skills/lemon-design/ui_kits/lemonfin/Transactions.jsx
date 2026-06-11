/* LemonFin — Transações (refactored in the new visual language). */
const TX_DS = window.LemonFinDesignSystem_1143b6;

function Transactions() {
  const { StatCard, IconButton, Button, Tabs, Select, Input, TransactionRow } = TX_DS;
  const Ic = window.LFIcons;
  const [tab, setTab] = React.useState('todas');
  const [rows, setRows] = React.useState([
    { id: 1, title: 'Gasto com Uber', category: 'transporte', categoryLabel: 'Transporte', meta: '10 de jun. · Lucas · via WhatsApp', amount: 20, type: 'expense' },
    { id: 2, title: 'Salário', category: 'salario', categoryLabel: 'Salário', meta: '05 de jun. · Lucas', amount: 4200, type: 'income' },
    { id: 3, title: 'Gastei 20', category: 'outros', categoryLabel: 'Outros', meta: '10 de jun. · Lucas · via WhatsApp', amount: 20, type: 'expense' },
    { id: 4, title: 'chip da vivo', category: 'outros', categoryLabel: 'Outros', meta: '10 de jun. · Lucas · via WhatsApp', amount: 30, type: 'expense' },
    { id: 5, title: 'Almoço iFood', category: 'alimentacao', categoryLabel: 'Alimentação', meta: '09 de jun. · Lucas · via WhatsApp', amount: 62.4, type: 'expense' },
  ]);

  const visible = rows.filter((r) =>
    tab === 'todas' ? true : tab === 'despesas' ? r.type === 'expense' : r.type === 'income');

  const remove = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, position: 'relative' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Transações</h1>
        <Button variant="primary" pill iconLeft={React.createElement(Ic.plus, { size: 18 })}>Nova transação</Button>
      </div>

      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Entradas" value="R$ 4.200,00" sub="1 transação" valueColor="success" iconTone="success" icon={React.createElement(Ic.trendUp)} />
        <StatCard label="Saídas" value="R$ 132,40" sub="4 transações" valueColor="danger" iconTone="danger" icon={React.createElement(Ic.trendDn)} />
        <StatCard label="Fatura cartão" value="R$ 30,00" sub="aberta" valueColor="warning" iconTone="warning" icon={React.createElement(Ic.card)} />
        <StatCard tone="dark" label="Saldo" value="R$ 4.067,60" sub="este mês" icon={React.createElement(Ic.wallet)} />
      </div>

      {/* filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'todas', label: 'Todas' }, { value: 'despesas', label: 'Despesas' }, { value: 'receitas', label: 'Receitas' }]} />
        <div style={{ width: 200 }}>
          <Select placeholder="Todas categorias" options={['Transporte', 'Alimentação', 'Moradia', 'Lazer', 'Salário', 'Outros']} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 150 }}><Input type="date" /></div>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>até</span>
          <div style={{ width: 150 }}><Input type="date" /></div>
        </div>
      </div>

      {/* rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((r) => (
          <TransactionRow
            key={r.id}
            title={r.title}
            category={r.category}
            categoryLabel={r.categoryLabel}
            meta={r.meta}
            amount={r.amount}
            type={r.type}
            onEdit={() => {}}
            onDelete={() => remove(r.id)}
          />
        ))}
        {visible.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>Nenhuma transação neste filtro.</div>
        )}
      </div>

      {/* bot FAB */}
      <button style={{
        position: 'fixed', right: 34, bottom: 30, width: 60, height: 60,
        borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
        background: 'var(--lemon-400)', color: 'var(--dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-lemon)',
      }} aria-label="Assistente">
        {React.createElement(window.LFIcons.bot, { size: 28 })}
      </button>
    </div>
  );
}

window.Transactions = Transactions;
