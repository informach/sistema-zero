# Promoção das aulas, materiais e alças para produção

Runbook registrado em 19/09/2026. **Não é autorização para executar o deploy agora.** A promoção
depende de aprovação explícita, janela de acompanhamento, backup verificável e CI verde. Este
documento registra o estado medido e a ordem segura; antes de usar, refaça as consultas porque
`main`, os bancos e os serviços podem ter mudado.

## Estado medido em 19/09/2026

- `production`: Members no commit `5734facb`; journal de Members com 76 entradas, último
  carimbo `1788738340499`, correspondente à `0075_creation-format-version`. Ainda **não** existem
  `members.lesson_structures` nem `members.lesson_drafts`. Existem 37 aulas, 65 blocos e 7 anexos.
- `staging`: Members tinha aplicado a `0091` (carimbo `1789814273530`) e já não tinha a coluna
  `support_block_ids`. Houve 409 falso ao publicar rascunhos antigos porque o hash do publicado
  ainda incluía o campo removido. Os quatro hashes obsoletos detectados em staging foram
  reconciliados após conferir o valor antigo exato; os sete rascunhos então ficaram coerentes.
- O código desta **primeira release** termina seu journal na `0090_bloco_materiais`. A `0091`
  foi retirada do journal, do SQL e do snapshot desta release porque removê-la durante a troca
  de pods faria o Members antigo ler uma coluna inexistente. Os artefatos originais estão no
  commit `77195b9f`, para uma **segunda release**. Staging já aplicou a `0091` anteriormente;
  reaplicar o mesmo carimbo depois não deve fazer nada naquele banco.

## Antes de qualquer publicação

1. Confirmar backup/snapshot recente do Postgres de produção e testar que há um caminho de
   restauração. Congelar edições de aulas durante a janela de migração e backfill.
2. Confirmar o SHA de `main`, o CI desse SHA e o SHA efetivo de cada serviço no Railway. O
   workflow `Deploy produção` sempre usa o SHA **atual de `main`**, mesmo se for acionado com
   `--ref staging`; não pode haver merge novo em `main` durante a sequência.
3. Confirmar no código promovido que o último item de
   `packages/members/src/infrastructure/persistence/drizzle/migrations/meta/_journal.json`
   é **0090**, não 0091. A trava em `migrations-journal.test.ts` protege essa condição.
4. Consultar novamente `drizzle.members_migrations`, a existência de
   `members.lesson_structures`/`members.lesson_drafts` e a coluna `support_block_ids`.
   Se o estado divergir do acima, reavaliar o plano; não assumir que um comando verde implica
   migração aplicada. O journal do projeto usa o `created_at` como marca d'água.
5. Verificar os demais serviços e migrations entre a 0075 e a 0090. A diferença de produção
   para staging é grande; esta lista trata especificamente das aulas e não substitui o review
   do restante do release.

## Release A: migrar sem remover a coluna antiga

1. Promover para `main` o código testado cujo journal termina na **0090**. Rodar CI da `main`.
2. Acionar o workflow de produção **somente para Members**:

   ```powershell
   gh workflow run "Deploy produção" --ref main -f services=members
   ```

   O `preDeployCommand` do Members executa `db:migrate`. A 0090 adiciona o tipo `materials`,
   move os antigos IDs de apoio para a última seção e **preserva** `support_block_ids` para
   os pods antigos. Conferir no journal do banco o carimbo `1789814248293`, a existência da
   coluna e o healthcheck `/readyz`. Esperar os pods antigos saírem.
3. Publicar o `api-gateway` e, depois de saudável, `admin`, `community` e `community-kids`
   no mesmo SHA de `main`, conforme serviços realmente afetados. Usar `Deploy produção` com
   CSV de serviços por etapa; **não usar `services=all` simultaneamente ao Members**, para
   não criar uma corrida entre APIs, frontends e migrations. Conferir `SUCCESS` e SHA de cada
   serviço e testar: abrir aula existente, editar/salvar rascunho, publicar aula em rascunho e
   republicar aula publicada. Nenhum teste deve alterar aula real sem combinação prévia;
   usar aula de teste/controlada.
4. No contêiner **novo** do Members, entrar com
   `railway ssh -e production -s members`, ir a `/app/packages/members` e executar:

   ```bash
   bun run materials:backfill
   # Revisar as contagens e os IDs informados. Só então:
   bun run materials:backfill -- --apply
   bun run materials:backfill
   ```

   O dry-run final deve ter zero pendências/erros. O script só cria bloco de materiais para
   aula **publicada** com anexo e sem bloco de materiais; anexo sem seção é erro a investigar,
   não motivo para inventar uma seção. Confirmar que os 7 anexos conhecidos (ou a nova
   contagem real) continuam acessíveis, que o bloco de livro 3D cria o material da aula e que
   o PDF baixado contém a marca d'água do comprador. Se a marca d'água falhar ou o arquivo
   exceder o limite, o download deve ser bloqueado, nunca entregar o original sem identificação.
5. Ainda no Members novo, executar a reconciliação de hash. A mudança de hash vem do **código**
   que deixou de incluir `supportBlockIds`, não depende de a coluna física já ter sido removida:

   ```bash
   bun run drafts:rebase-revisions
   # Aplicar somente se conflict=0 e missing=0, após revisar o resumo:
   bun run drafts:rebase-revisions -- --apply
   bun run drafts:rebase-revisions
   ```

   Esperado: `pending=0`, `conflict=0`, `missing=0`. Com 409 real, `conflict` ou `missing`,
   parar e analisar o rascunho individualmente; **não sobrescrever seu documento**. O script
   só muda `published_revision` quando o hash antigo bate exatamente com o publicado atual
   acrescido do campo removido vazio. Não altera revisão de edição nem publica aula.
6. Conferir UI das alças em Kids (aula, Estúdio, Pensa, Pinta, Molda, avatar, quarto) e Adulto
   (lista de aulas), nos dois estados; sem botão duplicado e sem obstruir controles. Conferir
   teclado, celular/tablet e contraste. Fazer smoke de publicar rascunho no Admin e de ler o
   conteúdo publicado no Kids/Adulto.

## Release B: remover a coluna, só depois da estabilidade da A

1. Confirmar que a Release A está estável, todos os pods antigos do Members saíram, o backfill
   terminou e os testes de publicação não dão 409 indevido.
2. Em **novo commit/PR**, restaurar do commit `77195b9f` os três artefatos da 0091: SQL,
   `meta/0091_snapshot.json` e entrada `0091_sai_o_apoio_das_secoes` do journal, com o
   **mesmo carimbo `1789814273530`**. Retirar a trava temporária do teste de journal e atualizar
   estas notas. Não gerar uma nova 0091 com outro carimbo: staging já aplicou a original, e uma
   segunda migração `DROP COLUMN` não idempotente falharia ali. Não gerar outra migration entre
   as releases A e B que reutilize o índice 0091.
3. Rodar testes de migration/CI em staging, confirmar que o Members de staging continua saudável
   (0091 já aplicada), promover o segundo commit para `main` e acionar `Deploy produção` para
   `members`. Conferir que a coluna saiu em produção, journal chegou a `1789814273530`,
   `/readyz` responde e as aulas abrem. Testar novamente a publicação pelo Admin.

## Critérios de parada e recuperação

- Migration não aplicada apesar de `db:migrate` verde, erro de enum/coluna ou healthcheck ruim:
  **não** avançar para frontends nem para a release B. Conferir journal, logs e schema real.
- `materials:backfill` com aula sem seção, ou `drafts:rebase-revisions` com conflito: parar a
  operação respectiva e tratar caso a caso. Não editar dados de rascunho às cegas.
- O rollback de código **não reverte automaticamente migrations ou backfill**. Preferir correção
  adiante, preservando a coluna na Release A, e manter o backup até a Release B ser validada.
- Não publicar em produção apenas porque o deploy de staging passou. A aprovação da promoção,
  o backup, a sequência de dois releases e os smokes continuam obrigatórios.
