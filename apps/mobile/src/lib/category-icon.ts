import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

// Ícone vetorial (monocromático, estilo banco) por categoria — derivado do NOME
// (mais confiável), com fallback por emoji legado e um genérico. Substitui os
// emojis, deixando o app com cara mais profissional.
const NAME_RULES: [RegExp, IconName][] = [
  [/internet|wi-?fi|net\b|telefone|celular|tim|vivo|claro/i, "wifi-outline"],
  [/mora|casa|alug|rent|condom|luz|água|agua|energia|conta de/i, "home-outline"],
  [/transp|carro|gasolin|combust|uber|99|ônibus|onibus|metrô|metro|moto|estacion|pedágio|pedagio/i, "car-outline"],
  [/aliment|comida|mercado|superm|restaur|padaria|lanch|ifood|food|bar\b|café|cafe/i, "restaurant-outline"],
  [/educ|faculd|curso|escola|livro|estud|inglês|ingles|aula|mensalidade/i, "school-outline"],
  [/saúde|saude|médic|medic|farm|hospital|dent|academia|gym|plano de|seguro/i, "fitness-outline"],
  [/netflix|spotify|streaming|cinema|filme|séries|series|disney|prime|hbo|max\b/i, "film-outline"],
  [/lazer|jogo|game|viag|festa|show|passeio/i, "game-controller-outline"],
  [/salár|salar|renda|pagamento|freela|receb|pró-labore|pro-labore|prolabore|comiss/i, "cash-outline"],
  [/invest|aç(ã|õ)es|acoes|cripto|bolsa|renda fixa|poupan|dividend/i, "trending-up-outline"],
  [/roupa|vestu|compra|shopping|loja|presente|magaz/i, "bag-handle-outline"],
  [/pet|animal|cachorr|gato|veterin|ração|racao/i, "paw-outline"],
  [/hotel|passag|turismo|airbnb|avião|aviao|voo/i, "airplane-outline"],
  [/imposto|taxa|tarifa|juros|fatura|cartão|cartao|banco|empréstimo|emprestimo|financ/i, "card-outline"],
  [/trabalho|escrit|serviç|servic|assinat/i, "briefcase-outline"],
];

const EMOJI_MAP: Record<string, IconName> = {
  "🏠": "home-outline", "🏡": "home-outline",
  "🚗": "car-outline", "🚙": "car-outline", "⛽": "car-outline", "🏍️": "car-outline",
  "🍔": "restaurant-outline", "🍽️": "restaurant-outline", "🛒": "cart-outline",
  "📚": "school-outline", "🎓": "school-outline", "✏️": "school-outline",
  "⚕️": "fitness-outline", "💊": "medkit-outline", "🏥": "medkit-outline", "🏋️": "fitness-outline",
  "🎮": "game-controller-outline", "🎬": "film-outline", "🎉": "sparkles-outline", "📺": "film-outline",
  "💰": "cash-outline", "💵": "cash-outline", "💸": "cash-outline", "🤑": "cash-outline",
  "📈": "trending-up-outline", "📊": "bar-chart-outline",
  "👕": "shirt-outline", "🛍️": "bag-handle-outline", "🎁": "gift-outline",
  "🐶": "paw-outline", "🐾": "paw-outline", "🐱": "paw-outline",
  "✈️": "airplane-outline", "🏨": "bed-outline",
  "📌": "pricetag-outline", "🏷️": "pricetag-outline", "🔁": "repeat-outline",
  "💳": "card-outline", "🎯": "flag-outline",
};

const DEFAULT: IconName = "pricetag-outline";

export function categoryIonicon(name?: string | null, icon?: string | null): IconName {
  if (name) {
    for (const [re, ic] of NAME_RULES) if (re.test(name)) return ic;
  }
  if (icon && EMOJI_MAP[icon]) return EMOJI_MAP[icon];
  return DEFAULT;
}
