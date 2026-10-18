# Plano de implementação — Jornada Kids configurável

**Objetivo:** permitir configurar requisitos/capacidades mantendo default, conquistas e todos os consumidores coerentes.

**Arquitetura:** regra pura no core; Members autoriza, materializa e publica; hosts traduzem view em acesso e apresentação. Baseline por preparação em lotes, sujeito a prova SQL antes de ativação.

**Stack:** TypeScript, Bun, Zod, Drizzle/PostgreSQL, Elysia, Next/React, testes Bun.

**Spec:** [_techspec.md](./_techspec.md). **Produto:** [_prd.md](./_prd.md).

T1 foi iniciado antecipadamente por instrução explícita do root em 18/10/2026, somente no worktree isolado. A base ainda precisa ser atualizada ao checkpoint conciliado antes da integração e de T2+. Não usa subagentes adicionais. Tabelas/serviços/UI/consumidores não foram implementados.

## Restrições globais

- Default: 8 postos, 49 posições (1+8×6), complete+showcase por slot, mesmos portões e grants curriculares.
- Política Kids própria; Adult mantém seus contratos e a sua regra de IA.
- Posto, capacidades globais e paleta de cursos são estados distintos.
- Não publicar custom antes de baseline e migração dos leitores.
- Não rodar TSC/build/browser/Docker/suítes amplas junto da carga Python sem coordenar.
- Não fazer push nem merge staging por conta própria.
- Consultar Context7 antes de mudar APIs/libs conforme regras do package; código local é a evidência principal do domínio.

## T0 — Atualizar base e resolver decisões de produto

**Depende de:** checkpoint do agente principal.

**Arquivos:** esta pasta e contratos JS/Python modificados no checkpoint, lidos antes de alterar implementação.

- [ ] Confirmar branch/status do worktree, preservar estes documentos e atualizar para o checkpoint informado sem reset destrutivo.
- [ ] Comparar `git diff 3d83a3f46..<checkpoint> -- packages/core packages/members packages/member-shell packages/community-kids packages/admin packages/studio` e ajustar o mapa de arquivos/tipos.
- [ ] Validar com root o baseline proposto; registrar definição de conquista na publicação e tratamento de legados sem owner/snapshot após auditoria real.
- [ ] Registrar Faísca aula-only no primeiro editor como escopo recomendado, não nova regra supostamente aprovada; manter modelagem extensível.
- [ ] Escolher formato de estado/grants persistidos dentro do contrato monotônico e gerar as migrations na numeração atual.

**Entrega verificável:** especificação atualizada e autorização de implementação recebida do root. Sem mudança produtiva nesta etapa.

## T1 — Contrato e avaliador puro com paridade exata

**Depende de:** T0 para integração; antecipação do núcleo puro autorizada pelo root.

**Criar:** `packages/core/src/journey/kids-policy.ts`, `kids-projection.ts`, `kids-validation.ts`; `packages/core/tests/kids-journey-policy.test.ts`, `kids-journey-parity.test.ts`.

**Modificar:** `packages/core/src/journey/index.ts`; preservar `catalog.ts`/`state.ts` como fontes do legado.

**Consome:** `CREATOR_JOURNEY_LEVELS`, `JOURNEY_LEVEL_SLUGS`, `journeySlotsForTier`, `CREATIVE_TOOL_LEVELS`, `MOLDA_TOOL_BAND_LEVELS`, `computeJourneyLevelSlug` e `resolveJourneyCourseLock` existentes.

**Produz:** tipos e cinco funções públicas da techspec; `legacyKidsJourneyPolicy`, `projectKidsJourney`, `validateKidsJourneyPolicy`, `analyzeKidsJourneyReadiness`, `compareKidsJourney`.

- [x] Escrever teste de paridade para estado vazio, cada fronteira de posto, cada slot faltante, slots fora de ordem e curso apagado com snapshot. Oráculo = funções legadas; esperado fixo inclui 49/1/8 e os portões atuais para não validar duas cópias erradas.
- [x] Implementar adapter legado derivado da tabela existente; não congelar apenas os IDs atuais do catálogo.
- [x] Implementar schema estrito de legacy/configured/paused, sete avanços ordenados, requisitos/capacidades sem repetição e limites documentados.
- [x] Implementar avaliação monotônica do piso conquistado, capacidades separadas e complete/showcase por curso.
- [x] Implementar análise de ciclos jornada/base/reward e capacidade por ordem cumulativa; incompletude legada é warning distinto de novo ciclo inválido.
- [x] Rodar em `packages/core`: `bun test tests/kids-journey-policy.test.ts tests/kids-journey-parity.test.ts tests/journey.test.ts tests/journey-state.test.ts`.

Primeira verificação (`286614934`): 44 testes, 0 falhas, 2.641 asserções; Biome focado limpo; TSC ainda não estava autorizado naquela janela. Após correções de revisão, a validação final tem **50 pass, 0 fail, 2.716 asserções**, matriz em 344 ms e **TSC completo core EXIT0** (Node 24.22.0/TS 5.9.3). Atualizar base e revalidar diferenças antes de integrar. Fixture adicional: `packages/core/tests/fixtures/kids-journey.ts`. O contrato puro também expõe `kidsJourneySteps`, schemas/tipos, helpers de requisito/base e `resolveKidsJourneyCourseLock`; nenhum chamador produtivo foi migrado.

- [x] Corrigir pausa na revisão: reter política ativa em `paused.policy`, manter gates/base e interromper todos os ganhos, com regressões em `packages/core/tests/kids-journey-pause.test.ts`.
- [x] Preservar `graduationOnly` no fato de curso e distinguir formatura de curso normal fora da escada em readiness; acesso legado continua sem gate novo.
- [x] Repetir matriz completa na janela liberada pelo root, executar TSC core e concluir revisão final do recorte puro. Sem tarefas T2 iniciadas.

**Aceite:** default e locks legados equivalentes nos casos de `_test-plan.md`; requisito vazio custom não sobe; pause não libera; prova de ordem sem união de marcos de cursos distintos.

## T2 — Persistência aditiva, monotonicidade e proteção de exclusão

**Depende de:** T1.

**Criar:** `packages/members/src/domain/ports/kids-journey-repository.port.ts`, `packages/members/src/infrastructure/persistence/drizzle/kids-journey.repository.ts`, `packages/members/tests/db/kids-journey.repository.test.ts` e migration gerada.

**Modificar:** `packages/members/src/infrastructure/persistence/drizzle/schema.ts`, `user-data-purge.repository.ts`, fixtures DDL de purge/DB conforme uso real.

**Consome:** tipos core, snapshots `xpEvents`, fences e conta proprietária da gamificação.

**Produz:** port do repositório com leitura individual/batch de fatos/estado, UPSERT monotônico, CAS de policy+histórico, preparação paginada e purge. Exportar records tipados, sem banco na camada application.

- [ ] Escrever DB tests que provam UPSERT concorrente de posto/capacidades e CAS v0/v1, sem escolher vencedor por timestamp do cliente.
- [ ] Definir tabelas policy/revisions/earned/preparations conforme techspec e checks de enum/versão.
- [ ] Gerar migration pelo fluxo do package; inspecionar SQL, journal e snapshot. Não reescrever snapshots históricos do ledger para simplificar feature.
- [ ] Implementar leituras batch, incluindo snapshots legados e curso apagado; manter a precedência atual dos snapshots.
- [ ] Integrar purge/fence com ordem consistente dos locks; provar que retry de preparação não ressuscita grant de conta excluída.
- [ ] Em janela coordenada com Postgres de teste já disponível: `bun test tests/db/kids-journey.repository.test.ts tests/db/user-data-purge.test.ts` em `packages/members`.

**Aceite:** migration aditiva, DB tests realmente executados (não apenas skip), posse/perfil/audiência isolados e nenhuma regressão de estado sob concorrência.

## T3 — Baseline preparado e publicação atômica

**Depende de:** T2; decisão do root de baseline.

**Criar:** `packages/members/src/application/kids-journey/kids-journey.service.ts`, `kids-journey.errors.ts`; `packages/members/tests/integration/kids-journey.test.ts`, `packages/members/tests/db/kids-journey-activation.test.ts`.

**Modificar:** `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`, `composition-root.ts`; helper de locks novo somente se necessário para compartilhar regra sem duplicação.

**Consome:** port T2 e funções core T1.

**Produz:** `KidsJourneyService` com `get/getMany`, `preview`, `prepare/advancePreparation/publish`, `policy/history`. GET pode reconciliar concessões; preview obrigatoriamente usa leituras/projeções sem escrita.

- [ ] Escrever cenários reais SQL: veterano offline no legado; V1 liberaliza, perfil não visita, V2 restringe; nenhum dos dois perde ganho legítimo ao ativar.
- [ ] Implementar preparação com versão/hash/catálogo capturado/cursor/upperBound e batches limitados; um perfil por transação; status e retry idempotentes.
- [ ] Integrar freeze do posto/capacidades com award de marco/replay na mesma transação e proteção da conta antes de owner/policy conforme prova de lock.
- [ ] Implementar CAS final policy+histórico; revalidar draft/catalogHash/prontidão. Conflito deixa rascunho e grants já conquistados, sem publicar parcialmente.
- [ ] Provar os cenários de award antes/durante/depois do ready, novos perfis abaixo do cursor, duas preparações e duas publicações concorrentes; usar barreiras de teste, não sleeps.
- [ ] Medir lote/tempo/coorte representativa em staging autorizado; registrar medições. Se não houver DB/coorte, declarar pendente e não afirmar preservação SQL concluída.

**Aceite:** todas as provas B01–B13 de `_test-plan.md`, preview sem mutation e nenhuma dependência de replay histórico MVCC.

## T4 — API, RBAC e consumidores Members

**Depende de:** T3.

**Criar:** `packages/members/src/interfaces/http/routes/kids-journey.routes.ts`; testes HTTP correspondentes em `packages/members/tests/integration/kids-journey.test.ts`.

**Modificar:** `composition-root.ts`, `interfaces/http/server.ts`, `application/mappers/views.ts`, `application/gamification/get-gamification.service.ts`, `get-missions.service.ts`, `application/access/check-access.service.ts`, `application/journey-course-locking/journey-course-locking.ts`, `application/profiles/get-public-profile.service.ts`, `application/avatar/get-avatars-by-profiles.service.ts`, `application/profiles-overview/get-profiles-overview.service.ts`, `application/children-stats/get-children-stats.service.ts`, consumidores de listagem de cursos; `packages/api-gateway/gateway.config.ts`.

**Consome:** serviço T3.

**Produz:** endpoints da techspec, `kidsJourney?` aditivo e posto/locks consistentes em self/público/pais/batch. `AdultJourneyView` mantém seu campo próprio.

- [ ] Provar RBAC/origem interna, ausência de bypass por headers/profileId arbitrários e recusa staff/customer nas mutações globais.
- [ ] Conectar getGamification e todos os consumidores individuais/batch ao mesmo resolver; preservar autorizadores e batch sem N+1.
- [ ] Migrar locks listagem/acesso direto ao mesmo projetor; complete da base controla a trava conforme configuração, paleta tem critério separado.
- [ ] Atualizar elegibilidade de missões por capacidade/posse e manter resgates já concluídos.
- [ ] Acrescentar rotas específicas no gateway; provar que endpoint interno não ganha exposição por wildcard.
- [ ] Rodar testes HTTP/unidade focados de jornada, acesso e batch encontrados pelo mapa antes de checks amplos coordenados.

**Aceite:** API e consumidores não contradizem a política; ambiente ao vivo/Adult não passa pelos portões Kids.

## T5 — Hosts, Pensa/Molda/Estúdio/Mural e voz

**Depende de:** T4 e contrato JS/Python conciliado.

**Modificar:** `packages/member-shell/src/lib/types.ts`, factories de clients; `server/studio-unlocks.ts`, `server/creative-apps-access.ts`, `server/zappy-access.ts`, `server/pensa/context.ts`, `routes/studio.ts`, `routes/studio-zappy.ts`, `routes/studio-builder.ts`, `routes/pensa.ts`, `routes/private-narration.ts`; `packages/members/src/infrastructure/persistence/drizzle/pensa-team.repository.ts`; `packages/community-kids/src/server/studio-gate.ts`, `studio-pro-access.ts`, `studio-services.ts`, `creator-journey.ts`, `lib/molda-tool-access.ts` e páginas consumidoras.

**Criar:** testes focados de `kidsStudioTier`, autorização de capacidades e participantes Pensa junto das suítes existentes.

**Consome:** KidsJourneyView e blocos curriculares.

**Produz:** `kidsStudioTier(view, role, blocks): StudioTier`, helpers de capacidade por view e tradução Molda consistente. Consumidores Adult usam seu adapter Adult.

- [ ] Escrever matriz de capacidades em postos distintos para provar que o gate usa view, não constantes fixas de rank.
- [ ] Adicionar adapter de tier; clássico sem paleta bloqueado, Pro com pro+studio pode abrir sem paleta; extensões continuam derivadas de blocos.
- [ ] Migrar páginas, BFF de gasto IA, Pro/builder e narração; preservar estados indisponíveis, posse e escopo de projeto/conta.
- [ ] Transportar estado Kids de cada participante do Pensa e montar contexto sem união fictícia de recursos; Molda usa faixas resolvidas.
- [ ] Atualizar checagem de remix no card e no clique pelo snapshot; jogo público existente continua independente do curso vivo.
- [ ] Testar que aula/oficina com ambiente/blocos/Python próprios não ganha nem perde ferramenta global por causa do adapter. Testar JS e Python autorizados e linguagem incompatível no contrato real do checkpoint.
- [ ] Provar que `routes/voice.ts` mantém opção/contexto dos pais para transcrição Kids, sem novo gate de posto; áudio gravado da aula permanece no player.

**Aceite:** UI e handlers têm o mesmo acesso efetivo; perfil de irmão não fornece paleta/capacidade; nenhuma falha libera por `undefined` ou `allowBlocks: []`.

## T6 — Interface Kids e editor administrativo

**Depende de:** T5.

**Criar:** `packages/admin/src/server/kids-journey.ts`, `packages/admin/src/app/admin/professor/jornada-kids/page.tsx`, `journey-editor.tsx`, shims em `packages/admin/src/app/api/members/journey/kids/`; testes de editor/preview/conflito.

**Modificar:** `packages/admin/src/components/admin/nav.ts`, tipos admin e prontidão dos cursos; `packages/community-kids/src/lib/journey-map.ts`, `journey-horizon.ts`, `journey-rewards.ts`, `level-info.ts`, `course-badge.ts`, `studio-cta.ts` e componentes de mapa/timeline/locks/celebração.

**Consome:** API T4 e views T5.

**Produz:** oito cartões estáveis, edição de requisitos/capacidades, preview honesto, preparação retomável, publicação/histórico; mapa/pendências/recompensas Kids derivados da política.

- [ ] Cobrir loading/error/empty separadamente, conflito que mantém draft e operação publicada com versão nova.
- [ ] Mostrar requisitos legados ainda sem curso, curso explícito e marco complete/showcase. Não anunciar paleta ou licença como recompensa do posto.
- [ ] Mostrar diff, impossível/indisponível, direitos preservados e pendência comercial/curricular em áreas com linguagem clara.
- [ ] Exibir preparação/progresso/retomar e permitir publicar só ready. Guardar rascunho local enquanto revalida, sem sobrescrever edição do operador por resposta antiga.
- [ ] Derivar promessas custom de capacidades e neutralizar blurbs sem evidência; default conserva copy existente.
- [ ] Manter contador da trilha inteira distinto do progresso para próximo posto e horizonte custom por requisitos disponíveis, nunca escondendo posto adquirido.
- [ ] Exercitar teclado, mobile e leitura dos avisos com conta sem passe de equipe na janela de browser coordenada.

**Aceite:** cenários U01–U10; nenhuma falsa promessa de “faltam N” quando requisitos não estão prontos.

## T7 — Verificação final e implantação controlada

**Depende de:** T6.

**Modificar:** `docs/jornada-do-criador.md`, `docs/gamificacao.md` somente onde consumidores de acesso mudaram; CLAUDE dos packages tocados; esta pasta com resultados reais.

- [ ] Atualizar evidências/paths contra o checkpoint final e procurar consumidores restantes com `rg -n 'computeStudentLevel|creativeToolAvailability|AI_APPS_MIN_LEVEL|MOLDA_TOOL_BAND_LEVELS|resolveStudioTier' packages` filtrando os usos que ainda governam Kids.
- [ ] Coordenar com root e executar testes/check/typecheck dos packages alterados. Rodar DB suite sem skips e confirmar DDL em banco novo/ordens relevantes.
- [ ] Executar regressão Adult/JS/Python, paridade default e smoke real sem privilégios.
- [ ] Registrar versão do banco, comandos, pass/fail/skip e tempo de baseline/preview; não apresentar um skip como sucesso de SQL.
- [ ] Implantar schema/backend readers e hooks antes de UIs; manter legado ativo enquanto existirem leitores antigos. Só permitir custom depois dos critérios cumpridos.
- [ ] Entregar revisão concreta ao root; push/merge/ativação seguem a autorização do fluxo principal, não ação autônoma deste agente.

**Aceite:** `_test-plan.md` preenchido com evidência atual, riscos materiais nomeados e nenhuma reivindicação de execução que não aconteceu.

## Cobertura do PRD

| Requisitos | Tarefas |
|---|---|
| K01/K02/K03/K04/K12 | T1/T4/T6 |
| K05/K10/K13 | T4/T5/T6 |
| K06/K09 | T2/T3 |
| K07/K08 | T3/T4/T6 |
| K11 | T2/T4/T5 |
| K14 | T6 |
| Verificação/rollout | T7 |
