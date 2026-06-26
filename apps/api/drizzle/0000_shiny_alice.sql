CREATE TYPE "public"."batch_item_status" AS ENUM('sellable', 'sold', 'faulty');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('lora-set', 'aso-oke-kimono', 'fringe-bubu', 'naya-jump-suit', 'lumi-set', 'jasmine-set', 'seline-dress', 'aso-oke-pant', 'kora-bubu', 'mina-set');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "product_category" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"sizes" text[] DEFAULT '{}'::text[] NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"notify_me_enabled" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"planned_sale_price" integer NOT NULL,
	"status" "batch_item_status" DEFAULT 'sellable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"production_cost" jsonb NOT NULL,
	"marketing_cost" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_item_id" uuid NOT NULL,
	"sale_price" integer NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_name" text,
	"customer_contact" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_batch_item_id_unique" UNIQUE("batch_item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"product_id" uuid,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_batch_item_id_batch_items_id_fk" FOREIGN KEY ("batch_item_id") REFERENCES "public"."batch_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_featured_idx" ON "products" USING btree ("featured") WHERE "products"."featured" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_items_batch_id_idx" ON "batch_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_items_product_status_idx" ON "batch_items" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_items_sellable_by_product_idx" ON "batch_items" USING btree ("product_id") WHERE "batch_items"."status" = 'sellable';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_batches_created_at_idx" ON "production_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_batch_item_id_idx" ON "sales" USING btree ("batch_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_sold_at_idx" ON "sales" USING btree ("sold_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_product_id_idx" ON "enquiries" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_product_email_unique" ON "waitlist_entries" USING btree ("product_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_product_id_idx" ON "waitlist_entries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_email_idx" ON "waitlist_entries" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");