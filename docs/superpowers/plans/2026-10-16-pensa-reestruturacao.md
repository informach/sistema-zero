# Plano de implementação da reestruturação do Pensa

Data: 16/10/2026. Implementação em lotes e revisões registradas no [relatório de execução](../../../.audits/pensa-implementation-reviews-2026-10-16.md).

Direção aprovada: definição do jogo completo escolhido → missões funcionais em ordem lógica → acompanhamento simples. Preparação recomenda a extensão oficial. O Zappy adapta propostas aos recursos atuais, explica limitações e registra a escolha da criança. Substituição integral, sem compatibilidade com Pensa ZERO/v2.

**Contrato normativo:** [especificação](../../plans/2026-10-16-pensa-reestruturacao-spec.md). **Diagnóstico:** [análise do propósito](../../../.audits/architectural-analysis-2026-10-16-pensa-purpose.md).

Execução autorizada em lotes, usando executing-plans e registrando as revisões. As decisões de produto já foram autorizadas; dúvidas técnicas rotineiras são resolvidas pelo contrato e pelas fontes do código. Aplicação de migrations remotas e publicação continuam fora desta entrega local.

## 1. Regras de execução

- Uma implementação final e um contrato canônico; sem flags de versão, aliases v2, leitores de payload antigo ou adapter que transforme guia antigo em missão nova.
- Corrigir as fontes: domínio, schemas, API, persistência e consumidores mudam juntos. Esconder os passos na interface não encerra a tarefa.
- Preservar armazenamento, autenticação, editores, provedores e limites compartilhados. Não introduzir framework, serviço genérico ou motor de workflow.
- Validar capacidades atuais antes de prometer um jogo executável. Falha de consulta não significa bloqueio.
- Não executar tarefas usando a união fictícia de recursos de pessoas diferentes. Cada missão exige executor elegível real.
- Nenhuma revisão de plano apaga criação nem reinicia todas as missões por padrão.
- Nenhuma publicação parcial, cobrança duplicada, conclusão otimista ou evidência runtime inventada.
- Preservar alterações de outras frentes no workspace, especialmente o trabalho do Molda identificado na preparação. Não usar reset/stash/revert global.
- Testar contratos e comportamentos, sem APIs de produção criadas apenas para testes ou mocks que substituam a regra de negócio.

## 2. Dependências e entregas

| Tarefa | Entrega | Depende de |
| --- | --- | --- |
| T0 | Cenários de referência e inventário final de substituição | Especificação |
| T1 | Contratos, limites e regras puras canônicos | T0 |
| T2 | Schema, migrations e fixtures reais de banco | T1 |
| T3 | Agregado, progresso, revisão por impacto e equipe | T1–T2 |
| T4 | Recursos atuais, adaptação e inspeção da criação | T1, contratos de T3 |
| T5 | Pipeline IA, memória, orçamento e retomada | T3–T4 |
| T6 | API canônica, gateway e cliente BFF | T3–T5 |
| T7 | Sessão de missão, salvamento e continuidade nas oficinas | T4, T6 |
| T8 | Interface única do Pensa | T1, T6–T7 |
| T9 | Painéis funcionais Estúdio/Pinta/Molda e Pro | T1, T7 |
| T10 | Checkpoints, restore, voz e exclusão | T3, T6–T9 |
| T11 | Gamificação, funil, atividade e consumidores indiretos | T3, T6 |
| T12 | Remoção do legado, documentação e preflight operacional | T8–T11 |
| T13 | Verificação integrada e material de entrega | T0–T12 |

T4 pode avançar enquanto a persistência de T3 é construída sobre interfaces de T1. T8 e T9 podem avançar em paralelo depois do contrato de sessão. Voz e métricas são independentes depois de suas bordas estarem estáveis. Não paralelizar edições concorrentes do mesmo schema, composition-root ou migration journal.

Cada tarefa termina com contrato/código revisado e verificações pertinentes. A liberação acontece somente depois do percurso completo; essa ordem não prevê coexistência pública entre versões.

## 3. T0 — Referências e inventário

- [x] Reconfirmar rotas, imports, exports, tabelas, tests e consumidores atuais nos caminhos da especificação.
- [x] Registrar a situação do workspace e não incluir alterações alheias na entrega.
- [x] Preparar fixtures de entrada, capacidades reais e planos esperados para os casos abaixo.
- [x] Definir critérios semânticos de avaliação e exemplos positivos/negativos de granularidade.

| Caso | Obrigatório |
| --- | --- |
| Memória com doze cartas | Preparação, organização, cartas, seleção, acerto/erro, vitória, reinício e teste final |
| Plataforma com mais de uma fase | Ordem coerente, controles, obstáculos, condições escolhidas e reaproveitamento entre fases |
| Exploração 3D sem vitória | Recursos autorizados, liberdade de exploração, arte/integrar e conferência dos comportamentos |
| Ideia 3D em perfil somente 2D | Explicação, adaptação semelhante e escolha explícita |
| Ideia com recurso não suportado | Alternativa comprovável ou impedimento honesto |
| Equipe de capacidades distintas | Executor real por missão, arte entregue antes da integração |
| Jogo existente/modo Pro | Preservação de identidade, sem recriar base ou instalar Blockly |
| Projeto extenso | Mais de oito missões, memória preservada e revisão integral dentro de orçamento |

Fixtures não devem afirmar acesso só porque um nome está no catálogo geral. Derivar os IDs técnicos dos catálogos oficiais e fixar o perfil do teste. Não usar geração real paga para tornar o teste determinístico.

**Aceite T0:** cada requisito do caso tem destino esperado; exemplos de missão distinguem resultado funcional de tutorial e de tarefa vaga.

## 4. T1 — Contratos e políticas do domínio

Arquivos: packages/core/src/pensa/{index,model,schemas,limits,plan,progress,changes,team}.ts; testes junto aos módulos ou na organização existente de core/tests.

- [x] Implementar schemas estritos e tipos inferidos da definição, requisitos, slots, adaptação, missão discriminada, plano, revisão, progresso, draft e view.
- [x] Separar schemas de entrada do navegador, saída do modelo e registros emitidos pelo servidor. Aceite/autoria/datas/capacidades não são campos de autoridade do cliente.
- [x] Fixar limites por campo, bytes agregados, tamanho de contexto, saída e work manifest em PENSA_LIMITS.
- [x] Implementar cobertura obrigatória por missão, tipos/ferramentas de slots e exatamente um teste final de projeto.
- [x] Implementar ordem topológica, dependências reais, elegibilidade individual e próxima ação incluindo reconferência.
- [x] Implementar classificação de alteração editorial/funcional e fechamento de impacto nas dependências.
- [x] Definir envelope de concorrência: revisão aceita, contentRevision, progressRevision, metadataRevision, teamRevision e revisão de draft.
- [x] Definir referências de voz por origem/conteúdo/revisão.
- [x] Exportar a superfície indicada na especificação, sem reexports legados.

**Verificação:** testes das regras com todos os casos de T0; inclusive completed + needs_review não deixa o grafo sem próxima ação. Typecheck do core.

**Aceite T1:** um requisito não pode sumir; um setup não precisa de blockIds; todo plano pode ser finalizado por uma missão de teste definida; snapshots e comandos não admitem campos ambíguos de versão.

## 5. T2 — Persistência e migrations

Arquivos: schema.ts, migrations novas e snapshots/journal gerados; testes DB do Members; scripts operacionais novos explicitamente separados do runtime.

- [x] Implementar as tabelas finais de projeto/revisão/draft/progresso/mensagens/eventos e adaptar operações/checkpoints/equipe.
- [x] Remover ciclos, jornadas, artefatos, conversas por etapa, tarefas e enums exclusivamente antigos.
- [x] Garantir fonte única da especificação ativa, IDs estáveis, índices, unicidades, FKs e CAS.
- [x] Alterar reservas financeiras para preservar histórico quando um projeto é excluído, com projectId anulável e ON DELETE SET NULL.
- [x] Preservar eventos mínimos de recompensa com vínculo anulável, sem manter narrativa ou histórico de conteúdo após exclusão.
- [x] Criar migration customizada para o reset controlado do subconjunto Pensa e preparação de outbox, antes da DDL que elimina as estruturas.
- [x] No reset, liberar somente reservas pendentes; desvincular projectId das reservas Pensa antes da cascata antiga, preservando linhas committed/released e contadores.
- [x] Preservar private_narrations, pensa_provider_usage, ai_usage_daily e outbox; retirar somente referências de origem que já não existem.
- [x] Gerar DDL com o script Drizzle. Nunca editar SQL/snapshots gerados nem migrations históricas.
- [x] Conferir a ordem do journal e a correspondência entre schema final e SQL.
- [x] Substituir o fixture que ignora DROP e injeta DDL manual por execução das migrations reais.

Comandos de geração, dentro de packages/members:

~~~powershell
bun run db:generate -- --custom --name pensa_functional_reset
bun run db:generate -- --name pensa_functional_schema
~~~

O número da migration é o próximo disponível no momento da execução; não assumir que a sequência atual continua livre. Esses comandos geram artefatos locais; db:migrate remoto pertence à janela operacional posterior.

**Verificação:** banco PostgreSQL descartável vazio e banco com dados antigos completos. Inserir sentinelas em criações Estúdio/Pinta/Molda, cursos, XP, ledger de IA e fila de exclusão de conta. Aplicar a sequência real e verificar sentinelas, outbox e contabilidade.

**Aceite T2:** não resta seletor de implementação por existência de journey; ferramenta/criação/contabilidade não sofre reset; migration não depende de código antigo em execução.

## 6. T3 — Agregado, progresso e revisão

Arquivos: domain/pensa, portas de repositório, application/pensa, repositórios Drizzle e composition-root.

- [x] Criar agregado de projeto com revisão aceita imutável e progresso separado.
- [x] Implementar casos de uso de criar, ler, metadados/pausa/arquivo, rascunho/aceite, início, nota, conclusão, reabertura e reconferência.
- [x] Publicar definição/plano e delta do progresso atomicamente, sem substituir todas as identidades.
- [x] Preservar criação, claim e conclusão de missões sem alteração funcional.
- [x] Revalidar versões do progresso afetado no aceite; não sobrescrever avanço de colega.
- [x] Calcular próxima ação no domínio/servidor e incluir na view e nas mutações.
- [x] Implementar regras individuais de recursos, claim atômico e permissões de equipe.
- [x] Conservar bloqueio de trocar quem programa depois de iniciado/salvo o jogo; não implementar transferência de arquivos entre contas.
- [x] Guardar histórico de comandos/eventos e deduplicar requestId; corpo diferente com mesmo ID deve ser recusado.
- [x] Adotar uma ordem única de locks, sem chamadas externas dentro da transação.

**Verificação:** concorrência real em PostgreSQL para dois claims, duas conclusões, dois aceites e progresso durante revisão. Testar texto editorial, mudança de regra, retirar/reincluir requisito, reordenação, reconferência e retorno após falha.

**Aceite T3:** mudança localizada conserva trabalho não afetado; reabrir uma missão não deixa o grafo travado; um save novo não invalida todo o plano; GET não muda estado.

## 7. T4 — Recursos atuais, adaptação e inspeção

Arquivos: member-shell/server/pensa/context.ts, inspection.ts, projeções oficiais do Estúdio, team-capabilities e serviços de criações existentes.

- [x] Consolidar leitura atual de entitlements, posto, blocos conquistados, extensões, formatos, autoria, Molda, tutor e inventário.
- [x] Diferenciar leitura indisponível de recurso bloqueado ou criação ausente.
- [x] Separar fingerprint dos recursos do projeto/equipe de identidade do solicitante.
- [x] Validar cada missão contra pelo menos um executor real; programação usa os recursos de quem programa.
- [x] Consultar catálogo/manuais oficiais para a combinação completa e a escolha do runtime.
- [x] Implementar relatório de viabilidade e adaptações com recibos de escolha emitidos pelo servidor.
- [x] Preservar intenção original e registrar diferença da adaptação, sem inserir parte impossível no plano ativo.
- [x] Criar inspection usando r2ReadCreationJson + validação existente; ler raw/program sem reconstruir as partes de assets.
- [x] Conferir bilhete, owner, revision, dimensão, autoria, extensões e conflitos; preparar fatos técnicos internos HMAC.
- [x] Revalidar a criação/recursos sob CAS no Members antes da conclusão.
- [x] Reconciliar configuração ao abrir/retomar e por revisão salva; remoção de extensão afeta somente resultados dependentes.

**Verificação:** perfil 2D/3D, blocos parciais, falha de leitura, equipe com união impossível, recursos alterados durante chamada, extensão já instalada/conflitante e manifesto de outro projeto/revisão.

**Aceite T4:** alternativa oferecida é realizável agora e preserva uma intenção reconhecível; extensão vem do catálogo oficial; nada depende de installed=true enviado pelo cliente.

## 8. T5 — IA, memória e orçamento

Arquivos: member-shell/server/pensa/{planning,contracts,help}.ts, reutilização do cliente pensa-llm e operações/budget no Members.

- [x] Substituir propose/review/guides pelo pipeline da especificação.
- [x] Persistir definição canônica a cada decisão e aproveitar histórico sem depender dele para preservar requisitos.
- [x] Usar modelos de rascunho sem UUIDs/autoria/permissões de autoridade; resolver aliases e IDs no servidor.
- [x] Gerar esqueleto completo, cartões funcionais e testes de conferência, preservando autoria.
- [x] Implementar work manifest que contabiliza produção, revisão local, revisão cruzada, auditoria e reparos.
- [x] Conferir bytes reais de contexto e limites de saída; ajustar lotes antes de chamar o modelo.
- [x] Registrar a cobertura de revisão dos cartões completos e ligações entre missões. Um índice resumido não aprova semântica que não recebeu.
- [x] Implementar admissão/compactação sem perder decisões quando o manifesto exceder o orçamento.
- [x] Separar orçamento de diálogo, elaboração e ajuda; remover exceção de guides e marca de operação antiga.
- [x] Manter claims por chamada, pagador original, reserva, ledger e contador externo; retries não passam por fora.
- [x] Manter rascunho/lotes ao falhar e retomar somente o que falta.
- [x] Bloquear candidato parcial, tecnicamente impossível, sem conferência final ou sem cobertura completa.

**Verificação:** IA fake retorna JSON inválido, tutorial, requisito omitido, recurso bloqueado, adaptação não escolhida, regras contraditórias e IDs estrangeiros. Testar falha no último lote, lease vencido, resposta tardia, quota no meio, reserva expirada e reenvio idempotente.

**Aceite T5:** o plano completo aparece somente depois de revisado; nenhuma chamada oculta; diálogo/lotes não se apagam em falha; limite de processamento não vira falsa limitação pedagógica.

## 9. T6 — API, gateway e cliente

Arquivos: rotas Members Pensa, schemas compartilhados, member-shell/routes/pensa.ts, client, gateway.config.ts e shim Kids.

- [x] Implementar a tabela de endpoints canônicos da especificação.
- [x] Usar schemas de entrada/saída canônicos, incluindo limites consistentes. Não duplicar tipos de guia ou domínio em bordas.
- [x] Consolidar getProject/handoff/nextAction; eliminar consulta stages/z.
- [x] Separar endpoints internos HMAC de operações públicas; navegador não escolhe actor/lease/capacidades/storage.
- [x] Restringir mutation fields de metadados, draft, confirmação e progresso.
- [x] Preservar parent gate, viewer, impersonation somente leitura e acesso por jornada.
- [x] Preservar join 10/min e limites por rota; corpo integral do draft tem envelope próprio.
- [x] Atualizar cliente Members e shims num mesmo contrato. GET privado sem cache compartilhado.
- [x] Implementar erros tipados recuperáveis e respostas com próxima ação e revisões explícitas do plano/progresso.

**Verificação:** testes HTTP com autenticação, papel errado, HMAC inválido, corpo fora do limite, acesso revogado e requisição repetida. Schema aplicado pelo Elysia não pode eliminar campos válidos silenciosamente.

**Aceite T6:** todos os consumidores usam uma API; não há alias /v2, /tasks ou /cycles de planejamento; endpoints de leitura não alteram projeto nem consomem IA.

## 10. T7 — Sessão de missão e continuidade

Arquivos: host Pensa, sessão/handoff/links no Kids, sessões Estúdio/Pinta e callbacks de salvamento.

- [x] Trocar onOpenTask por onOpenMission e tornar onOpenGame explícito.
- [x] Navegar com identificação de missão do contrato final, preservando ID canônico do jogo.
- [x] Implementar uma sessão de missão com schema importado do core e disponibilidade retornada pelo servidor.
- [x] Fazer flush + cloud.confirm + leitura da revisão antes de conclusão/troca de oficina.
- [x] Revalidar identidade após awaits, evitando atualização tardia de outro perfil/projeto.
- [x] Trocar missão no mesmo Estúdio sem recriar editor, projeto, undo ou buffers.
- [x] Usar nextAction do servidor para continuar; retirar políticas locais duplicadas.
- [x] Tratar criação faltante ou vínculo removido sem criar jogo vazio silenciosamente.
- [x] Abrir jogo sem iniciar missão; manter navegação completa do Pro.

**Verificação:** duas missões no mesmo arquivo, troca de oficina, erro de nuvem, reload, troca de perfil, missão aposentada e retorno do Pro. Asserções devem incluir criação preservada e estado persistido, não só botão clicado.

**Aceite T7:** continuidade real nas oficinas, sem perda de contexto e sem reconstrução automática do jogo.

## 11. T8 — Interface única do Pensa

Arquivos: PensaApp e componentes de definição/caminho/missão/mudança, hook do projeto, estilos e playground.

- [x] Compor uma interface única e remover navegação para LegacyPensaApp.
- [x] Apresentar entrada livre, respostas sugeridas e definição corrigível.
- [x] Mostrar limitação/adaptação e escolha antes de apresentar alternativa como aceita.
- [x] Mostrar definição e caminho completos antes do aceite; conservar ideias não incluídas.
- [x] Destacar próxima missão com objetivo/regras/conferência e caminho por etapas.
- [x] Mostrar preparação/extensão com nome oficial e motivo simples.
- [x] Exibir progresso e necessidade de reconferência sem kanban ou checklist de gestos.
- [x] Oferecer mudança com impacto, nota de retomada, reabrir e reconferir.
- [x] Manter plano ativo durante geração de uma mudança e rascunho em falha.
- [x] Preservar tema Kids, ZERO, foco, teclado, responsividade, voz/escuta e controles do host.
- [x] Substituir playground/fakes pelo contrato final, sem simular aceites automáticos ou semântica inexistente.

**Verificação:** componentes e navegador em celular/desktop, ideias curtas/longas, adaptação, mais de oito missões, plano alterado por colega, erro de geração e reabertura.

**Aceite T8:** a criança encontra o jogo escolhido, entende a próxima parte, consegue discordar e retomar sem recontar decisões.

## 12. T9 — Painéis funcionais e preparação

Arquivos: UI/PensaMissionContent, TaskGuidePanel, TaskBriefPanel, Molda task guide e sessões Pro.

- [x] Criar corpo funcional compartilhado: objetivo, regras, conferência e preparação tipada.
- [x] Substituir PensaInstructions em todas as oficinas.
- [x] Retirar steps, marcações sintéticas, blocos úteis embutidos e tutorial de conversão.
- [x] Integrar ação de preparar usando instalação nativa, sem instalação automática no aceite/abertura.
- [x] Diferenciar preparação, funcionalidade, arte, integração e teste nos rótulos de conclusão.
- [x] Reconhecer configuração já salva; guardar antes de confirmar instalação.
- [x] Concluir arte com os slots salvos e tirar requiresStudioUse; integração ocorre em missão própria.
- [x] Oferecer próxima missão e ajuda contextual mantendo erros/foco visíveis.
- [x] Preservar painel recolhível e preferência por perfil.

**Verificação:** mesmo cartão no Pensa e nas três oficinas; ações idempotentes; extensão removida posteriormente; Pinta/Molda com múltiplos slots; reconferência e conteúdo funcional inalterado no Pro.

**Aceite T9:** nenhum destino reapresenta tutorial de montagem; preparação é explícita e conferida; criação e integração não formam dependência circular.

## 13. T10 — Versões, restauração, voz e exclusão

- [x] Adaptar checkpoint para snapshot do plano/progresso e arquivos associados, sem cycleId.
- [x] Preservar prepare/copy/verify/commit; incluir versões de progresso afetado e teamRevision.
- [x] Fazer restore atômico do arquivo/ponteiro/progresso, com números de revisão monotônicos.
- [x] Preservar estado atual em conflito e agendar limpeza dos destinos órfãos.
- [x] Revalidar equipe/recursos atuais e referências externas; não restaurar acesso antigo.
- [x] Reabrir conferência final depois de restore e outras partes somente quando afetadas.
- [x] Atualizar narração para definição/draft/missão/mensagem por revisão, sem texto livre.
- [x] Preservar redaction própria do Pensa, preferências parentais e cache/cotas privados.
- [x] Adaptar exclusão do plano/purga de conta e outbox sem finalizar conta inteira.
- [x] Conservar recibos/intenções mínimos de recompensa pendente na exclusão, sem narrativa e sem cascade financeira.
- [x] Garantir que remover vínculo Pensa preserve abertura do jogo independente.

**Verificação:** progresso de colega durante cópia, autosave concorrente, restauração parcial, áudio antigo, acesso revogado durante síntese, criação de outra conta, cancelamento e limpeza após falha.

**Aceite T10:** recuperação coerente e segura, sem perder avanço concorrente nem misturar versões de plano/jogo.

## 14. T11 — Consumidores indiretos

Arquivos: gamificação/ledger/badges, tool-usage.repository, pensa-funnel service/repository/port, Admin card/labels/testes.

- [x] Implementar os quatro marcos novos com o orçamento existente de XP/moedas.
- [x] Persistir marco e intenção de recompensa na mesma transação, com entrega idempotente/repetível ao ledger.
- [x] Não premiar setup como funcionalidade nem repetir marco após revisão/reabertura/restore.
- [x] Adaptar badges e atividade do aluno para distinguir plano de jogo conferido.
- [x] Substituir SQL/labels de primeiro começo, cycle1 e stage=done pelo novo funil.
- [x] Remover imports de tipos/serviços ZERO no wiring e nos consumidores indiretos.

**Verificação:** falha e retry de recompensa, exclusão antes do retry, duas pessoas acionando marco, retirar/reincluir funcionalidade, atualização do Admin e isolamento de conquistas/contabilidade de outras áreas.

**Aceite T11:** não há recompensa perdida/duplicada e as métricas descrevem o comportamento novo.

## 15. T12 — Remoção e preparação operacional

- [x] Remover componentes/tipos/testes/serviços/rotas que só sustentam o fluxo anterior.
- [x] Retirar leituras stages/z, fallbacks legado, aliases v2, contractVersion seletor, completedStepIds e completedCriteriaIds.
- [x] Remover flags/opcionais cujo único motivo é servidor/host antigo; manter opções reais de voz, ausência de recurso e tema conforme host.
- [x] Consolidar docs/pensa-planner.md e os CLAUDE.md dos pacotes afetados.
- [x] Marcar planos antigos como históricos e apontar o contrato vigente; não deixar requisitos contraditórios como instrução ativa.
- [x] Criar preflight/cutover/rollback do subconjunto Pensa com manifesto e modo dry-run.
- [x] Inventariar prefixes privados antes das cascatas e incluir donos, membros, autores de checkpoints/narrações e destinos não confirmados.
- [x] Documentar limpeza das chaves locais exclusivas Pensa e vínculos encerrados, sem apagar banco/arquivos das oficinas.
- [x] Preparar a janela operacional descrita abaixo e executar somente no ambiente autorizado.

### Janela de substituição

1. Backup/restauração ensaiados do subconjunto; confirmação operacional de que não há uso infantil a preservar.
2. Bloqueio temporário de escritas/processamento Pensa, com recado curto; cursos/oficinas seguem disponíveis.
3. Cercamento de workers, cancelamento/liberação de reservas e outbox privada registrados.
4. Custom migration de dados e DDL gerado aplicados na ordem verificada.
5. Implantação coordenada de Members/gateway/BFF/hosts, sem servir a combinação de contratos.
6. Smoke de projeto/planejamento/adaptação/preparação/missão/revisão/reabertura/equipe/voz.
7. Contadores e sentinelas de criações conferidos; abertura do Pensa; outbox processada.
8. Se falhar: manter janela bloqueada e restaurar backup/implantação anterior. Não improvisar leitor compatível.

Não executar DROP SCHEMA members, db:push, reset global de IA/XP ou delete por prefixo amplo de perfil. O plano preserva criações independentes e contabilização externa, mesmo ao descartar dados antigos de teste do Pensa.

**Aceite T12:** há um contrato final em execução, migrations reais e procedimento operacional ensaiado, com limites de exclusão demonstrados.

## 16. T13 — Verificação integrada

Verificar primeiro regras/bordas alteradas; depois executar as suítes dos pacotes afetados e builds. Registrar comandos, saída, testes pulados e limitações. Testes DB Pensa exigem PENSA_TEST_DATABASE_URL e PostgreSQL local descartável; ausência de configuração não é aprovação.

Comandos existentes do repositório, a partir da raiz:

~~~powershell
bun run --filter @sistemazero/core typecheck
bun run --filter @sistemazero/members typecheck
bun run --filter @sistemazero/member-shell typecheck
bun run --filter @sistemazero/api-gateway typecheck
bun run --filter @sistemazero/pensa typecheck
bun run --filter @sistemazero/ui typecheck
bun run --filter @sistemazero/studio typecheck
bun run --filter @sistemazero/pinta typecheck
bun run --filter @sistemazero/molda typecheck
bun run typecheck:kids
bun run typecheck:admin
~~~

~~~powershell
bun run --filter @sistemazero/core test
bun run --filter @sistemazero/members test
bun run --filter @sistemazero/member-shell test
bun run test:gateway
bun run --filter @sistemazero/pensa test
bun run --filter @sistemazero/ui test
bun run --filter @sistemazero/studio test
bun run --filter @sistemazero/pinta test
bun run --filter @sistemazero/molda test
bun run test:kids
bun test packages/admin/tests/pensa-funnel.test.ts
bun run build:kids
bun run build:admin
~~~

Executar check dos mesmos pacotes afetados, além de git diff --check nos arquivos da entrega. A CI da raiz é Biome, não um substituto dos testes ou builds. Falhas preexistentes em trabalho concorrente devem ser registradas, sem corrigi-las ou suprimi-las fora do escopo.

Banco: scripts/test-pensa-db.ts valida PENSA_TEST_DATABASE_URL contra PostgreSQL descartável explicitamente selecionado, recusa ambiente remoto/produtivo e executa migrations reais + testes de lock/CAS. Nenhum teste destrutivo usa DATABASE_URL como fallback. O script falha sem configuração explícita.

Navegador: a suíte foi colocada em packages/pensa/e2e, junto ao app, e consome a sessão de missão real do Kids. Usa o Playwright do monorepo com BFF/worker/API/domínio/PostgreSQL reais. Há também três provas visuais do playground. Identidade de QA, provedor e armazenamento são fronteiras de teste; o progresso do backend não é substituído por respostas fictícias. O host de QA não representa o editor completo: instalação nativa, conversão, artes e gravação dos editores têm verificações próprias, discriminadas no relatório.

~~~powershell
bun run --filter @sistemazero/pensa e2e
bun run --filter @sistemazero/pensa typecheck:e2e
# Com PENSA_TEST_DATABASE_URL apontando ao PostgreSQL local descartável:
bun run --filter @sistemazero/pensa e2e:native
bun run --filter @sistemazero/members test:pensa-db
~~~

### Percursos de aceite e cobertura integrada

O relatório identifica a camada de prova de cada percurso. O navegador nativo percorre planejamento, aceite, configuração salva, execução, dependências, conclusão, reabertura e recarga. Os demais percursos combinam API/banco, regras e componentes reais; não estão sendo apresentados como onze percursos completos dos editores em navegador.

- [x] Ideia → definição → adaptação escolhida quando necessária → plano completo → aceite.
- [x] Preparação → instalação nativa → save confirmado → configuração verificada.
- [x] Construir → salvar → conferir → próxima missão no mesmo jogo.
- [x] Criar arte em equipe → entregar slots → trazer da equipe → integrar e conferir.
- [x] Mudar regra → impacto apresentado → aceite → progresso válido preservado.
- [x] Reabrir → reconferir → dependentes liberados sem perder criação.
- [x] Guardar versão → editar → restaurar → reconferir partida.
- [x] Converter para Pro → continuar os mesmos objetivos sem tutorial Blockly.
- [x] Pausar/recarregar/trocar perfil → retornar sem resposta atrasada aplicada no lugar errado.
- [x] Falhas de IA/recursos/nuvem/voz → recuperação compreensível e sem cobrança/conclusão falsa.
- [x] Excluir plano → jogo/arte independentes preservados e outbox restrita.

**Aceite T13:** evidências atuais de todos os percursos e dos requisitos da especificação, com testes, banco, navegador e builds separados. Observação com crianças é registrada separadamente; não afirmar compreensão com base em testes de componentes.

## 17. Rastreabilidade e entrega

| Requisito de produto | Tarefas |
| --- | --- |
| Definir a ideia facilmente e preservar autoria | T0, T1, T5, T8 |
| Planejar todo o escopo escolhido | T1, T3, T5, T8 |
| Considerar recursos atuais e adaptar com explicação | T0, T4, T5, T8 |
| Recomendar extensão na preparação | T1, T4, T7, T9 |
| Missões funcionais em linguagem infantil | T0, T1, T5, T8–T9 |
| Gestão, retomada e revisão localizada | T3, T7–T10 |
| Equipe e arte com responsabilidade clara | T3–T4, T7, T9 |
| Voz, segurança e crédito corretos | T4–T6, T10 |
| Substituição integral sem compatibilidade | T2, T6, T12 |
| Prova de funcionamento e limites honestos | T0, T13 |

Entregar diff revisável, documentação vigente, migrations/manifesto, relatório de verificação e notas de implantação/rollback. O relatório informa o que mudou, os comportamentos demonstrados e qualquer etapa operacional ainda não executada.

Os itens operacionais foram preparados e ensaiados somente em PostgreSQL local descartável. A janela de implantação coordenada permanece para o ambiente de destino. Não houve chamada a provedor pago, migração remota ou publicação. O relatório registra os comandos executados, as verificações delimitadas e a ausência de observação com crianças.
