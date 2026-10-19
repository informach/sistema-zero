# Plano de implementação — Jornada Kids configurável

**Objetivo:** permitir configurar requisitos/capacidades mantendo default, conquistas e todos os consumidores coerentes.

**Arquitetura:** regra pura no core; Members autoriza, materializa e publica; hosts traduzem view em acesso e apresentação. Baseline por preparação em lotes, sujeito a prova SQL antes de ativação.

**Stack:** TypeScript, Bun, Zod, Drizzle/PostgreSQL, Elysia, Next/React, testes Bun.

**Spec:** [_techspec.md](./_techspec.md). **Produto:** [_prd.md](./_prd.md).

T1 foi iniciado antecipadamente por instrução explícita do root em 18/10/2026, somente no worktree isolado. Após publicação de `ac85a7a323491b9b2416fcc3008b17140a328284`, o root autorizou T2. Rebase sem conflitos, com backup e os quatro commits equivalentes no range-diff; HEAD T1 atualizado `08ad6801f`. Não usa subagentes adicionais. T2 permanece desacoplado de consumidores/rotas/hosts.

**Novo escopo obrigatório do usuário:** um modelo canônico, seed persistido e todos os consumidores migrados, sem modo legado/fallback normal/dupla autorização. T1/T2 abaixo registram checkpoints intermediários, não o contrato final. T1R/T2R são pré-requisitos de T3 e do merge. Cleanup somente da jornada Kids; não tocar compatibilidade JSv2, Adult, snapshots/paletas, ownership, runtime/catalog ou migrations de outros sistemas.

## Ponto atual para execução (19/10/2026)

Este arquivo preserva o plano e recibos intermediários; frases sobre composição ausente em T1/T2 descrevem aqueles checkpoints. O estado atual está em `_evidence.md` e nos snapshots dos lotes. Core/seed, persistência, admissão e vários consumidores estão escritos; a jornada completa não foi entregue.

- P6C qualificado: celebrações por view/capabilities, focado59/193 e Kids TSC0; snapshot265 SHA20e4aa4872ce590ebea943812bf2db4d248df8d8b430cdcae2176e58407301a9.
- D1 qualificado na fixture atual: posto visual ausente/desconhecido; GREEN mínimo conjunto9/47, matriz59/253, Biome4/0 e Kids TSC0; snapshot delta badge-reward-qualified.
- D2 qualificado após RED: resolvedCourseId readonly pela mesma captura/matcher, null sem dívida histórica; curso necessário fora da trilha e agrupamento de apresentação por identidade, mantendo todos os marcos. Core68/2833 e UI70/225, Biome4+5/0; Core/Members/Kids tipos0. Negativo de tipo da fixture e revalidação7/28 preservados; integração pendente.
- Cartão de recompensa: RED real 2pass/2fail/21, texto ajustado ao requiredLevel canônico; GREEN/matriz/tipos qualificados junto a D1. Preservados direitos reward independentes de entry e currículo.
- Admin A transporte qualificado (dois helpers, sete handlers, fixture isolada): fixture7/171, pós-formatação8/172, Biome11/0 e Admin TSC0.
- Admin B composição Members/allowlist gateway qualificadas após RED0/2 e0/3; matrizes52/323 e19/116, Biome6/0, Gateway/Members TSC0. Negativo de tipo em fixture e revalidação3/27 preservados. JWT/forwarding/DB integrados pendentes.
- Editor Admin C escrito com DTO validado, painéis separados de avanço/tierAccess, comparação e preparação manual/retomável. Focados20/97, matriz Admin30/140 e Members13/98, Biome13/0 e Admin/Members TSC0. Navegador real/integrado pendentes. RED de funcionalidade ausente foi module missing; RED comportamental posterior reproduziu erro de paginação do histórico na área geral, corrigido para erro local.
- Tela423 qualificada: RED0/2/5→GREEN2/10, matriz36/106, Biome4/0, Kids TSC0. Mensagem usa requiredLevel existente e não inventa Mural para foundation. Quatro arquivos no snapshot próprio; sem mudança de gates/grants.
- Depois: qualificação integrada do editor/Admin, cleanup restante comprovado, retenção, bootstrap/admission integrado, SQL/SDK/gates globais e conciliação da base sob coordenação do root. Sem merge/push/deploy próprio.
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

- [x] Confirmar branch/status do worktree, preservar estes documentos e atualizar para o checkpoint informado sem reset destrutivo.
- [ ] Comparar `git diff 3d83a3f46..<checkpoint> -- packages/core packages/members packages/member-shell packages/community-kids packages/admin packages/studio` e ajustar o mapa de arquivos/tipos.
- [ ] Validar com root o baseline proposto; registrar definição de conquista na publicação e tratamento de legados sem owner/snapshot após auditoria real.
- [ ] Registrar Faísca aula-only no primeiro editor como escopo recomendado, não nova regra supostamente aprovada; manter modelagem extensível.
- [x] Escolher formato de estado/grants persistidos dentro do contrato monotônico e gerar as migrations na numeração atual: posto + união JSONB enumerada em `kids_journey_earned`; migration gerada 0136.

**Entrega verificável:** especificação atualizada e autorização de implementação recebida do root. Sem mudança produtiva nesta etapa.

## T1 — Checkpoint intermediário do avaliador puro

**Depende de:** T0 para integração; antecipação do núcleo puro autorizada pelo root.

**Criar:** `packages/core/src/journey/kids-policy.ts`, `kids-projection.ts`, `kids-validation.ts`; `packages/core/tests/kids-journey-policy.test.ts`, `kids-journey-parity.test.ts`.

**Modificar:** `packages/core/src/journey/index.ts`; preservar `catalog.ts`/`state.ts` como fontes do legado.

**Consome:** metadata estrutural dos oito postos/sete etapas e limites de posições. O motor
anterior é oráculo somente de testes/migração, nunca fallback ou fonte normal do Kids.

**Produz:** schemas/tipos de uma configuração única `{schemaVersion, mode:active|paused,
steps, tierAccess}`, `initialKidsJourneyPolicy`, `projectKidsJourney`, validadores/prontidão,
comparação sem escrita e resolvers singular/batch de acesso.

- [x] Provar paridade dos oito postos/49 posições, cada fronteira e slot ausente, ordem e snapshots,
  inclusive curso removido, catálogo incompleto, role reward/extra e formatura.
- [x] Schema estrito: sete avanços ordenados, sete regras completas de acesso, requisitos e capacidades
  sem repetição, dependências cumulativas e limites documentados.
- [x] Piso permanente de posto/capacidades e 21 direitos entry/expanded/reward; expanded implica entry,
  reward é independente. A mesma elegibilidade pura alimenta projeção e autorização.
- [x] Pausa conserva a política canônica, congela posto/app capabilities e permite expansão pela
  conclusão real da base sob posto congelado; não remove regras nem inventa showcase.
- [x] `graduationOnly` distingue formatura de curso normal fora da escada. Formatura não pode ser
  requisito para chegar ao topo, mas continua sem novo gate por posto no acesso.
- [x] Readiness distingue ausência conhecida de base, catálogo indisponível, requisito explícito
  circular e dependências inviáveis. Complete/showcase são critérios separados da paleta curricular.
- [x] Resolver batch usa uma projeção por perfil e cache limitado por etapa; singular delega ao batch.
- [x] Última matriz focada: **60 pass/0 fail/2772 asserções**, seis arquivos (ver `_evidence.md`).

Histórico: T1 começou antes do checkpoint principal por instrução do root. As versões intermediárias
legacy/configured e pausa aninhada foram protótipos locais, substituídos em T1R/T2R pelo contrato único;
seus commits/recibos continuam como trilha de revisão, não como ABI ou requisito produtivo. O último
TSC Core canônico aprovado antecede as novas edições de consumidores; nova integração será verificada.

**Aceite:** seed e locks equivalentes ao oráculo nos casos de `_test-plan.md`; requisitos vazios não
concedem avanços, pausa não libera tudo, marcos de cursos distintos não se somam para um requisito.

## T2 — Checkpoint intermediário de persistência/monotonicidade

**Depende de:** T1.

**Criar:** `packages/members/src/domain/ports/kids-journey-repository.port.ts`, `packages/members/src/infrastructure/persistence/drizzle/kids-journey.repository.ts`, `packages/members/tests/db/kids-journey.repository.test.ts` e migration gerada.

**Modificar:** `packages/members/src/infrastructure/persistence/drizzle/schema.ts`, `user-data-purge.repository.ts`, fixtures DDL de purge/DB conforme uso real.

**Consome:** tipos core, snapshots `xpEvents`, fences e conta proprietária da gamificação.

**Produz:** port do repositório com leitura individual/batch de fatos/estado, UPSERT monotônico, CAS de policy+histórico, preparação paginada e purge. Exportar records tipados, sem banco na camada application.

- [x] Escrever DB tests que provam UPSERT concorrente de posto/capacidades e CAS v0/v1, sem escolher vencedor por timestamp do cliente.
- [x] Definir tabelas policy/revisions/earned/preparations conforme techspec e checks de enum/versão.
- [x] Gerar migration pelo fluxo do package; inspecionar SQL, journal e snapshot. Não reescrever snapshots históricos do ledger para simplificar feature.
- [x] Implementar leituras batch, incluindo snapshots legados e curso apagado; manter a precedência atual dos snapshots.
- [x] Integrar purge/fence com ordem consistente dos locks; retry depois da exclusão não ressuscita grant. Corrida de award/purge completa continua T3.
- [x] Em janela coordenada: **20/0/69 SQL Kids + 3/0/24 purge**, sem skips, e **TSC Members completo EXIT0** com deps legítimas/guard companion `a85bcf327`. Seis regressões lifetime tiveram RED causal→GREEN6/11; manter capturas/defaults frescos no contrato canônico.

**Aceite:** migration aditiva, DB tests realmente executados (não apenas skip), posse/perfil/audiência isolados e nenhuma regressão de estado sob concorrência.

Recorte T2 atual: port/repositório com snapshot read-only, freeze monotônico, preparação keyset de um perfil por transação, CAS SQL e histórico, sem ligação na composição. A publicação de baixo nível permanece inacessível a rotas/consumidores: o hook de award e a orquestração T3 são obrigatórios antes de habilitar custom. Erro `unowned` interrompe o cursor; status/retomada/retention operacional do serviço são T3, não supostos concluídos pelo repositório.

## T1R/T2R — Contrato único, seed explícito e cleanup do protótipo

**Depende de:** review do payload final pelo root; rebase remoto informado antes de editar contratos. Sem T3 antes desse aceite.

- [x] Preservar checkpoint/backup T2; rebase sobre remoto `f664cfa5184e5a4d633edb9292d9f1b09b8115be`, preservando patch companion de fixture sem cherry-pick duplicado; informar conflito em fronteiras compartilhadas. Checkpoint108574ec7/backup631b34 preservados, seis commits range-diff equivalentes.
- [x] Checkpoint canônico e8be66021 adota remoto2e76fb448 e retira companion equivalente ao guard publicado, usando fixture remoto exato. Backup a4e4babb5; range-diff confirma seis Kids equivalentes, sem conflitos.
- [x] Substituir legacy/configured/paused por configuração única `{schemaVersion, mode:active|paused, steps, tierAccess}`; pausa mantém tudo, sem nesting/fallback.
- [x] Recorte core canônico: seed separado49, tierAccess e earned21; 58/0/2763 focados após RED/GREEN entry herdado→expanded, função pura compartilhada com autorização; TSC Core EXIT0.
- [x] `tierAccess` tem sete tiers completos e thresholds/base explícitos: opensAt, completedAt, foundation slot1/milestone/whenMissing. Seed conforme tabela da techspec. Não derivar regras normais de `CREATOR_JOURNEY_LEVELS`.
- [ ] Earned inclui 21 direitos bounded entry/expanded/reward; expanded implica entry, reward não. Baseline/award/pause preservam acesso antes liberalizado mesmo com política futura restritiva. Provar V1→offline→V2.
- [ ] Coorte bootstrap captura Auth all (sem XP/arquivados) + históricos comprovados; admissão sempre persiste earned noob/[] e coorte recorrente captura todos earned, não só marcos.
- [ ] Implementar Auth admissionState pending/ready separado do arquivamento, requestId idempotente/quota, S2S initializer específico sem RPC em TX, CAS ready sob lock local profile:<account> e worker retry durável/agendado. Inventariar todos criadores/seletores/backfill/refresh/study/impersonação/público/token, testar purge e ACK tardio. Rollout sem Auth antigo; existentes permanecem ready, não pending em massa.

  Progresso intermediário Auth (não concluído): fonte do protocolo/worker/guarda/token dedicado e migrations0023/0024 escritas;
  SQL causal RED6→GREEN10/32, units27/104, HTTP perfis/sessões/Kids36/164 e Adminprofiles5/14.
  Edição agora usa patch explícito com autorização síncrona sobre estado fresh bloqueado; archive é operação separada.
  Matriz Auth ampliada executada:19 pass/0 fail/77asserts, incluindo quota, purge, lease e coorte sem XP. Rereview de fonte do patch fresh/arquivo sem novo achado; Auth full types/regressão e integração de consumidores ainda pendentes.
  CI recebe URLs SQL explícitas para Kids/Auth; binding de segredo real e rollout completo permanecem operacionais pendentes.

- [ ] Seed completo versionado, slot-based49, gerado/conferido contra oráculo Kids congelado somente de testes/migração. Nenhuma importação desse oráculo no grafo produtivo Kids; helpers compartilhados ainda necessários a Adult preservados e testados.
- [x] Provar paridade dos oito postos, prefixos/slots ausentes/ordem/snapshots, capacidades e locks de todas as combinações de base/role, inclusive catálogo incompleto e formatura sem novo gate. Congelar referência somente de testes ainda está no item de seed acima.
- [x] Readiness usa o resolver único com acesso explícito; recusa auto-bloqueio avanço/reward/base. Omissão da base não inventa showcase por código.
- [x] Modelar initializing V0 explícito → published V1, actorKind system/user e referência a preparação real; ausência/corrupção não é política/fallback/reseed.
- [x] Regenerar a 0136 ainda não publicada pelo script do package, com snapshot/journal coerentes; sem traduzir antigos payloads de teste. Backup preservado; NOVO QA owned kids_journey_canonical com guard de clientes, sem reset do banco anterior/sem FORCE.
- [x] Atualizar port/testes/persistência mantendo monotonicidade, CAS, fence e capturas síncronas. Requalificados SQL30/135 e TSC Core/Members0 em janela coordenada; award/serviços ainda pertencem a T3.
- [x] Primeira SQL real canônica25/1/105; causa INSERT/UPSERT de ordenação corrigida na leitura de domínio, foco1/0/7. Captura Auth bounded→Members1/TX→hash50/TX→baseline1/TX. SQL30/135 repetida com fila/drain, purge3/25 e TSC Core/Members0.

**Aceite:** um contrato/avaliador Kids normal, seed exato e persistível, nenhuma dependência produtiva Kids dos gates/rewards anteriores. Fonte T1/T2 intermediária não será integrada como camada de compatibilidade. O nível/contrato Adult conserva seus helpers legítimos, sem reaproveitá-los como fallback Kids.

## T3 — Baseline preparado e publicação atômica

**Depende de:** T1R/T2R e review final de seed/bootstrapping.

**Criar:** `packages/members/src/application/kids-journey/kids-journey.service.ts`, `kids-journey.errors.ts`; `packages/members/tests/integration/kids-journey.test.ts`, `packages/members/tests/db/kids-journey-activation.test.ts`.

**Modificar:** `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts`, `composition-root.ts`; helper de locks novo somente se necessário para compartilhar regra sem duplicação.

**Consome:** port T2 e funções core T1.

**Produz:** `KidsJourneyService` com `get/getMany`, `preview`, `prepare/advancePreparation/publish`, `policy/history`. GET pode reconciliar concessões; preview obrigatoriamente usa leituras/projeções sem escrita.

- [x] Provar SQL veterano inicial/offline e V1→V2 liberal→V3 restritiva sem visita, preservando posto/capacidades e21 direitos pedagógicos. Incluído na matriz44/206; coorte real/escala de produção não medida.
- [ ] Bootstrap guarda configuração explícita initializing0, captura conquistas com o mesmo avaliador/hook, e publica1 somente após baseline real/CAS; autor system honesto e idempotência sem sobrescrever edição.
- [ ] Implementar preparação com versão/hash/catálogo capturado/cursor/upperBound e batches limitados; um perfil por transação; status e retry idempotentes.
- [x] Integrar freeze do posto/capacidades com award de marco/replay na mesma transação e proteção da conta antes de owner/policy. RED1/5→GREEN6/30 e matriz44/206 reais qualificam o recorte; testes globais/rollout ainda pendentes.
- [x] Implementar CAS final policy+histórico e fence de catálogo SHARE NOWAIT/READ COMMITTED. RED4→GREEN4, matriz44/206 com ordens invertidas/cascata e stale após commit; conflito preserva grants e não publica parcialmente.
- [ ] Provar os cenários de award antes/durante/depois do ready, novos perfis abaixo do cursor, duas preparações e duas publicações concorrentes; usar barreiras de teste, não sleeps.
- [ ] Medir lote/tempo/coorte representativa em staging autorizado; registrar medições. Se não houver DB/coorte, declarar pendente e não afirmar preservação SQL concluída.

**Aceite:** todas as provas B01–B13 de `_test-plan.md`, preview sem mutation e nenhuma dependência de replay histórico MVCC.

## T4 — API, RBAC e consumidores Members

**Depende de:** T3.

**Criar:** `packages/members/src/interfaces/http/routes/kids-journey.routes.ts`; testes HTTP correspondentes em `packages/members/tests/integration/kids-journey.test.ts`.

**Modificar:** `composition-root.ts`, `interfaces/http/server.ts`, `application/mappers/views.ts`, `application/gamification/get-gamification.service.ts`, `get-missions.service.ts`, `application/access/check-access.service.ts`, `application/journey-course-locking/journey-course-locking.ts`, `application/profiles/get-public-profile.service.ts`, `application/avatar/get-avatars-by-profiles.service.ts`, `application/profiles-overview/get-profiles-overview.service.ts`, `application/children-stats/get-children-stats.service.ts`, consumidores de listagem de cursos; `packages/api-gateway/gateway.config.ts`.

**Consome:** serviço T3.

**Produz:** endpoints da techspec, `kidsJourney` canônico e posto/locks consistentes em self/público/pais/batch. Prévia de equipe usa `kidsPreview` e `level:null`, sem aluno virtual. `AdultJourneyView` mantém seu campo próprio.

- [ ] Provar RBAC/origem interna, ausência de bypass por headers/profileId arbitrários e recusa staff/customer nas mutações globais.
- [ ] Conectar getGamification e todos os consumidores individuais/batch ao mesmo resolver; preservar autorizadores e batch sem N+1.
- [ ] Migrar locks listagem/acesso direto ao mesmo projetor; complete da base controla a trava conforme configuração, paleta tem critério separado.
- [ ] Atualizar elegibilidade de missões por capacidade/posse e manter resgates já concluídos.
- [ ] Acrescentar rotas específicas no gateway; provar que endpoint interno não ganha exposição por wildcard.
- [ ] Rodar testes HTTP/unidade focados de jornada, acesso e batch encontrados pelo mapa antes de checks amplos coordenados.

Progresso parcial T4: CheckAccess/catálogo/meus cursos, FreeRuntime, query/config/guardas/HTTP têm
focados verdes. GetGamification Kids e Admin.inspect usam registro/projeção canônicos; missões e
Pensa server usam capacidades. Focados novos25/154 + integração110/447 passaram; correções dos
três tipos anteriores revalidadas22/82 + MembersTSC0 no snapshot139. Público/pais/avatar/ranking
foram migrados em seguida: batch75/292, identidade Core61/2787 e admissão26/86 verdes. O TSC
seguinte apontou um contrato nullable na Liga; correção revalidada20/73 + MembersTSC0.
Os negativos permanecem preservados. `listOwners` interno bounded200 e compatibilidade hexadecimal ainda precisam prova SQL.
BFF/UI/Admin completos pendentes; não marcar T4 completo nem expor publicação por esse checkpoint.

**Aceite:** API e consumidores não contradizem a política; ambiente ao vivo/Adult não passa pelos portões Kids.

## T5 — Hosts, Pensa/Molda/Estúdio/Mural e voz

**Depende de:** T4 e contrato JS/Python conciliado.

**Modificar:** `packages/member-shell/src/lib/types.ts`, factories de clients; `server/studio-unlocks.ts`, `server/creative-apps-access.ts`, `server/zappy-access.ts`, `server/pensa/context.ts`, `routes/studio.ts`, `routes/studio-zappy.ts`, `routes/studio-builder.ts`, `routes/pensa.ts`, `routes/private-narration.ts`; `packages/members/src/infrastructure/persistence/drizzle/pensa-team.repository.ts`; `packages/community-kids/src/server/studio-gate.ts`, `studio-pro-access.ts`, `studio-services.ts`, `creator-journey.ts`, `lib/molda-tool-access.ts` e páginas consumidoras.

**Criar:** testes focados de `kidsStudioTier`, autorização de capacidades e participantes Pensa junto das suítes existentes.

**Consome:** KidsJourneyView e blocos curriculares.

**Produz:** `kidsStudioTier(view, blocks): StudioTier` (equipe somente por view explícita de preview persistido, não por role isolado), helpers de capacidade por view e tradução Molda consistente. Consumidores Adult usam seu adapter Adult.

- [ ] Escrever matriz de capacidades em postos distintos para provar que o gate usa view, não constantes fixas de rank.
- [ ] Adicionar adapter de tier; clássico sem paleta bloqueado, Pro com pro+studio pode abrir sem paleta; extensões continuam derivadas de blocos.
- [ ] Migrar páginas, BFF de gasto IA, Pro/builder e narração; preservar estados indisponíveis, posse e escopo de projeto/conta.
- [ ] Transportar estado Kids de cada participante do Pensa e montar contexto sem união fictícia de recursos; Molda usa faixas resolvidas.
- [ ] Atualizar checagem de remix no card e no clique pelo snapshot; jogo público existente continua independente do curso vivo.
- [ ] Testar que aula/oficina com ambiente/blocos/Python próprios não ganha nem perde ferramenta global por causa do adapter. Testar JS e Python autorizados e linguagem incompatível no contrato real do checkpoint.
- [ ] Provar que `routes/voice.ts` mantém opção/contexto dos pais para transcrição Kids, sem novo gate de posto; áudio gravado da aula permanece no player.

Progresso de edição T5 (ainda não qualificado): adapter `kidsStudioTier` e leitura explícita
Kids/preview/indisponível; entradas `/estudio` e `/estudio/pro`, serviços opcionais e gate de
publicação Pro leem capacidades da view. Casos custom Noob-capaz/God-sem-capacidade, preview sem
posto e falha de política passaram: shell43/245 e Kids14/26; MembersTSC0. Tipos/render das
aplicações ainda pendentes. Fatos/contexto por participante Pensa e rank nullable foram migrados em seguida: focados shell46/126
e Core83/2823 verdes; chamada SQL real e tipos pós-fatos ainda pendentes. Demais BFF, ferramentas
e Mural continuam no inventário de migração.

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
- [ ] Finalizar consumidores no modelo único; remover caminhos antigos substituídos de jornada Kids. Preparar schema/hooks/seed antes de exposição não cria fallback/compatibilidade permanente. Liberar staging antes de produção.
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
| K15/K16, modelo único/seed/cleanup | T1R/T2R/T3/T4/T5/T6/T7 |


## Recibo parcial de hosts e ferramentas após T5/T6

Snapshot229 `hosts-capabilities-focused-checkpoint`, SHA789a235259c283b0e969912fcbe68d11043afc5cd39789985e9e6353c0ac02fd.
Shell252/1267, Core86/2866, Kids51/168 e Members parental15/53 passaram. Zappy preserva
RED1/3 e intermediária Shell248/4: fixtures incompletas foram corrigidas sem alterar asserts;
preview próprio é readonly e não consulta currículo. Publicação Python/runtime permanece
como antes e a fixture agora usa query canônica compartilhada entre BFF e runtime.

Menu/Criar/ajuda foram editados para capacidades e currículo separado, com helper puro
testado, mas composição/render real dessas páginas e tipos completos seguem pendentes.
Progressão/recompensas/timeline e editor Admin ainda não migrados; não marcar T5/T6 completos.
SDK host autorizado recebeu somente adaptação de fixture; smoke SDK real/QA types pendentes.


P6A parcial: timeline/cartão/hints home-perfil e recompensa nova leem advances/earned/readiness
da view persistida, sem contador fixo nem badge Noob por ausência/preview. RED6:1pass/5fail;
GREEN6/20→10/32; matriz100/318 e Biome10/0 no snapshot237 SHA7efa3d058fed1aa01dec38061bd32ec73d334b5be0f50682f3c59a0d28088f51.
Negativo intermediário98/2 e RED parcial formatter preservados. Earned Lenda/horizonte Faísca,
capacidade removida da policy, marco misto e pausa cobertos. Tipos/páginas integradas pendentes.
Próximo P6B: mapa/agrupamento/trilha/celebrações e tierAccess na view; Admin separado.


P6B parcial: courseId e tierAccess readonly da mesma versão publicados nos DTOs. Agrupamento,
mapa, trilha e breadcrumb canônicos; direito retido pode abrir trilha futura sem posto/check
fictício. Indisponível e preview explícitos. Motores fixos desses caminhos só em tests/fixtures.
RED mapa0/4 + HTTP0/3 preservados; guard de transporte RED1 e intermediária schema-readonly
preservados; Kids119/357 + Shell117/674 + Members26/181 + Core40/2696; Biome37/0.
Tipos/composição RSC ainda pendentes; próximas celebrações/Molda e auditoria de gates
curriculares são fronteiras separadas. Admin/SQL/rollout e integração final não concluídos.

P6B types: Core0, Members0 após expected courseId (RED3/1→GREEN4/9), Kids0 após6 diagnósticos.
Ranking null RED confirmou5 badges indevidos→GREEN1/2 explícito; focados adicionais Kids19/85,
Hub22/50, Core40/2696. Biome7 EXIT0 com1 aviso unused a remover na próxima edição Molda.
Próximo lote P6B-C: celebrações por ganho real/view, sem festa extra ou currículo por slug;
posterior requisito courseId sem tier deve aparecer como aventura necessária acessível na UI.

P6B-C em validação: RED6 (2pass/4fail)→GREEN6/15; stale observation RED1→fix; matriz31/112
pré-formatação e Biome10/0. View+caps delta+licença substituem moldaLevelGain/posto/blurbs;
sem overlay extra, observação local bounded por perfil não é concessão. Tipos/focado final
pendentes. Depois: unknown badge nos consumidores restantes e requisitos courseId fora de tier.

P6B-C focado qualificado: final59/193 em8arquivos e Kids TSC incremental EXIT0, após único
caller de teste do aviso adaptado ao contrato journey; negativo TSC54126 e asserts anteriores
preservados. Biome fixture1/0. Celebrações usam view/capabilities reais e não inferem recursos
por posto. Permanecem D (badge ausente/requisitos fora de tier), Admin, SQL novo/retention,
composição e gates integrados; T5/T6 e a jornada completa continuam abertos.

Registro intermediário D1, antes da revisão de contrato abaixo: RED2pass/3fail/15→GREEN5/22 da identidade visual ausente; houve proposta transitória de DTO nullable, retirada em seguida. Matriz/Biome/tipos pendentes. D2 resolvedCourseId nullable da mesma captura aprovado, ainda sem mudança produtiva/DTO; RED e consumidor fora de tier são lote separado.


Revisão D1: retirada a ampliação nullable do DTO compartilhado; endpoint público Kids exige view/level e falha fechado. Caso público é defesa interna, agora usa level opcional ausente na fixture. Logs anteriores preservados; novo gate pendente. Fonte produtiva D1 somente level-info.ts.


Admin A separado: nove arquivos de transporte BFF e dois de teste foram escritos, sem execução/qualificação. Caminhos fechados, IDs canônicos, gateway existente, JSON limitado e no-store. Members mounting/RBAC/editor continuam pendentes; não marcar T4 completo. Nenhuma fonte D1/D2 adicional mudou.

## Cleanup1 após Editor Admin C (focados e tipos verdes)

- [x] Inventariar consumidores produtivos antes de remover exportações antigas.
- [x] Retirar resolvedor Kids antigo e tabela rank→faixa Molda de src; oráculo somente em fixture.
- [x] Manter o cálculo Adult e vocabulário estrutural, sem tocar runtime/JS/paletas/ownership.
- [x] Reexecutar paridade e focados: Core47/2710, Kids18/83, Adult9/33; Biome11/0.
- [x] Atualizar documentação normativa que ainda aceitava perda de acesso ao publicar base.
- [x] Qualificar Core→Members→Kids TSC em janela coordenada; logs vazios/EXIT0 e recibo específico.
- [ ] Conferir integração nativa/Admin/JWT/banco e os demais gates T7; a jornada continua aberta.

## Estado atual de integração (19/10/2026, após conciliação 3190)

Os registros parciais acima são históricos por lote; não representam o inventário atual.
EditorAdminC e Cleanup1 têm focados/tipos e review independentes encerrados nos recibos.

- [x] Preservar317 arquivos no checkpoint 5833b73cb e backup raw antes da conciliação.
- [x] Incorporar3190d9e08 por merge local 0e20ea3bc, sem conflitos ou push.
- [x] Integrar backend real em banco novo owned: composição Members/Gateway, RS256/JWKS,
  bootstrap auditadoV1, admission dedicado, preview, preparação/retomada/avanço e publicação CAS V2.
  Sete cenários / 43 asserções EXIT0; limites e negativo inicial em _evidence.md.
- [x] Qualificar Next/sessão/BFF/editor com backend e PostgreSQL reais no navegador: Chrome/Edge10 cenários,42 checksQA, imagens/negativos e overlay de filesystem restaurado em _evidence.md.
- [x] Consolidar recibo final, limites operacionais e checklist de ativação/staging para o root. Tipos pós-merge dos seis pacotes0 e Auth real com coorte não vazia7/45 em _evidence.md; incorporação/ativação seguem o root.

Nenhum bloqueio de fonte confirmado na cadeia backend. A configuração real de segredos,
coorteAuth e a ordem operacional de rollout continuam requisitos de ativação; a prova local
comJWT QA / coorte vazia não equivale a loginAuth ou migração de produção. Não ampliar produto.

- [x] Fechar gap de coorteAuth vazia: CLI realcaptura3owners (Construtor/semXP/arquivado), preservaearned antesV1, e criação cliente pending→Members→ready com barreira real, sessãoKids e idempotência.
- [x] Ajustar somente3fixtures detectadas no TSCMemberShell pós-merge; preservarRED, GREEN11/24, Biome3/0 e incrementalEXIT0.
- [ ] Incorporação final pelo root e validação controlada emstaging antes de produção; não são deploys executados por este agente.
