CREATE TYPE "public"."board_comment_thread_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "board_comment_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_comment_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"anchor_x" double precision NOT NULL,
	"anchor_y" double precision NOT NULL,
	"status" "board_comment_thread_status" DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_comment_messages" ADD CONSTRAINT "board_comment_messages_thread_id_board_comment_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."board_comment_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_comment_messages" ADD CONSTRAINT "board_comment_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_comment_threads" ADD CONSTRAINT "board_comment_threads_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_comment_threads" ADD CONSTRAINT "board_comment_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_comment_messages_thread_id_idx" ON "board_comment_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "board_comment_messages_author_id_idx" ON "board_comment_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "board_comment_threads_board_id_idx" ON "board_comment_threads" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_comment_threads_created_by_idx" ON "board_comment_threads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "board_comment_threads_status_idx" ON "board_comment_threads" USING btree ("status");