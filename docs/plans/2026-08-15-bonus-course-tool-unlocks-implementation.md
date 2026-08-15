# Plano de implementação: ferramentas de cursos bônus

**Desenho aprovado:** `docs/plans/2026-08-15-bonus-course-tool-unlocks-design.md`

## Objetivo

Liberar `metadata.studioUnlockBlocks` quando uma criança conclui um curso Kids bônus, sem exigir publicação no Mural. Cursos Kids com posição na carreira continuam exigindo `course_complete` e `course_showcased`. Cursos Adult, níveis e acesso aos aplicativos permanecem inalterados.

Esta mudança reutiliza o ledger e os grants existentes. Ela não exige migração de banco, backfill ou novo evento.

## Etapa 1 — Fixar a nova regra nos testes de domínio

**Arquivos:**

- `packages/members/tests/unit/studio-unlocks.test.ts`
- `packages/members/tests/fakes/in-memory.ts`

1. Permitir que a fábrica de curso do teste crie cursos com `careerSlot` configurável.
2. Substituir o caso genérico “concluir sem publicar não libera” por dois casos explícitos:
   - curso Kids com posição continua bloqueado sem Mural;
   - curso Kids bônus libera ao concluir.
3. Cobrir bônus apenas publicado, bônus com os dois marcos, deduplicação e permanência do grant.
4. Cobrir as duas mudanças de classificação usando o catálogo vivo:
   - bônus para carreira;
   - carreira para bônus.
5. Preservar um caso Adult para impedir que `careerSlot = null` ative a regra Kids.
6. Ajustar o fake para aplicar a mesma política da consulta SQL.

**Verificação:**

```sh
bun test packages/members/tests/unit/studio-unlocks.test.ts
```

Os novos testes devem falhar antes da alteração do repositório e passar depois dela.

## Etapa 2 — Alterar a seleção ao vivo dos cursos que entregam ferramentas

**Arquivos:**

- `packages/members/src/domain/ports/gamification-repository.port.ts`
- `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`
- `packages/members/tests/fakes/in-memory.ts`

1. Atualizar o contrato e os comentários de `listStudioUnlocksByCourse`: “elegível para ferramentas” deixa de ser sinônimo de “qualificado para a carreira”.
2. Trocar o `innerJoin` obrigatório de `course_showcased` por uma associação opcional na consulta de ferramentas.
3. Aceitar uma linha concluída quando:
   - a audiência é Kids e o curso vivo tem `careerSlot = null`; ou
   - existe `course_showcased` para o mesmo perfil, audiência e curso.
4. Manter o `innerJoin` com o curso vivo, o filtro por audiência, a leitura de `studioUnlockBlocks` e a deduplicação por curso.
5. Manter `listQualifyingCareerSlots` intacto. A carreira continua usando a interseção dos dois marcos.
6. Espelhar a condição no repositório em memória para que testes de serviço e HTTP representem o PostgreSQL.

**Cuidados:**

- Use o `careerSlot` vivo para respeitar reclassificações feitas no Admin.
- Trate cursos `lenda` sem posição como bônus Kids.
- Não inclua cursos apenas publicados; `course_complete` continua sendo a origem da consulta.
- Não mude `studio_block_grants`; ele já preserva ferramentas servidas.

## Etapa 3 — Fazer a revisão da paleta mudar no término do bônus

**Arquivos:**

- `packages/members/src/domain/gamification/studio-unlock-revision.ts`
- `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`
- `packages/members/tests/fakes/in-memory.ts`
- `packages/members/tests/integration/gamification.test.ts`

1. Tornar `showcasedAt` anulável em `StudioUnlockRevisionSource`.
2. Canonizar a ausência de publicação como `null` no hash.
3. Aplicar em `getStudioUnlockRevision` a mesma política usada por `listStudioUnlocksByCourse`.
4. Provar que a revisão de um bônus muda após `course_complete`, sem webhook do Mural.
5. Provar que a revisão de um curso com posição só muda para incluir o curso depois de `course_showcased`.
6. Provar que editar `studioUnlockBlocks` altera a revisão de qualquer curso já elegível.

Isso mantém a comemoração existente: quando a revisão muda, o `CelebrationWatcher` busca a paleta, compara os blocos e mostra apenas ferramentas inéditas.

**Verificação:**

```sh
bun test packages/members/tests/integration/gamification.test.ts
```

## Etapa 4 — Cobrir a borda HTTP

**Arquivo:** `packages/members/tests/integration/studio-unlocks-route.test.ts`

1. Adicionar um bônus Kids concluído sem Mural e esperar seus blocos.
2. Manter o caso de curso com posição concluído sem Mural esperando uma lista vazia.
3. Adicionar bônus apenas publicado esperando uma lista vazia.
4. Confirmar que dois cursos elegíveis somam blocos sem duplicar.
5. Confirmar segregação por perfil e audiência.

**Verificação:**

```sh
bun test packages/members/tests/integration/studio-unlocks-route.test.ts
```

## Etapa 5 — Explicar a regra no Admin

**Arquivo:** `packages/admin/src/app/admin/membros/cursos/course-form-dialog.tsx`

1. Trocar o tooltip fixo do seletor de ferramentas por um texto derivado de `form.careerSlot`:
   - vazio: libera após concluir todas as aulas;
   - preenchido: libera após concluir e publicar no Mural.
2. Exibir a mesma regra em uma linha curta abaixo do seletor, inclusive quando nenhum bloco estiver escolhido.
3. Preservar o aviso de vitrine, o picker, a deduplicação e os demais campos do formulário.
4. Atualizar os comentários locais que ainda afirmam que todo curso exige os dois marcos.

Não é necessário criar uma nova opção no formulário ou alterar o DTO do Admin.

## Etapa 6 — Atualizar a documentação viva

**Arquivos:**

- `docs/carreira-do-criador.md`
- `packages/members/CLAUDE.md`
- `packages/community-kids/src/lib/career-rewards.ts`
- `packages/community-kids/src/components/kids/my-tools.tsx`
- `packages/community-kids/src/components/kids/tools-celebration.tsx`

1. Separar “qualificação da carreira” de “elegibilidade para ferramentas”.
2. Registrar que somente bônus Kids usa `course_complete` isolado.
3. Manter as garantias de união cumulativa, grant permanente e atualização automática do currículo.
4. Corrigir comentários e textos que afirmam que todos os cursos precisam do Mural para entregar ferramentas.

## Etapa 7 — Verificação final

Executar primeiro os testes direcionados e depois as verificações dos pacotes afetados:

```sh
bun test packages/members/tests/unit/studio-unlocks.test.ts
bun test packages/members/tests/integration/studio-unlocks-route.test.ts
bun test packages/members/tests/integration/gamification.test.ts
bun run --filter @sistemazero/members typecheck
bun run --filter @sistemazero/admin typecheck
bun run --filter @sistemazero/community-kids typecheck
bun run --filter @sistemazero/members check
bun run --filter @sistemazero/admin check
bun run --filter @sistemazero/community-kids check
```

Se houver banco de teste configurado, acrescentar um teste do repositório Drizzle que grave um bônus Kids concluído sem `course_showcased` e confirme a seleção. Isso prova o `leftJoin` e o predicado real, além do comportamento já coberto pelos fakes.

## Critérios de aceite

- Concluir todas as aulas de um bônus Kids libera os blocos configurados nele.
- O bônus não altera nível, posição ou progresso da Carreira do Criador.
- Um curso Kids com posição continua dependendo do Mural para liberar ferramentas e qualificar a carreira.
- Cursos Adult preservam o comportamento atual.
- Ferramentas já servidas nunca desaparecem após edição, despublicação, exclusão ou reclassificação do curso.
- A comemoração de ferramentas aparece após a próxima atualização de navegação que sucede a conclusão do bônus.
- Nenhuma migração ou backfill é necessário.
