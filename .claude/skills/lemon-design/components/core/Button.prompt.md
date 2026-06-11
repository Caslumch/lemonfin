A pill/rounded action button — `primary` (lemon) for the main CTA, `grape` for secondary accent actions, `secondary` (black) for high-emphasis neutral, `outline`/`ghost` for low emphasis, `danger` to delete.

```jsx
<Button variant="primary" pill iconLeft={<PlusIcon />}>Nova transação</Button>
<Button variant="secondary" pill>Enviar</Button>
<Button variant="outline" size="sm">Filtrar</Button>
```

Variants: `primary | secondary | grape | outline | ghost | danger`. Sizes: `sm | md | lg`. Booleans: `pill`, `block`, `disabled`. Slots: `iconLeft`, `iconRight`.
