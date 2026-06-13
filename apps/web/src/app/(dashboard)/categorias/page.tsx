"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Layers } from "lucide-react";
import { ContentHeader } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { CategoryIconWithBg } from "@/components/ui/category-icon";
import { CategoryModal } from "@/components/categories/category-modal";
import { DeleteCategoryModal } from "@/components/categories/delete-category-modal";
import { useApi } from "@/hooks/use-api";
import { logApiError } from "@/lib/log-error";
import type { ManagedCategory, ColorPresetKey } from "@/types/category";

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: ManagedCategory;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-border bg-surface shadow-xs p-3 transition-colors hover:border-fg/20">
      <CategoryIconWithBg
        slug={category.slug}
        icon={category.icon}
        colorBg={category.colorBg}
        colorText={category.colorText}
      />
      <p className="flex-1 min-w-0 truncate text-sm font-medium text-fg">
        {category.name}
      </p>
      {category.editable ? (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-fg-muted hover:text-danger hover:bg-danger-muted transition-colors cursor-pointer"
            aria-label="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">
          padrão
        </span>
      )}
    </div>
  );
}

export default function CategoriasPage() {
  const { fetchApi } = useApi();

  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [deleting, setDeleting] = useState<ManagedCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<ManagedCategory[]>("/categories");
      setCategories(data);
    } catch (error) {
      logApiError("load:categories", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleCreate(data: {
    name: string;
    icon: string;
    colorPreset: ColorPresetKey;
  }) {
    try {
      await fetchApi("/categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Categoria criada");
      fetchCategories();
    } catch {
      toast.error("Erro ao criar categoria");
      throw new Error("create failed");
    }
  }

  async function handleUpdate(data: {
    name: string;
    icon: string;
    colorPreset: ColorPresetKey;
  }) {
    if (!editing) return;
    try {
      await fetchApi(`/categories/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditing(null);
      toast.success("Categoria atualizada");
      fetchCategories();
    } catch {
      toast.error("Erro ao atualizar categoria");
      throw new Error("update failed");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await fetchApi(`/categories/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      toast.success("Categoria removida");
      fetchCategories();
    } catch {
      toast.error("Erro ao remover categoria");
    }
  }

  const custom = categories.filter((c) => c.editable);
  const system = categories.filter((c) => !c.editable);

  return (
    <>
      <ContentHeader
        title="Categorias"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + Nova categoria
          </Button>
        }
      />

      <div className="px-5 pb-8 pt-2 md:px-8">
        {loading ? (
          <div className="rounded-[20px] border border-border bg-surface shadow-xs p-12 text-center">
            <p className="text-fg-muted text-sm">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-fg-muted mb-3">
                Minhas categorias
              </h2>
              {custom.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-border bg-surface p-8 text-center">
                  <Layers size={32} className="mx-auto text-fg-muted mb-2" />
                  <p className="text-fg-muted text-sm">
                    Você ainda não criou categorias.
                  </p>
                  <p className="text-fg-muted text-xs mt-1">
                    Crie categorias próprias (ex: Pet, Academia) para organizar
                    seus gastos do seu jeito.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {custom.map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      onEdit={() => {
                        setEditing(c);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeleting(c)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-fg-muted mb-3">
                Padrão
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {system.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        category={editing}
      />

      <DeleteCategoryModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        categoryName={deleting?.name}
      />
    </>
  );
}
