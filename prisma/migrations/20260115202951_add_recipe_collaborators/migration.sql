-- CreateTable
CREATE TABLE "recipe_collaborators" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_collaborators_recipe_id_user_id_key" ON "recipe_collaborators"("recipe_id", "user_id");

-- AddForeignKey
ALTER TABLE "recipe_collaborators" ADD CONSTRAINT "recipe_collaborators_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_collaborators" ADD CONSTRAINT "recipe_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
