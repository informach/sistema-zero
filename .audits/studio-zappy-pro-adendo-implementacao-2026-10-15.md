# Zappy Pro — implementação do adendo

Data: 15/10/2026. Referência: [adendo revisão 3](studio-pro-sandbox-adendo-2026-10-15.md) e [plano de execução](../docs/superpowers/plans/2026-10-15-studio-zappy-pro-adendo-implementacao.md).

Implementação no worktree `C:/Users/tocha/projects/sistema-zero`, branch `feat/studio-pro-completo`, coordenada diretamente com a sessão principal `01a13f08-9d2b-7ab0-b8ad-b9dc600f145f`. Esta frente não fez checkout, reset, stash, stage, commit, merge ou deploy. A homologação completa do lote 9 continua pertencendo ao plano principal.

## O que veio da análise do Sandbox

O aproveitamento foi de ideias de experiência e organização do trabalho. Não houve cópia de código, componentes, engine, serviços ou dependências de `C:/Users/tocha/Downloads/sandbox-main/sandbox-main`.

| Referência observada | Adaptação implementada no Studio |
|---|---|
| Conversa junto da prévia (`components/chat-thread.tsx`, `chat-preview.tsx`) | Zappy Pro reúne orientação, investigação e construção. A proposta pode ser experimentada no espaço de prévia antes de aplicar os arquivos. |
| Perguntas ao jogador (`lib/games/tools.ts`, `instructions/workflow.ts`) | Briefing, decisões e perguntas opcionais, persistidos no projeto. Não bloqueiam o editor nem disparam inferência ao responder. |
| Referência da engine oferecida ao agente (`lib/games/instructions/engine.ts`) | Ampliação do catálogo próprio de receitas por kit, com arquivos, exports, pré-condições, passos manuais, limites e verificações. |
| Marcadores de ferramentas e retomada de conversa | Eventos persistidos do job, propostas anteriores, consulta separada de continuação e recuperação da prévia sem nova geração por IA. |
| Criação assistida em turnos | Pedido com escopo de seleção, parte ou jogo; transferência de orientação/diagnóstico para um rascunho revisável de construção. |

A estrutura do Studio continua sendo a base: autenticação e perfis, créditos e limites, editor, kits próprios Canvas/Phaser/Three, pipeline de assets, Members e runtime. Revisões candidatas, comparação de versões, aplicação atômica e inversa são contratos próprios do Studio. Executor independente da aba, merge em três versões e tarefas com vários jobs automáticos continuam em A07, fora desta entrega.

## Comportamento entregue

### A01/A02 — uma experiência e cinco formas de autoria

- No projeto Pro, o assistente é Zappy Pro, com ações Conversar, Investigar e Construir na mesma conversa. O Zappy clássico permanece disponível no contexto clássico.
- A criança pode escrever tudo, pedir uma explicação, investigar um erro, encomendar uma parte ou solicitar um jogo inteiro. Nenhuma dessas escolhas vira um modo permanente que bloqueia as demais.
- A antiga aba IA e sua configuração de chave/modelo saíram do fluxo do produto. Entradas legadas encaminham ao tutor da mesma instância quando autorizado. O contrato externo `AIProvider` foi depreciado, preservando compatibilidade de importação; sem tutor autorizado não se cria outro chat.
- Seleção do Monaco, linhas originais, hash da fonte e versão do documento contextualizam os pedidos. Referências desatualizadas abrem o arquivo com aviso, sem marcar linhas incorretas. O menu de contexto funciona também por Shift+F10.
- A transferência de uma resposta para Construir preenche um rascunho. A execução só começa com a ação explícita do usuário. Em falha de transporte incerta, o pedido original e sua identidade permanecem congelados; usar código atualizado exige um novo pedido explícito.

### A02/A06 — domínio, custo e continuidade

- Pedido de assistência versionado e limitado, com intenção, escopo, critérios, referência opcional de seleção/diagnóstico, decisões e missão autorizada do Pensa. Campos desconhecidos, excesso de tamanho e referência incompatível com a base são recusados.
- Um job ativo por conta/perfil/projeto, chave idempotente, versão e lease. Consulta, listagem, descarte e recuperação local não fazem inferência.
- Histórico paginado e eventos limitados no mesmo registro/transação do job. Retenção continua obedecendo aos limites do serviço; não há promessa de armazenamento indefinido.
- Preservados preflight antes da criação, gates independentes M1/M2/M3, limites familiares/BYOK, ledger e tratamento de consumo incerto. Cada continuação fica limitada ao orçamento existente do job.
- A missão é obtida no servidor. Antes da aplicação, a referência é conferida novamente. Aplicar uma proposta não conclui automaticamente uma missão do Pensa.
- Exclusão local de projeto Pro grava, na mesma transação, uma solicitação pendente de remoção dos jobs remotos. A reconciliação autenticada tenta novamente ao abrir, reconectar ou enquanto o Studio estiver montado. ACK tardio de outro escopo não remove o pedido local. O servidor mantém uma cerca de sete dias contra criação atrasada e conserva registros financeiros. Excluir localmente não despublica o jogo.

### A03 — experimentar, aplicar e desfazer

- A prévia candidata recebe artefato, revisão e perfil de validação explícitos. Usa armazenamento efêmero, iframe isolado e canal validado. Alternar Atual/Proposta encerra a instância anterior, mantendo editor e controlador do projeto.
- Fechar o chat não encerra a candidata; trocar projeto/perfil a remove. Expiração e ausência de handshake aparecem como estados próprios. Uma captura não é usada como URL do jogo.
- Recuperar prévia vencida recompila a candidata retida com novas provas e lease, dentro do limite de três recuperações, sem chamar o modelo.
- Aplicar compara a revisão e as decisões. Documento e registro com inversa são confirmados juntos no IndexedDB. Falha de quota mantém trabalho em memória/recuperação e oferece retry de salvamento, sem executar o patch novamente.
- Desfazer usa a inversa e suas pré-condições; não restaura indiscriminadamente o snapshot inteiro. O registro é local ao perfil/aparelho e tem limites explícitos: 20 operações/8 MiB por projeto e 32 MiB por perfil.
- Persistência comum recebeu coordenação de versões, proteção entre abas e recuperação de saída da página. Armazenamento v3 preserva o formato de documento v2 e recupera gravações tardias de clientes v2 em cópias separadas.

### A04/A05 — autoria e aprendizado

- Briefing, decisões com origem/aceite e perguntas com respostas livres ficam em metadados opcionais versionados. A edição manual continua disponível sem preencher o planejamento.
- Receitas próprias oferecem entender, seguir passos manualmente ou preparar uma alteração. O catálogo verifica referências contra os kits existentes e orienta uso de APIs e lifecycle do motor escolhido.
- O pedido pode incluir os diagnósticos TypeScript atuais com revisão/hash. São observações da base, não uma afirmação de causa ou prova de comportamento em execução. Critérios que dependem da avaliação da criança aparecem como manuais.

## Arquivos e integração

- Contratos: `packages/core/src/studio/pro-assistance.ts`, `pro-builder.ts`, `pro-tutor.ts`, `pro-game-knowledge.ts`.
- Experiência: `packages/studio/src/components/tutor/{ZappyPanel,ProBuilderPanel,ProAssistancePanel,ProLearningRecipes}.tsx`; contexto em `studio/tutor*`; Monaco em `modes/pro/ProCodeEditor.tsx` e `ProMonacoTabs.tsx`.
- Prévia: `studio/pro-candidate-preview.tsx`, `modes/pro/ProArtifactPreview.tsx`, `useProStorageBridge.ts` e composição dos previews existentes.
- Persistência: `state/proRevision.ts`, `projectStorageCoordinator.ts`, `projectStorageRevision.ts`, `persistence.ts`, leitores/migração, metadados em `core/proAssistance.ts`; exclusão em `state/proBuilderDeletion.ts` e `studio/pro-builder-deletion.tsx`.
- BFF: `packages/member-shell/src/routes/studio-builder.ts`, `server/studio-builder*.ts`, `server/studio-assistance.ts`, adapter e rota do tutor.
- Members: serviço, repositório, schemas e rotas do builder; serialização das referências do tutor; limpeza de dados do usuário.
- Migrações geradas pelo Drizzle: `0123_steep_warlock.sql` (assistência no job) e `0124_superb_karen_page.sql` (cerca de exclusão). Aplicadas apenas no Postgres local dedicado de revisão, não em produção. Devem seguir o fluxo normal de migração da entrega principal.

O runtime, publicação, player e capacidades ficaram com a sessão principal. A atualização do fingerprint de validação após estabilizar os contratos foi solicitada diretamente àquela sessão. Documentos de compartilhamento/publicação seguem a política da frente principal para remover metadados privados de assistência.

## Evidência de verificação

| Verificação | Resultado observado |
|---|---|
| Cinco cenários no Monaco real, Chromium (`e2e/zappy-assistance.config.ts`) | 5/5 passaram; autoria manual, orientação, investigação, parte e jogo completo. Serviços remotos controlados; editor/store/aplicar/desfazer reais. |
| Prévia candidata no Chromium (`e2e/pro-candidate-preview.config.ts`) | 3/3 passaram; ponte real, IndexedDB, Canvas/áudio, alternância, isolamento, expiração e HTTP indisponível. |
| Contrato de assistência em core | 3 passaram, 13 assertions. |
| Conversa, builder, recuperação de recibos, planejamento e exclusão (`studio-adendo-final-ui-tests.txt`) | 49 passaram, 185 assertions em cinco arquivos; inclui os quatro casos de recuperação adicionados pela revisão. |
| Rotas, ferramentas e orquestração do builder no member-shell | 23 passaram, 135 assertions. |
| Repositório no Postgres local dedicado | 10 passaram, 60 assertions; concorrência, escopo, idempotência, lease, preview, histórico e exclusão. |
| Planejamento opcional | 2 passaram, 9 assertions. |
| Exclusão local/outbox | 3 passaram, 13 assertions; transação real local, retry offline e A → B → A. |
| Persistência, migração, revisão e regressões relacionadas | 175 passaram, 643 assertions em dez arquivos, na rodada final sequencial. |
| Saída da página/concorrência em browser real | Caso final passou isolado em 13,53 s: 12 reloads imediatos no Chromium com CPU 6×, 12 no WebKit e dois writers independentes em cada motor. |
| Typecheck member-shell | Passou. |
| Typecheck Members | Passou. |
| Typecheck Studio | Passou (`bun run typecheck`, incluindo fixtures do browser). |
| Biome da frente principal do adendo | 16 arquivos conferidos, sem erros, avisos ou ajustes pendentes. |

Verificação local desta frente encerrada; arquivos liberados para integração da sessão principal. Os relatórios específicos preservam comandos e limitações: [prévia](studio-candidate-preview-implementacao-2026-10-15.md), [unificação da IA](studio-ai-unification-implementacao-2026-10-15.md). O aceite completo do lote 9 não foi marcado por esta frente.

Os números da tabela têm sobreposição; não devem ser somados como testes distintos. As checagens de Studio devem rodar dentro de `packages/studio`, para carregar o preload DOM de seu `bunfig.toml`. Uma tentativa na raiz sem esse preload falhou por `document is not defined`; executada no diretório correto, a mesma suíte passou.

A rodada ampla de persistência sob concorrência com o typecheck atingiu timeout do subprocesso browser e expôs um teste de debounce que esperava `sleep(0)` para uma operação de 10 ms. O teste passou a aguardar a confirmação real e sempre liberar gates/subscriptions em `finally`; o debounce de produto não foi alterado. A rodada unitária final foi executada depois do typecheck, separada do navegador.

Comandos finais da frente de persistência, em `packages/studio` (executar sequencialmente):

```powershell
bun test ./src/state/projectStorageCoordinator.test.ts ./src/state/proRevision.test.ts ./src/state/persistence.test.ts ./src/state/projectDatabaseInvariant.test.ts ./src/state/projectThumbs.test.ts ./src/state/projectBlocksMetaUnion.test.ts ./src/state/renameAndImportLimits.test.ts ./src/asset-library/personalSync.test.ts ./src/project-migrations/localProjects.test.ts ./src/persistence/service.test.ts --timeout 20000
bun test ./src/state/projectStorageBrowser.test.ts
```

### Achados corrigidos na revisão

- Retry de conversa preserva o payload original e sua chave, inclusive após edição local; contexto atualizado cria uma nova tentativa explícita.
- Respostas tardias, paginação e ações de histórico respeitam o escopo e a geração da instância, incluindo A → B → A.
- Orçamento do pedido é validado novamente depois de acrescentar a missão no servidor.
- Prévia não declara prontidão em HTTP indisponível e não usa armazenamento do jogo real.
- Quota não pode confirmar documento sem inversa nem apagar a operação nova para caber no limite. Recuperação de um projeto não impede listar/abrir o restante do perfil.
- Staging de saída da página conserva rascunho e inversas; descendentes substituem ancestrais conhecidos somente com confirmação correspondente. Cópias recuperadas excluídas não ressuscitam pela migração.
- Aplicação publica snapshot e recibo juntos, antes dos subscribers. Trocar de projeto numa microtask não associa a inversa ao projeto seguinte. O coordenador também rejeita divergência de `projectId`.
- ACK do autosave continua reconhecido depois de fechar/reabrir o painel e reidratar a mesma store. O aviso e o botão de retry acompanham o estado confirmado.

Esses achados receberam regressões e uma releitura independente. Ausência de novos impedimentos na revisão não é afirmação de ausência absoluta de defeitos.

## Limites de conclusão

Os testes de fluxo usam respostas remotas controladas, sem geração paga. Não certificam a qualidade semântica de um modelo externo, BYOK/limites familiares em produção, implantação do runtime ou a homologação de todos os hosts do lote 9.

O diagnóstico da baseline registra os erros TypeScript disponíveis e seu contexto. Não foi acrescentada uma execução isolada automática da base para classificar toda diferença de erro em runtime entre antes e depois. O verificador existente continua julgando a candidata e pode impedir aplicação quando há erros anteriores; não se amplia o escopo silenciosamente nem se reduzem os gates.

Não há executor que conclua o restante do trabalho com a aba fechada, criação automática de novos jobs, merge em três versões, undo entre aparelhos ou garantia de atendimento de critérios não medidos. Esses pontos não devem ser anunciados como entregues. Revisão e testes locais não equivalem a deploy ou aceite integral do Studio Pro.
