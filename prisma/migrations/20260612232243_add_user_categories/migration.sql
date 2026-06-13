-- Categorias personalizadas por usuário.
-- As categorias do seed permanecem com user_id NULL (categorias de sistema,
-- compartilhadas e read-only). Categorias com user_id são criadas pelo usuário.

-- DropIndex: name/slug deixam de ser únicos globalmente (passam a ser por dono).
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "categories_slug_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex: slug único por dono (NULL = sistema).
CREATE UNIQUE INDEX "categories_user_id_slug_key" ON "categories"("user_id", "slug");

-- AddForeignKey: ao excluir o usuário, suas categorias são removidas em cascata.
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
