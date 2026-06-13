"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  COLOR_PRESETS,
  CATEGORY_EMOJIS,
  presetKeyFromColorBg,
  type ManagedCategory,
  type ColorPresetKey,
} from "@/types/category";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(30, "Nome muito longo"),
  icon: z.string().min(1, "Escolha um emoji"),
});

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    icon: string;
    colorPreset: ColorPresetKey;
  }) => Promise<void>;
  category?: ManagedCategory | null;
}

export function CategoryModal({
  open,
  onClose,
  onSubmit,
  category,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(CATEGORY_EMOJIS[0]);
  const [colorPreset, setColorPreset] = useState<ColorPresetKey>(
    COLOR_PRESETS[0].key,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!category;
  const palette =
    COLOR_PRESETS.find((p) => p.key === colorPreset) ?? COLOR_PRESETS[0];

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon || CATEGORY_EMOJIS[0]);
      setColorPreset(presetKeyFromColorBg(category.colorBg));
    } else {
      setName("");
      setIcon(CATEGORY_EMOJIS[0]);
      setColorPreset(COLOR_PRESETS[0].key);
    }
    setError("");
  }, [category, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = categorySchema.safeParse({ name, icon });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: result.data.name, icon: result.data.icon, colorPreset });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-[24px] shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-fg">
              {isEditing ? "Editar categoria" : "Nova categoria"}
            </h2>
            <button
              onClick={onClose}
              className="text-fg-muted hover:text-fg cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Preview */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[14px] text-2xl shrink-0"
                style={{ backgroundColor: palette.colorBg, color: palette.colorText }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">
                  {name || "Nome da categoria"}
                </p>
                <p className="text-xs text-fg-muted">Pré-visualização</p>
              </div>
            </div>

            <Input
              id="name"
              label="Nome"
              type="text"
              placeholder="Ex: Pet, Academia, Filhos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              required
            />

            {/* Emoji */}
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">
                Ícone
              </label>
              <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto rounded-[12px] border-[1.5px] border-border p-2">
                {CATEGORY_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-[10px] text-xl transition-colors cursor-pointer hover:bg-subtle",
                      icon === e && "bg-lima/20 ring-2 ring-lima",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">
                Cor
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setColorPreset(p.key)}
                    className={cn(
                      "h-8 w-8 rounded-full transition-transform cursor-pointer hover:scale-110",
                      colorPreset === p.key &&
                        "ring-2 ring-offset-2 ring-offset-surface ring-fg",
                    )}
                    style={{ backgroundColor: p.colorBg }}
                    aria-label={p.key}
                  >
                    <span
                      className="block h-2.5 w-2.5 mx-auto rounded-full"
                      style={{ backgroundColor: p.colorText }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar"
                    : "Criar categoria"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
