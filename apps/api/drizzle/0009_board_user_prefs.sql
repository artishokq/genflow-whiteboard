CREATE TABLE "board_user_prefs" (
	"board_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_user_prefs_board_id_user_id_pk" PRIMARY KEY("board_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "board_user_prefs" ADD CONSTRAINT "board_user_prefs_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_user_prefs" ADD CONSTRAINT "board_user_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "board_user_prefs_user_id_is_starred_idx" ON "board_user_prefs" USING btree ("user_id","is_starred");
--> statement-breakpoint
DROP INDEX "boards_owner_id_is_starred_idx";
--> statement-breakpoint
ALTER TABLE "boards" DROP COLUMN "is_starred";
