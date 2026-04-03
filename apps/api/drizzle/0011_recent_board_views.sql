ALTER TABLE "board_user_prefs" ADD COLUMN "last_viewed_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "board_user_prefs_user_id_last_viewed_at_idx" ON "board_user_prefs" USING btree ("user_id","last_viewed_at");
