ALTER TABLE "boards" ADD COLUMN "is_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "boards_owner_id_is_starred_idx" ON "boards" USING btree ("owner_id","is_starred");