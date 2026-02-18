CREATE TABLE "pending_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"activation_code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_registrations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "activation_code";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "activation_code_expires_at";