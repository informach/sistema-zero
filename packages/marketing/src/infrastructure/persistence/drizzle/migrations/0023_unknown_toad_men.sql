CREATE TABLE "marketing"."editorial_import_decisions" (
	"run_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"decision" jsonb NOT NULL,
	CONSTRAINT "editorial_import_decisions_run_id_ordinal_pk" PRIMARY KEY("run_id","ordinal")
);
--> statement-breakpoint
ALTER TABLE "marketing"."editorial_import_decisions" ADD CONSTRAINT "editorial_import_decision_entry_fk" FOREIGN KEY ("run_id","ordinal") REFERENCES "marketing"."editorial_import_entries"("run_id","ordinal") ON DELETE no action ON UPDATE no action;