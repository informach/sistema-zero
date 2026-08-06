# CLAUDE.md — @sistemazero/pensa

> Consulte o Context7 antes de alterar bibliotecas ou frameworks.

O Pensa é o planejador de jogos para crianças de 8 a 13 anos. Ele organiza a criação; não monta o Estúdio, executa tarefas, publica jogos ou mantém kanban e checklist.

## Método ZERO

- **Z — Zerar a Bagunça:** ideia, objetivo, controles, vitória, derrota e escolha 2D/3D. Produz `idea`.
- **E — Enxergar o Jogo:** loop, cenas, telas e Bíblia Visual. Produz `game_design` e `visual_direction`.
- **R — Roteirizar a Criação:** Cartões de Criação pequenos, ordenados e destinados ao Pinta ou ao Estúdio. Produz `task_plan`.
- **O — Organizar a Criação:** auditoria da ordem, dependências, guias e catálogo oficial. Produz `plan_review`.
- **done — Meu plano:** mostra ordem, dependências, estado resumido e próxima tarefa. A execução ocorre na ferramenta de destino.

Cada versão do jogo tem um ciclo próprio. Uma versão nova pode ser planejada depois de O, sem depender da execução da anterior.

## Contrato público

`<PensaApp adapter={PensaHostAdapter}>` é o único componente público. O adapter contém:

- `transport.request` para `/api/pensa/*`;
- `transport.streamChat` para o chat SSE da etapa Z;
- `capabilities.pintaOwned` e `capabilities.studioOwned`;
- `onOpenTask({ taskId, destination })`, que navega para `/pinta?tarefa=<id>` ou `/estudio?tarefa=<id>`;
- tema e imagens opcionais do mascote.

O adapter não cria projetos do Estúdio, não sincroniza snapshots e não renderiza editores. O pacote não conhece router, IndexedDB ou `LessonActivity`.

## Cartão de Criação

Uma tarefa carrega destino, categoria, estimativa, posição global, dependências, guia e progresso. Os IDs de passos e critérios permanecem estáveis entre Pensa, Pinta e Estúdio.

- Contexto Pinta: `assetId` da Bíblia Visual, tipo de arte, estilo, preset, paleta, aparência, animações, estados, uso e exigência de envio ao Estúdio.
- Contexto Estúdio: dimensão, `visualAssetIds`, IDs e metadados oficiais de blocos, manuais e extensões.
- Progresso: `planned | in_progress | completed`, itens marcados, `outputRef` e datas.

O Pensa só reflete o progresso. O servidor calcula `nextTaskId` quando todas as dependências anteriores estão concluídas. Ferramenta não possuída bloqueia o botão de envio, mas preserva o plano.

## Sugestões do chat (etapa Z)

Toda resposta do Zappy termina com a linha `SUGESTÕES: a | b | c` (contrato do prompt no
member-shell). Ela NUNCA renderiza crua: `core/suggestions.ts` (`splitSuggestions`,
tolerante a caixa/acento, só a linha FINAL) separa corpo e sugestões, e
`stripStreamingSuggestions` esconde até o prefixo parcial durante o streaming. As sugestões da
ÚLTIMA resposta viram chips (`.pensa-suggestion-chips`, fieldset com legend invisível) que
PREENCHEM o campo e focam o textarea — decisão da usuária: a criança revisa e envia (trocar para
envio direto = chamar `sendText(s)` no clique). Os chips somem com stream em andamento.

## Rever etapa concluída (peek)

Nós CONCLUÍDOS do `CreationMap` são botões (`aria-pressed`; re-clicar fecha) que abrem o
`StagePeek`: leitura da etapa vencida via `GET /cycles/:id/stages/:stage` (o members serve
qualquer etapa), com banner "Você está revendo…" + voltar (o nó da etapa ATUAL também vira botão
de voltar enquanto o peek está aberto). Sem edição no peek: `ReadOnlyArtifact` embrulha o
`ArtifactPreview` (o `ArtifactEditor` NÃO serve — save/validate miram a etapa atual do ciclo);
etapa R usa `TaskPlan editable={false}` e o "Abrir no Pinta/Estúdio" PERMANECE (tarefas são do
ciclo). `loadProject`/refresh fecham o peek; corrida guardada por `peekRef`. Compartilhados:
`ChatTranscript` (Z vivo + peek), `screenNamesFrom`, `ReviewFindings`.

## Regras de edição

Antes da aprovação em O, artefatos e tarefas planejadas podem ser editados. Depois da aprovação, editar uma tarefa planejada reabre O e invalida a revisão. Editar uma tarefa iniciada ou concluída cria uma nova revisão e arquiva a anterior.

## Arquitetura e estilo

O componente usa estado React por instância e navegação interna lista ⇄ plano. O CSS vive em `src/styles/pensa.css`, sem regras globais. Preserve os temas claro/escuro, alvos de 44 px, navegação por teclado, foco visível e `prefers-reduced-motion`.

O host transpila o TS source e importa `@sistemazero/pensa/styles.css`. Não reintroduza chooser de ambiente, kanban, checklist, lançamento executável, `renderStudio`, `createStudioProject`, `syncStudioSnapshot` ou chaves locais de retomada/checks/intents.

**O Pensa é uma SEÇÃO da comunidade kids, não um app à parte (08/2026).** Os tokens `--pz-*` já
apontam para os primitivos `--sz-kids-*`; o que faltava era o resto da moldura:

- `.pensa-planner` tem fundo **CHAPADO** (`var(--pz-bg)`). O `radial-gradient` que existia era a
  textura de um app próprio e denunciava a emenda com a página, mesmo com a cor certa.
- A home segue o **padrão do Pinta** ("Meus desenhos", 08/2026): o herói de landing SAIU de vez
  (kicker "PLANEJADOR DE JOGOS", h1 de duas linhas e Zappy grande absoluto) e entrou o
  `.pensa-home-header` — h1 **"Meus projetos"** (1.875rem) + subtítulo do método ZERO à esquerda,
  Zappy PEQUENO decorativo à direita (64px; 48px no `@container 560`). O teste do PensaApp trava o
  título e a ausência do kicker.
- **Largura TOTAL** como a galeria do Pinta: `width: calc(100% - 32px)` (sem o teto de 1160px) na
  regra compartilhada — vale para home E detalhe (`.pensa-workspace`/`.pensa-project-header`/
  `.pensa-map`/`.pensa-alert`).
- Cards (`.pensa-project-card`, `.pensa-panel`/`-artifact`/`-audit`/`-ribbon`, `.pensa-task > article`)
  usam a geometria do `.kids-card`: borda **2px** + raio **1.5rem**. O `.pensa-create` virou um
  painel dessa mesma família (borda 2px, raio 1.5rem, sombra dura tingida pelo acento), os inputs
  do grupo compartilhado têm borda **2px** (vale também no detalhe — receita de tema) e
  `.pensa-empty`/`.pensa-status` são 2px dashed.
- O host não embrulha mais o app num card (`pensa-client.tsx`).
⚠️ Mexer na largura interna (`width: calc(100% - 32px)`) desloca os `@container (max-width: 820px|560px)`
— re-verifique os dois pontos de quebra em 1366 e 1920.

## Verificação

Execute `bun run typecheck`, `bun test src` e `bun run check`. Os testes devem cobrir o mapa ZERO, os cinco artefatos, ordem/dependências, próxima tarefa, entitlement e abertura da ferramenta de destino.
