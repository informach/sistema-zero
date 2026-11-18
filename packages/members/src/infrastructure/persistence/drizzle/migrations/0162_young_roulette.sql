ALTER TABLE "members"."cenario_blobs" DROP CONSTRAINT "cenario_blobs_terreno_check";--> statement-breakpoint
ALTER TABLE "members"."cenario_blobs" ADD CONSTRAINT "cenario_blobs_terreno_check" CHECK (case when "members"."cenario_blobs"."tipo" = 'terreno' then
        "members"."cenario_blobs"."bytes" in (8474, 520, 4233, 8458, 12683, 16908, 21133, 25358, 29583, 33808)
        and ("members"."cenario_blobs"."confirmado_em" is null or (
          "members"."cenario_blobs"."terreno" is not null and (
            ("members"."cenario_blobs"."bytes" = 8474 and not ("members"."cenario_blobs"."terreno" ? 'tipo') and
              jsonb_typeof("members"."cenario_blobs"."terreno" -> 'min') = 'number' and jsonb_typeof("members"."cenario_blobs"."terreno" -> 'max') = 'number' and
              ("members"."cenario_blobs"."terreno" ->> 'min')::numeric >= -10000 and ("members"."cenario_blobs"."terreno" ->> 'max')::numeric <= 10000 and
              ("members"."cenario_blobs"."terreno" ->> 'min')::numeric < ("members"."cenario_blobs"."terreno" ->> 'max')::numeric) or
            ("members"."cenario_blobs"."bytes" = 520 and "members"."cenario_blobs"."terreno" ->> 'tipo' = 'buracos') or
            ("members"."cenario_blobs"."terreno" ->> 'tipo' = 'pintura' and jsonb_typeof("members"."cenario_blobs"."terreno" -> 'camadas') = 'number' and
              ("members"."cenario_blobs"."terreno" ->> 'camadas')::numeric between 1 and 8 and
              ("members"."cenario_blobs"."terreno" ->> 'camadas')::numeric = trunc(("members"."cenario_blobs"."terreno" ->> 'camadas')::numeric) and
              "members"."cenario_blobs"."bytes" = 8 + 4225 * ("members"."cenario_blobs"."terreno" ->> 'camadas')::numeric)
          )
        ) is true) else "members"."cenario_blobs"."terreno" is null end);