-- Cor do cartão escolhida pelo usuário: chave de preset (ex.: "azul", "roxo").
-- Nullable; nulo = sem escolha, o visual cai no tema derivado da bandeira.
ALTER TABLE "cards" ADD COLUMN "color_preset" TEXT;
