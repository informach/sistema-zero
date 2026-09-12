# Full review — recados, ajuda e progresso Kids

12/09/2026. Revisão da implementação local descrita no [plano](../docs/plans/2026-09-11-kids-recados-progresso-implementacao.md), comparada com `HEAD` (`4b08fec7`). As alterações de layout e barra de progresso já presentes no workspace não foram tratadas como parte desta implementação.

**Revisão inicial: 7 problemas confirmados (2 P1 e 5 P2). Os sete foram corrigidos em 12/09/2026.** Os achados abaixo preservam o diagnóstico original; a correção e a verificação estão registradas nesta atualização.

## Correções e regressões — 12/09/2026

| Achado | Correção aplicada | Testes de regressão |
| --- | --- | --- |
| R1 | Checkpoint, quiz e entrega usam a ordem de locks conta → perfil → bloco/aula e verificam a cerca de exclusão. A purga adquire os locks antes de apagar evidências. Quiz passa a levar a conta responsável. A proteção cobre inclusive um perfil ausente da enumeração inicial da exclusão. | [Concorrência e exclusão em PostgreSQL](../packages/members/tests/db/learning-evidence-purge.test.ts) |
| R2 | A restrição a correção híbrida fica na publicação; a leitura do aluno conserva o contrato da aula existente. Uma entrega legada aprovada conclui a seção, enquanto uma nova publicação incompatível é recusada. | [Compatibilidade de aulas antigas](../packages/members/tests/integration/legacy-section-grading.test.ts) |
| R3 | Editor e publicação usam contratos reais de conexões, posicionamento, parâmetros, nível e extensões. Objetivos incompatíveis são recusados, inclusive quando importados. O módulo compartilhado usa somente dados puros, sem carregar o editor no backend. | [Contratos de autoria](../packages/studio/src/blockly/__tests__/projectCheckAuthoring.test.ts), [publicação transacional](../packages/members/tests/db/lesson-draft-cases.ts), [fronteira do servidor](../packages/studio/src/blockly/__tests__/serverProjectChecks.test.ts) |
| R4 | A travessia segue a sombra ativa quando não há bloco substituto. O catálogo identifica sombras de valores não literais; sombras substituídas, desativadas ou de comandos continuam excluídas. Servidor, Estúdio e simulação compartilham o avaliador. | [Valores e sombras](../packages/core/tests/project-structure.test.ts), [sombras do catálogo](../packages/studio/src/blockly/__tests__/projectCheckAuthoring.test.ts) |
| R5 | A simulação deriva do projeto carregado e dos critérios atuais. Uma leitura de arquivo antiga não pode sobrescrever a seleção mais recente. | [Regressões do Admin](../packages/admin/tests/kids-review-regressions.test.tsx) |
| R6 | O detalhe aberto revalida todas as páginas de destinatários já carregadas. Entrega, leitura e acesso à conversa são atualizados; respostas de detalhes fechados são descartadas. | [Polling, paginação e respostas fora de ordem](../packages/admin/tests/kids-review-regressions.test.tsx) |
| R7 | O histórico é independente das seções atuais e oferece páginas de 100 registros. A ordem data + id conserva a precisão do PostgreSQL; o resumo mantém origem/revisão e o projeto completo é recuperado sob demanda. | [API de histórico](../packages/members/tests/integration/learning-evidence-history.test.ts), [paginação no banco](../packages/members/tests/db/learning-evidence-purge.test.ts), [exibição de registros removidos](../packages/admin/tests/kids-review-regressions.test.tsx) |

As reproduções originais em `kids-review-2026-09-12/{core,db,ui}.test.*` agora encaminham para as regressões nos packages. O relatório de diagnóstico inicial e seus resultados históricos foram preservados.

Verificação após as correções: **3.401 testes aprovados** — Members 882; Core 104; Admin 13; Studio 1.148; Kids 746; member-shell 474; comunidade adulta 5; PostgreSQL 29 (5 de exclusão/histórico, 21 de migrações/publicação e 3 de recados). As duas falhas por timeout na execução simultânea com builds foram verificadas novamente com a suíte do Studio isolada: todos os 1.148 passaram, sem alterar o limite dos testes.

**Builds de produção: Admin, Kids e comunidade adulta aprovados.** Checagens de tipos de Core, Members e Studio aprovadas. Biome, `git diff --check` e instalação com lockfile congelado verificados. O seletor com todas as extensões foi medido em aproximadamente 0,34s para os dois primeiros objetivos, após eliminar buscas repetidas que levavam cerca de 20s.

Não foi necessária migração adicional para estas correções. A implantação da funcionalidade original continua dependendo das migrações 0084 e 0085 já geradas. Todos os testes de banco usaram bases descartáveis em localhost; não houve envio real de recados, publicação de aulas, aplicação em produção ou deploy. Os fluxos de interface foram exercitados por testes de componentes com rede simulada; não houve navegação autenticada em produção.

## Achados da revisão inicial

### R1 · P1 — Evidências sobrevivem ou reaparecem após exclusão da conta

Local: [user-data-purge.repository.ts:85](../packages/members/src/infrastructure/persistence/drizzle/user-data-purge.repository.ts:85), [learning.repository.ts:103](../packages/members/src/infrastructure/persistence/drizzle/learning.repository.ts:103), [quiz-attempt.repository.ts:24](../packages/members/src/infrastructure/persistence/drizzle/quiz-attempt.repository.ts:24) e [studio-submission.repository.ts:58](../packages/members/src/infrastructure/persistence/drizzle/studio-submission.repository.ts:58).

A purga apaga `lesson_evidence` **antes** de obter o lock `creation-quota:<perfil>` usado pelas gravações de aprendizagem. Um checkpoint que já detenha esse lock pode concluir sua transação depois do DELETE de evidências. A purga espera, apaga o progresso e conclui; a evidência recém-gravada fica no banco. O novo lock `members-account` da purga não resolve essa corrida porque o escritor de aprendizagem não o utiliza.

Reproduzi com duas transações reais, controlando a ordem por locks PostgreSQL: ao final, o progresso estava vazio e havia **uma evidência com o projeto da criança**. Além disso, quiz e entrega não verificam a cerca de exclusão nem usam o mesmo lock de proprietário; uma requisição que já passou pelo acesso pode recriar evidências depois da purga. A segunda reprodução gravou duas evidências depois de a cerca existir.

Correção: coordenar todos os escritores de evidências com a purga, usando o mesmo protocolo de locks e validação da cerca. Adquirir os locks antes de qualquer DELETE de dados protegidos. Levar a conta responsável até a persistência de quiz para verificar a cerca corretamente. Preservar testes de concorrência para checkpoint, quiz e entrega.

### R2 · P1 — A regra nova bloqueia seções já publicadas com correção híbrida

Local: [section-progression.ts:171](../packages/core/src/learning/section-progression.ts:171), consumida por [section-progression.service.ts:88](../packages/members/src/application/learning/section-progression.service.ts:88).

A nova restrição rejeita entrega obrigatória do Estúdio com nota de corte e qualquer checagem de comportamento, caso de teste ou código. Ela não atua somente na próxima publicação: `read()` a aplica à estrutura que o aluno já está cursando e inclui o problema nas pendências da seção. A migração mantém esses critérios, sem converter as atividades para uma política compatível.

Reproduzi uma atividade válida na autoria anterior, com estrutura de peso 9 e execução de peso 1, nota mínima 100. A correção aprovou o projeto com 100 e a entrega aprovada estava persistida, mas a seção continuou com zero conclusões e a pendência “use apenas checagens estruturais”. Aulas/seções já concluídas são preservadas; alunos que ainda precisam concluir ficam presos. A reprodução demonstra a regressão para esse formato de aula; não foi consultado se ele existe hoje em produção.

Correção: estabelecer uma transição explícita para aulas existentes, com versão da política ou conversão de conteúdo validada antes da ativação. Não aplicar a restrição de autoria retroativamente durante a leitura do aluno sem tratar os critérios antigos.

### R3 · P2 — O editor e a publicação permitem objetivos impossíveis de cumprir

Local: [project-rule-editor.tsx:85](../packages/admin/src/components/editor/project-rule-editor.tsx:85) e [section-progression.ts:187](../packages/core/src/learning/section-progression.ts:187).

O seletor de área oferece todas as áreas para todos os blocos, mesmo quando o catálogo declara encaixe restrito. O seletor de contêiner também não valida se o bloco escolhido admite o filho. A publicação verifica formato, texto e existência do workspace, mas não verifica compatibilidade de área, lista de blocos permitidos, extensão instalada ou existência do tipo de bloco.

Reproduzi a aceitação de “Preparar o jogo” em **Aparência**, de um tipo inexistente e de um bloco fora da lista disponível na aula. O primeiro caso é alcançável diretamente pela interface e o próprio Blockly recusa esse encaixe. Portanto, uma configuração aprovada pode deixar o aluno sem uma ação que satisfaça o objetivo.

Correção: derivar opções do contrato de posicionamento e das capacidades do workspace; validar as mesmas restrições na publicação. Campos e inputs configurados também devem existir e aceitar o valor indicado. Não basta filtrar o catálogo visual, pois alterações no workspace e importações precisam da mesma proteção.

### R4 · P2 — Valores-sombra válidos não contam como bloco utilizado

Local: [project-structure.ts:72](../packages/core/src/learning/project-structure.ts:72).

A travessia de filhos segue somente `input.block`, ignorando `input.shadow`. Os números preenchidos normalmente nos blocos do Estúdio são sombras `sz_val_number` conectadas e ativas. O catálogo novo oferece esse tipo como objetivo, mas o verificador o reprova mesmo quando o número correto está no projeto.

Reprodução: uma tela em Ao iniciar com largura 480 passa no critério de parâmetro `W=480`, mas falha no critério “usar número 480”, aplicado ao mesmo nó. Editar o número inline não o transforma automaticamente em bloco real.

Correção: seguir o filho efetivo `input.block ?? input.shadow` e manter a exclusão da sombra substituída. Preservar as verificações de habilitação e encaixe; incluir fixture de sombra real do Blockly, além de sombra inválida/oculta.

### R5 · P2 — A simulação mantém aprovação antiga depois de editar a regra

Local: [section-completion-editor.tsx:41](../packages/admin/src/components/editor/section-completion-editor.tsx:41) e [section-completion-editor.tsx:194](../packages/admin/src/components/editor/section-completion-editor.tsx:194).

O resultado é uma string guardada no estado e só muda quando o professor seleciona outro arquivo. Alterar bloco, parâmetros ou regra não invalida nem recalcula o resultado. Reproduzi a simulação aprovada de uma área vazia; depois troquei a regra por uma tela de largura 800, mantendo o mesmo rótulo. A interface continuou dizendo **“Cumprido: Preparar a tela”**, embora o projeto não tivesse tela.

Correção: vincular o resultado à revisão dos critérios e do projeto simulado. Invalidar imediatamente ao editar ou recalcular com o projeto já carregado. Também proteger a leitura assíncrona do arquivo contra respostas de simulações anteriores.

### R6 · P2 — Acompanhamento dos destinatários fica congelado

Local: [broadcast-panel.tsx:101](../packages/admin/src/app/admin/professor/recados/broadcast-panel.tsx:101) e [broadcast-panel.tsx:377](../packages/admin/src/app/admin/professor/recados/broadcast-panel.tsx:377).

O polling de Enviados atualiza `sent`, mas a tela Destinatários renderiza outro estado, `detail`, carregado uma única vez. Quem abre os destinatários durante o processamento continua vendo “Em processamento” mesmo depois da entrega; o botão Abrir conversa também continua ausente. A leitura posterior do aluno sofre o mesmo problema.

Reproduzi uma entrega concluída após a abertura: o polling consultou a lista novamente, mas não o detalhe, que permaneceu pendente. É preciso voltar aos envios e reabrir para enxergar o estado atual.

Correção: revalidar o detalhe aberto, incluindo a faixa de destinatários já carregada, com proteção contra respostas antigas e sem descartar a paginação. Oferecer estado de atualização/erro coerente com a lista.

### R7 · P2 — Histórico de blocos removidos some da interface do professor

Local: [lesson-learning-panel.tsx:174](../packages/admin/src/components/professor/lesson-learning-panel.tsx:174).

O histórico só é renderizado dentro das seções atuais, filtrado por `sectionId` ou pelos `blockIds` atuais. Evidências de quiz e entrega são gravadas sem `sectionId`. Se o professor remove/substitui o bloco e publica, elas permanecem no banco e na resposta do relatório, mas deixam de aparecer na interface — inclusive o link para baixar o projeto original. Evidências de seção removida também ficam sem lugar para aparecer.

Reproduzi uma resposta do relatório contendo a entrega histórica de um bloco removido: a seção atual apareceu, porém nenhuma evidência ou ação de download foi renderizada. Isso limita justamente o acompanhamento após edição da aula que o novo histórico deveria atender.

Correção: oferecer uma lista de histórico independente da estrutura atual, identificando bloco/seção/revisão da época; manter a associação à seção atual como conveniência. Ao implementar a navegação histórica, tratar também a paginação do backend, hoje limitada às 100 evidências mais recentes sem continuação.

## Escopo e verificação

Foram inspecionados os contratos e diffs de Auth, Members, Gateway, Core, Studio, member-shell, Admin e das duas comunidades, além das duas migrações e dos manifestos alterados. A revisão acompanhou destinatários e acesso por perfil, confirmação/idempotência, worker/rollback, workflow/leitura, ajuda e contexto, critérios/publicação, gravação/histórico/exclusão, editor e acompanhamento. Não atribuí à implementação as alterações paralelas no layout/divisória/barra do player.

**84 testes existentes passaram novamente nesta rodada:** 46 de integração do Members; 10 do Core; 5 de componentes do Admin; 3 de recados em PostgreSQL; 20 de migração/importação/publicação em PostgreSQL. Essa cobertura confirma os caminhos já exercitados, mas não cobria os cenários acima.

**8 reproduções adicionais confirmaram os 7 achados:**

| Arquivo | Casos | Evidência |
| --- | --- | --- |
| [core.test.ts](kids-review-2026-09-12/core.test.ts) | 3 | Seção híbrida bloqueada, sombra ignorada e configurações impossíveis aceitas |
| [db.test.ts](kids-review-2026-09-12/db.test.ts) | 2 | Checkpoint concorrente à purga e recriação por quiz/entrega |
| [ui.test.tsx](kids-review-2026-09-12/ui.test.tsx) | 3 | Detalhe congelado, simulação obsoleta e histórico oculto |

Essas reproduções fazem assertions do **comportamento defeituoso atual**. Seu resultado positivo confirma o achado, não uma correção. As gravações usaram exclusivamente bancos vazios descartáveis locais; interfaces foram exercitadas em React/DOM com rede simulada. Não houve recados reais, consulta à produção, deploy ou percurso autenticado no navegador. Builds não foram repetidos nesta revisão; nenhuma mudança funcional foi feita desde os builds da implementação.

Comandos para repetir na raiz:

```powershell
bun test ./.audits/kids-review-2026-09-12/core.test.ts
bun test ./.audits/kids-review-2026-09-12/ui.test.tsx
bun .audits/kids-flows-2026-09-11/run-db.ts ../../.audits/kids-review-2026-09-12/db.test.ts
```

O comando de banco exige PostgreSQL local em `localhost:5433`. O runner cria `sz_aulas_qa_kids_*`, remove a base quando as assertions passam e nunca lê a URL de produção. Os logs desta rodada estão em `.audits/kids-review-2026-09-12/*.log` (ignorados pelo Git).

As limitações já declaradas — ausência de sandbox de execução, ausência de avaliação visual do Pinta e recados sem entrega retroativa a novas matrículas — não foram classificadas como defeitos novos. A persistência transacional dos envios, o isolamento das respostas e o escopo de leitura em lote passaram nos testes selecionados sem novos defeitos confirmados nesta rodada.
