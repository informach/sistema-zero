# Zappy do Studio

O tutor é uma integração opcional e somente leitura do `StudioEditor`. O host injeta
`tutor: StudioTutorConfig`; `StudioLesson` deliberadamente não expõe essa propriedade.

O Studio entrega ao adapter apenas modo, tipo do projeto, árvore compacta de blocos,
extensões instaladas, bloco selecionado, último erro e, fora do modo Blocos, código textual
limitado. Assets, data URLs e binários são removidos. O host é responsável por sessão, quota,
persistência, provedor e autorização.

O botão da barra abre um diálogo lateral sem remontar Blockly ou Monaco. Referências validadas
podem centralizar uma instância existente ou abrir a categoria que contém o `blockType` exato;
o rótulo da categoria é apenas fallback exato. O tutor nunca altera o projeto.
Tentativas repetidas após falha reutilizam o mesmo `clientMessageId`, e o cooldown usa timeout
finito. Referências de aula com `courseSlug` viram chips somente quando o host fornece
`openLesson`; respostas históricas sem slug continuam legíveis, sem link quebrado.
O catálogo autoritativo é exportado em `@sistemazero/studio/server-catalog`, e os manuais oficiais
server-safe em `@sistemazero/studio/server-knowledge`.

## Limites operacionais

Cada página do histórico contém até 50 mensagens. O adapter recebe `nextCursor` e busca páginas
anteriores sob demanda. O painel exige confirmação antes de excluir a conversa.

Uma pergunta não determinística consulta primeiro a base didática e consome a cota imediatamente
antes da única chamada ao provedor. O cliente reutiliza `clientMessageId`; o servidor mantém um
lease de dois minutos e recupera reservas abandonadas quando ele vence.

O BFF remove dados pessoais antes de persistir ou enviar a pergunta. Regras locais recusam temas
impróprios e rejeitam respostas do modelo que contenham conteúdo inseguro, solicitação de dados
pessoais ou PII. O contexto, o bloco selecionado e os manuais usam o mesmo catálogo permitido pela
carreira.

## Deploy das migrations 0056–0059

Execute `0056_schema_history_baseline`, `0057_zappy_reliability_schema`,
`0058_zappy_reliability_backfill` e `0059_amused_retro_girl` nessa ordem. A baseline restaura a
continuidade dos snapshots depois das migrations 0050–0055 e não executa DDL. A migration de
schema adiciona colunas nullable, a chave estrangeira do bloco e o índice. A migration de backfill preenche o lease das perguntas
antigas, vincula as fontes existentes ao hash da revisão atual e remove fontes `block:*` sem bloco
autoritativo. A `0059` adiciona uma revisão física ao conteúdo do bloco e invalida fontes antigas
que não conseguiam provar a revisão usada na extração. Depois do deploy, execute **Sincronizar
base** no Admin para reconstruí-las em lotes revisionados. O backfill é idempotente e retomável.

O `ALTER TABLE` usa alterações de catálogo rápidas. A criação do índice e o backfill podem manter
locks breves nas tabelas do Zappy; rode o deploy durante o piloto e acompanhe a duração antes do
rollout geral. Para rollback, reverta primeiro a aplicação. As colunas nullable podem permanecer
sem afetar a versão anterior; remova índice, chave e colunas apenas em uma migration posterior.
