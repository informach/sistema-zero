# Zappy do Studio

O Zappy é uma integração opcional do `StudioEditor`. Conversar e Investigar são somente leitura; no Pro, Construir prepara uma proposta que só altera arquivos após aplicação explícita. O host injeta
`tutor: StudioTutorConfig`; `StudioLesson` deliberadamente não expõe essa propriedade.

O Studio entrega ao adapter apenas modo, tipo do projeto, árvore compacta de blocos,
extensões instaladas, bloco selecionado e último erro. Projetos clássicos, inclusive a Ponte, não enviam código ao tutor. Projetos Pro enviam trechos limitados, seleção, diagnósticos e decisões confirmadas. Assets, data URLs e binários são removidos. O host é responsável por sessão, quota,
persistência, provedor e autorização.

O botão da barra abre um diálogo lateral sem remontar Blockly ou Monaco. Referências validadas
podem centralizar uma instância existente ou abrir a categoria que contém o `blockType` exato;
o rótulo da categoria é apenas fallback exato. Conversar e Investigar nunca alteram o projeto. Construir usa revisão-base, proposta, validação e aplicação explícita, com possibilidade de desfazer.
Tentativas repetidas após falha reutilizam o mesmo `clientMessageId`, e o cooldown usa timeout
finito. Referências de aula com `courseSlug` viram chips somente quando o host fornece
`openLesson`; respostas históricas sem slug continuam legíveis, sem link quebrado.
O catálogo autoritativo é exportado em `@sistemazero/studio/server-catalog`, e os manuais oficiais
server-safe em `@sistemazero/studio/server-knowledge`.

## Fronteiras e integração

- **Pensa** organiza a ideia, as missões e os critérios. É o Zappy no contexto do plano; não executa o construtor do Estúdio.
- **Zappy no Estúdio clássico** orienta usando os blocos conquistados. A Ponte pertence ao clássico.
- **Zappy Pro** usa código e as notas confirmadas do projeto em Conversar, Investigar e Construir. Pro é a experiência do produto; `kind: pro` e `mode: code` são campos internos distintos, não três produtos.
- Há uma única entrada de assistência por editor. Comandos antigos de IA redirecionam ao tutor autorizado pelo host. Os contratos públicos de provider continuam por compatibilidade; não constituem um segundo painel ativo.

Os hosts Kids clássico e Pro compartilham os serviços de publicação, voz, saldo e atividade. Permissões continuam no servidor. O saldo é da conta/família, compartilhado entre Pensa e Estúdio; quando o responsável escolhe OpenRouter, essa fonte vale para o Estúdio e o Pensa continua na franquia da plataforma. O painel relê o saldo ao abrir e depois das operações do construtor. Leituras atrasadas de outro perfil/projeto são descartadas.

## Pensa no modo Pro

A jornada lê `studioAuthoring` da criação confirmada de quem programa; não do modo declarado pelo navegador. Novos guias guardam `context.authoring` e recebem instruções de arquivos quando o jogo é Pro. O planejador Pro não exige blocos nem injeta passos para instalar extensões da paleta.

Após converter um plano existente, o guia apresenta orientação de transição para os arquivos e conserva o objetivo e os critérios originais. Esses passos de orientação não são progresso persistido. A narração do guia em blocos fica desativada nessa transição. Planos antigos com checklist obrigatório ainda exigem a conferência explícita do resultado equivalente; nenhuma etapa é marcada automaticamente. Guias novos de código podem usar a narração normal. Os atalhos do plano e da próxima missão abrem diretamente a rota Pro quando a criação confirmada já é de código. Entrada e saída dessa rota usam navegação completa para respeitar COOP/COEP. O retorno do editor Pro conserva o plano de origem e a conclusão v2 exige a revisão salva na nuvem.

## Limites operacionais

Cada página do histórico contém até 50 mensagens. O adapter recebe `nextCursor` e busca páginas
anteriores sob demanda. O painel exige confirmação antes de excluir a conversa.

Uma pergunta não determinística consulta primeiro a base didática e consome a cota imediatamente
antes da única chamada ao provedor. O cliente reutiliza `clientMessageId`; o servidor mantém um
lease de dois minutos e recupera reservas abandonadas quando ele vence.

O BFF remove dados pessoais antes de persistir ou enviar a pergunta. Regras locais recusam temas
impróprios e rejeitam respostas do modelo que contenham conteúdo inseguro, solicitação de dados
pessoais ou PII. O contexto, o bloco selecionado e os manuais usam o mesmo catálogo permitido pela
jornada.

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
