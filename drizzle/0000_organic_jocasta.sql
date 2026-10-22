CREATE TYPE "public"."user_status" AS ENUM('invited', 'active');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"email" varchar(254),
	"password_hash" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"is_superadmin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
