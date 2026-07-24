-- Metadado do PROJETO nos posts de vitrine do Estúdio (snapshot no publish):
-- {"pro": boolean, "extensions": string[]} — alimenta o selo "remix a partir do
-- nível X" no card do Mural. COSMÉTICO (o gate real do remix é a checagem no
-- clique sobre o snapshot jogável); nullable = posts antigos/sem projeto.
-- Escrita à MÃO (o db:generate re-emitiria colunas antigas por drift do snapshot).
ALTER TABLE "hub"."threads" ADD COLUMN IF NOT EXISTS "studio_meta" jsonb;
