# Live Workshop Block Grants Implementation Plan

> **For agentic workers:** Execute task by task with review checkpoints using the executing-plans workflow.

**Goal:** Conceder as recompensas de blocos ao concluir oficinas, mantendo a licença do Estúdio Completo independente.

**Architecture:** Reutilizar `live_course_complete`, `eligibleStudioGrants` e o ledger de concessões congeladas. Admin configura a recompensa no curso; a transação de conclusão preserva a conquista antes de qualquer acesso ao produto livre.

**Tech Stack:** TypeScript, Elysia, Drizzle/PostgreSQL, React, Bun.

**Spec:** [Desenho aprovado](../../plans/2026-10-22-live-workshop-block-grants-design.md).

## Restrições

- Parear modalidade e evento; não transformar oficinas em marcos da Jornada.
- Conquista não concede produto, Ponte/Pro ou autoridade de runtime.
- IDs por linguagem, fechamento Python explícito, sem ampliar permissões.
- Preservar regras de cursos gravados e o mecanismo atual + congelado.
- Sem migração, vagas novas, presença nova, refatoração de jogos ou classes.
- Testes pesados seriais; cada agente altera somente seus paths e não faz push.

## Lote 1 — Elegibilidade e persistência

**Files:** `packages/members/src/infrastructure/persistence/drizzle/{studio-unlock-eligibility,gamification.repository}.ts`, `application/content-admin/content-admin.service.ts` e testes unitários/HTTP/DB adjacentes.

- [ ] Reproduzir recusa atual de recompensa ao vivo após conclusão válida.
- [ ] Estender a elegibilidade com pares corretos de evento/modalidade e sem Mural para live.
- [ ] Congelar recompensas de oficina na transação do evento e nos replays.
- [ ] Preservar recompensas ao clonar curso gravado para ao vivo.
- [ ] Cobrir perfil/público, eventos errados, idempotência e conquista sem licença.
- [ ] Revisar o lote sem alterar marcos da Jornada ou direitos de produto.

## Lote 2 — Configuração no Admin

**Files:** `packages/admin/src/app/admin/membros/cursos/course-form-dialog.tsx`, `components/admin/adult-course-access-contract.tsx` e testes adjacentes.

- [ ] Reproduzir seletor ausente em curso ao vivo.
- [ ] Expor recompensas e validação Python, com texto de conclusão da oficina.
- [ ] Testar seleção, preservação JS/Python, envio e recusa de conjunto inválido.
- [ ] Preservar cursos gravados, aulas/salas e comportamento de inscrição/vagas.
- [ ] Revisar o lote.

## Lote 3 — Review integrado e entrega

- [ ] Reexecutar testes afetados e prova SQL em banco descartável.
- [ ] Verificar conquista sem licença e acesso posterior pelo produto independente.
- [ ] Rodar tipagem/Biome, revisar diff e corrigir achados concretos.
- [ ] Conciliar staging recente, commit/merge/push autorizado e acompanhar CI.
- [ ] Registrar evidências e pendências sem herdar aceite de execução não realizada.
