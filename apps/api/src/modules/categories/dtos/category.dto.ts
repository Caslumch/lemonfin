import { z } from 'zod';

// Paletas pré-definidas (mesma linguagem visual do seed). O usuário escolhe uma
// chave; o backend resolve para colorBg/colorText. Evita color picker livre e
// mantém consistência com o design.
export const CATEGORY_COLOR_PRESETS = {
  laranja: { colorBg: '#FFF3E0', colorText: '#E65100' },
  azul: { colorBg: '#E3F2FD', colorText: '#1565C0' },
  roxo: { colorBg: '#F3E5F5', colorText: '#7B1FA2' },
  vermelho: { colorBg: '#FBE9E7', colorText: '#BF360C' },
  verde: { colorBg: '#E8F5E9', colorText: '#2E7D32' },
  ciano: { colorBg: '#E0F7FA', colorText: '#00838F' },
  amarelo: { colorBg: '#FFF8E1', colorText: '#F57F17' },
  indigo: { colorBg: '#EDE7F6', colorText: '#4527A0' },
  teal: { colorBg: '#E0F2F1', colorText: '#00695C' },
  cinza: { colorBg: '#F5F5F5', colorText: '#6B6B6B' },
} as const;

export type CategoryColorPreset = keyof typeof CATEGORY_COLOR_PRESETS;

const colorPresetSchema = z.enum(
  Object.keys(CATEGORY_COLOR_PRESETS) as [string, ...string[]],
);

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome e obrigatorio')
    .max(30, 'Nome muito longo'),
  // Emoji (pode ser multi-codepoint com ZWJ); limite generoso.
  icon: z.string().trim().min(1, 'Escolha um emoji').max(16),
  colorPreset: colorPresetSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  icon: z.string().trim().min(1).max(16).optional(),
  colorPreset: colorPresetSchema.optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// Gera slug a partir do nome: minúsculas, sem acentos, separado por hífen.
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
