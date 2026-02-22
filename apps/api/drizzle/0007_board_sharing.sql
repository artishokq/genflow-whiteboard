CREATE TYPE "public"."board_collaborator_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TABLE "board_members" (
	"board_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "board_collaborator_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_members_board_id_user_id_pk" PRIMARY KEY("board_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "board_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"role" "board_collaborator_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_share_links" ADD CONSTRAINT "board_share_links_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_members_user_id_idx" ON "board_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "board_share_links_token_hash_uidx" ON "board_share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "board_share_links_board_id_idx" ON "board_share_links" USING btree ("board_id");