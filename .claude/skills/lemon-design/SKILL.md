---
name: lemonfin-design
description: Use this skill to generate well-branded interfaces and assets for LemonFin (personal-finance app, pt-BR, R$, WhatsApp-first), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `styles.css` — link this one file; it `@import`s all tokens + fonts.
- `tokens/` — colors (lemon `#D4F400` primary, grape `#6C5CE7` secondary, neutrals, finance semantics, category palette), typography (Outfit / DM Sans / JetBrains Mono), spacing/radius/shadow/motion.
- `components/` — React primitives: Button, IconButton, Card, StatCard, Badge, Avatar, Input, Select, Tabs, Switch, NavItem, TransactionRow, CreditCard. Mount via `window.LemonFinDesignSystem_1143b6` after loading `_ds_bundle.js`.
- `ui_kits/lemonfin/` — interactive Dashboard + Transações recreation (the target look).
- `assets/` — logo mark + glyph SVGs.
- `guidelines/` — foundation specimen cards.

## Brand in one breath
Dark shell framing a light rounded panel; lemon-green primary + grape-purple secondary; black accent cards; very round corners; soft low shadows; Outfit display + DM Sans body + tabular mono money. Portuguese (BR), R$, "via WhatsApp" metadata, minimal emoji. Text on lemon is always dark.
