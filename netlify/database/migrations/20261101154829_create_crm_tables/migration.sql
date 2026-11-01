CREATE TABLE "activities" (
	"id" serial PRIMARY KEY,
	"contact_id" integer NOT NULL,
	"kind" text DEFAULT 'note' NOT NULL,
	"body" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" serial PRIMARY KEY,
	"thread_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY,
	"company" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"sector" text DEFAULT '' NOT NULL,
	"service" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT 'lead' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"deal_value" numeric(12,2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_retainer" integer DEFAULT 0 NOT NULL,
	"nps" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"label" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"current" numeric(14,2) DEFAULT '0' NOT NULL,
	"target_6m" numeric(14,2) DEFAULT '0' NOT NULL,
	"target_12m" numeric(14,2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY,
	"code" text UNIQUE,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"division" text NOT NULL,
	"priority" text DEFAULT 'high' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"owner" text DEFAULT '' NOT NULL,
	"kpi" text DEFAULT '' NOT NULL,
	"cadence" text DEFAULT '' NOT NULL,
	"due_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activities_contact_idx" ON "activities" ("contact_id");--> statement-breakpoint
CREATE INDEX "agent_messages_thread_idx" ON "agent_messages" ("thread_id");--> statement-breakpoint
CREATE INDEX "contacts_stage_idx" ON "contacts" ("stage");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;