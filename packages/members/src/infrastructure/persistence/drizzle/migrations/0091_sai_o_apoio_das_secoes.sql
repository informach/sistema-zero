-- Derruba a coluna dos "materiais de apoio", ja vazia de sentido desde a 0090.
--
-- ⚠️⚠️ ESTA MIGRACAO SOBE NA RELEASE SEGUINTE a 0090, nunca junto. O codigo ANTIGO le
-- `support_block_ids` em toda carga de aula (`getStructure`); derrubar a coluna com os pods
-- antigos ainda no ar quebraria a leitura de aula durante a troca. Na 0090 o codigo novo ja parou
-- de le-la e de escreve-la, entao aqui ela e so peso morto.
--
-- Rodar a 0090 e esta juntas so e aceitavel com a aula fora do ar (ou aceitando alguns segundos
-- de 500 na troca) — e ai a decisao e da dona, nao do deploy automatico.
ALTER TABLE "members"."lesson_structures" DROP COLUMN "support_block_ids";