# Correções da revisão das oficinas — Implementation Plan

> Execução nesta sessão com `executing-plans`, diagnóstico com `systematic-debugging` e validação com `verification-before-completion`. A autorização é “Corrija todos os achados”; a proposta e os critérios do relatório já foram aprovados.

**Goal:** corrigir os oito defeitos e completar as lacunas de continuidade e acompanhamento identificadas na revisão.

**Architecture:** preservar o workspace canônico, separar intenção de gravação de confirmação e separar calendário operacional do acesso comercial. Rascunhos locais são duráveis e isolados por identidade; transferências de autoria não podem apagá-los. O painel usa os componentes e tokens existentes.

**Tech Stack:** TypeScript, Bun, React/Next, Elysia, Drizzle/PostgreSQL, IndexedDB, Chromium/FFmpeg e transporte existente Cloudflare.

**Spec:** `.audits/architectural-analysis-2026-10-14-live.md` e `docs/plans/2026-10-14-aulas-ao-vivo-arquitetura.md`.

## Restrições

- Oito crianças por turma; prazo comercial por aula, sem reinício ao publicar replay ou criar reposição.
- Revisões, epoch, vínculo conta/perfil e confirmação de pausa continuam obrigatórios.
- Não abrir mídia em produção, provisionar serviços ou alterar mudanças de marketing/editor IA.
- Migrações necessárias seguem `drizzle-safe-migrations`; apenas banco local de teste é aplicado aqui.

## 1. Preservar autoria, rascunho e confirmação de salvamento

Arquivos: `members/src/application/live/live-workspace.service.ts`, rotas workspace, `member-shell/src/components/live/live-workspace.tsx`, novo `member-shell/src/lib/live/workspace-drafts.ts`, `studio/src/persistence/service.ts` e testes associados.

- [x] Converter as reproduções de recusa e dirty em expectativas corretas e confirmar falha.
- [x] Recusa de pedido pendente usa requestId e preserva epoch, dispositivo e snapshot. Cancelamento docente verifica solicitante e estado pendente; pedidos expiram sem transferir autoria.
- [x] Persistir snapshots por conta/perfil/workspace/autor antes do envio remoto, com revisão/epoch de origem; não apagar rascunho mais recente ao confirmar envio antigo.
- [x] Integrar o Studio por adapter que aguarda confirmação, preserva flush local sem depender de unload remoto e oferece recuperação explícita com detecção de conflito.
- [x] Testar recusa com edição pendente, dois saves em voo, recarga, troca de perfil e autoria vencida.

```ts
expect(afterDecline.writerEpoch).toBe(beforeDecline.writerEpoch)
expect(afterDecline.writerDeviceId).toBe(beforeDecline.writerDeviceId)
expect(store.getState().isDirty).toBe(true) // enquanto o adapter aguarda confirmação
```

## 2. Recuperar gravação e encerrar por prazo

Arquivos: `members/src/infrastructure/live/own-recording.provider.ts`, `application/live/live.service.ts`, repository port/Drizzle/in-memory, testes de gravação/domínio.

- [x] Converter as reproduções de parada e prazo em testes de recuperação automática.
- [x] Reconciliar jobs até estado final confirmado, inclusive intenção `stopped`, com tentativas idempotentes.
- [x] Executar sweep durável dos encontros vencidos, transicionar estado e acionar revogação/gravação mesmo sem navegador.
- [x] Retomar gravação após cancelar/expirar pedido pendente, mantendo pausa comprovada para assistência ativa.
- [x] Testar falha transitória, prazo sem encerramento manual, corrida entre pausa e retomada e múltiplos coordenadores.

```ts
expect((await live.room(teacher, session.id)).occurrence?.state).toBe('ended')
expect(job.confirmedState).toBe('review') // depois de o gravador voltar
```

## 3. Corrigir replay histórico e calendário

Arquivos: contratos Core, `live.service.ts`, rotas/BFF live, `live-recording-review.tsx`, `live-replay.tsx`, catálogos infantil/responsáveis/admin.

- [x] Converter os dois testes de reposição para resultado correto.
- [x] Endereçar replay/revisão/publicação por occurrenceId explícito autorizado; expor histórico sem storageKey.
- [x] Exibir horário da ocorrência atual e manter abertura/vencimento comercial independentes.
- [x] Testar retirada antiga, id de outra turma, versão concorrente e data de reposição nas três visões.

```ts
expect(catalog.sessions[0].occurrenceStartsAt).toBe(replacement.startsAt)
expect(catalog.sessions[0].startsAt).toBe(originalAccessStart)
```

## 4. Completar moderação e acompanhamento

Arquivos: `live-classroom.tsx`, componente de participantes extraído, aprendizagem/workspace telemetry e contratos/rotas, testes de UI e autorização.

- [x] Provar que chat pausado bloqueia crianças e permite aviso docente; corrigir a composição.
- [x] Reunir etapa, salvamento e pedidos por criança, com ação principal e menu contextual.
- [x] Ordenar pedidos e não exibir estado de salvamento antigo como atual.
- [x] Alinhar cursor com alvo/viewport do editor e testar mudança de tamanho sem indicação falsa.

```ts
expect(canSendChat({ role: 'teacher', chatEnabled: false, operational: true })).toBe(true)
expect(canSendChat({ role: 'learner', chatEnabled: false, operational: true })).toBe(false)
```

## 5. Continuar o mesmo projeto em várias aulas

Arquivos: planos/contratos Core, autoria Admin, serviço/repos workspace e acesso, testes de continuidade e publicação.

- [x] Oferecer associação explícita ao projeto de aula anterior no roteiro, validada e congelada por turma.
- [x] Abrir o mesmo workspace canônico sem copiar projeto; conferir grant da aula acessada e grants associados na biblioteca.
- [x] Manter materiais, atividades e replay restritos a cada aula; operações docentes ficam ligadas à sala efetiva.
- [x] Testar primeira aula vencida/segunda aberta, aula futura, outra criança/turma, assistência concorrente e continuidade via assinatura.

```ts
expect(secondLessonWorkspace.id).toBe(firstLessonWorkspace.id)
await expect(materialsOfExpiredLesson()).rejects.toThrow()
```

## 6. Reduzir consultas/locks e validar entrega

- [x] Filtrar/paginar catálogo no banco, sem carregar histórico de terceiros antes de filtrar.
- [x] Substituir lock global de escritores por escopo de professora/workspace com ordem compatível com exclusão de conta; provar exclusão mútua em PostgreSQL.
- [x] Executar regressões de Studio, aprendizagem gravada, Members, publicação, rotas, gravador e supervisor; typechecks e builds dos hosts.
- [ ] Conferência visual em navegador: conexão tentada, mas nenhum navegador disponível. Ensaio externo com oito aparelhos também pendente; gate de mídia continua fechado.
- [x] Atualizar documentação de implementação e relatório de correções com resultados frescos. Preservar o relatório original como histórico.

Comandos principais: `bun test tests/unit/live-workspace.test.ts tests/unit/live.service.test.ts` em Members; `bun test tests/db/live-recording.test.ts tests/db/live-workspace.repository.test.ts`; `bun test` em gravador/supervisor; testes de regressão por arquivo em Kids/Studio; `bun run typecheck` nos hosts/backend.

## Evidências da execução

Resultados e limites estão em [relatório de correções](../../../.audits/live-corrections-2026-10-14.md). As correções não exigiram nova migração: vínculo de continuidade, telemetria e alvo do cursor usam os documentos JSON existentes. Nenhuma migração de produção, deploy ou contratação foi feita.
