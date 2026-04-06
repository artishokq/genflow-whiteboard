CREATE TABLE "board_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_section_items" (
	"section_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_section_items_section_id_board_id_pk" PRIMARY KEY("section_id","board_id")
);
--> statement-breakpoint
ALTER TABLE "board_sections" ADD CONSTRAINT "board_sections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_section_items" ADD CONSTRAINT "board_section_items_section_id_board_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."board_sections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_section_items" ADD CONSTRAINT "board_section_items_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "board_sections_user_id_position_idx" ON "board_sections" USING btree ("user_id","position");
--> statement-breakpoint
CREATE INDEX "board_sections_user_id_name_idx" ON "board_sections" USING btree ("user_id","name");
--> statement-breakpoint
CREATE INDEX "board_section_items_section_id_position_idx" ON "board_section_items" USING btree ("section_id","position");
--> statement-breakpoint
CREATE INDEX "board_section_items_board_id_idx" ON "board_section_items" USING btree ("board_id");
