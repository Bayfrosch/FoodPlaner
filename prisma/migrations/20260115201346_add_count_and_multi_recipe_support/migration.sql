/*
  Warnings:

  - You are about to drop the column `recipe_id` on the `shopping_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `recipe_name` on the `shopping_list_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "recipe_items" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "shopping_list_items" DROP COLUMN "recipe_id",
DROP COLUMN "recipe_name",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recipe_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "recipe_names" TEXT[] DEFAULT ARRAY[]::TEXT[];
