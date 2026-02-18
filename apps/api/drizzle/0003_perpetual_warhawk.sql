ALTER TABLE "users" ADD COLUMN "activation_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activation_code_expires_at" timestamp with time zone;