-- O rascunho do Estúdio e do Pinta DENTRO da fase passa a ser "guardado na sua conta" (10/10/2026):
-- o enum `creation_tool` recebe dois valores, no FIM (espelho de `CREATION_TOOLS`).
--
-- ⚠️ ADD VALUE só ADICIONA o rótulo; nada nesta migração o ESCREVE (o Postgres recusa escrever um
-- valor de enum adicionado na mesma transação, 55P04, e o drizzle roda as pendentes numa transação
-- só). As colunas da impressão digital ficam na 0101.
--
-- ⚠️ O members sobe ANTES do kids: sem o valor, a reserva `lesson-studio` falha com
-- `invalid input value for enum` e a fila do navegador retenta.
ALTER TYPE "members"."creation_tool" ADD VALUE IF NOT EXISTS 'lesson-studio';--> statement-breakpoint
ALTER TYPE "members"."creation_tool" ADD VALUE IF NOT EXISTS 'lesson-pinta';
