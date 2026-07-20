# Áreas de comportamento e ciclo de vida do Estúdio

Status: implementado em 20 de julho de 2026. Este documento registra a decisão
arquitetural. A seção “Problema” descreve o estado anterior à implementação.

> **Atualização de UX em 20 de julho de 2026:** a marcação persistente continua
> no próprio bloco de rascunho, mas o painel global com contagem e botão de foco
> foi removido por ocupar a área de trabalho. A decisão atual está em
> `2026-07-20-studio-drafts-game-font-design.md`.

## Problema

O Estúdio separa HTML, CSS e JavaScript em três molduras. Todo comportamento,
porém, ocupa uma única área `Comportamento: JS`. Essa estrutura mistura preparação,
eventos e repetição contínua, dificulta a leitura dos cursos e permite encaixes
semanticamente inválidos.

O problema atravessa todo o pipeline:

| Parte | Estado anterior | Consequência |
| --- | --- | --- |
| Blockly | Um `sz_frame_behavior` aceita qualquer `JSStmt` | Eventos, loops e comandos se misturam |
| IR | `SZIR.js` é um único array | Parser e gerador precisam inferir o ciclo de vida |
| Extensões | Blocos usam quase sempre `JSStmt` | Cada motor cria regras próprias |
| Runtime | Cinco motores possuem schedulers e reinícios diferentes | Pausa, erro e nova partida divergem |
| Migração | Encontrar qualquer frame encerra a normalização | Projetos parcialmente migrados permanecem incoerentes |
| Interface | Duplicatas são aceitas e rascunhos não recebem aviso | A criança não entende o que executa |

O catálogo real contém 67 exemplos: 14 de Jogo 2D, 19 de Jogo 2D Avançado,
8 de Jogo 3D, 6 de Jogo 3D Avançado, 12 de Mundo 3D e 8 exemplos do núcleo.
Naquele momento, todos ainda usavam `ir.js` e ciclos de vida antigos.

## Objetivos

- Dividir comportamento em três áreas opcionais e semanticamente tipadas.
- Executar `Ao iniciar` em toda nova partida.
- Registrar eventos e loops antes de iniciar automaticamente o motor.
- Compartilhar o mesmo escopo léxico entre as três áreas.
- Aplicar as mesmas regras ao núcleo e a todas as extensões oficiais.
- Migrar projetos antigos sem perder blocos nem mudar comportamento representável.
- Preservar blocos soltos como rascunhos com aviso no próprio bloco.
- Manter projetos novos sem áreas predefinidas.
- Preservar a API pública de `@sistemazero/studio` e o gate privilegiado da galeria.

## Fora de escopo

- Reduzir ou reorganizar progressivamente a quantidade de blocos nas aulas.
- Criar fases, narrativas, mapas ou assets que a criança não definiu.
- Alterar o modelo público de extensões ou abrir um marketplace.
- Manter os blocos antigos de início manual disponíveis para projetos novos.

## Decisão arquitetural

O Estúdio adota uma gramática universal de ciclo de vida. Uma divisão apenas
visual manteria o IR e os runtimes ambíguos. A gramática é única para cursos,
Bridge e geração; cada motor declara sua integração concreta por meio de
`RuntimeLifecycleContract`.

```text
Workspace Blockly
  ├─ 🧱 HTML
  ├─ 🎨 CSS
  ├─ ⚙️ Ao iniciar
  ├─ ⚡ Quando acontecer
  └─ 🔁 Enquanto estiver rodando
             │
             ▼
      IR de comportamento
  start + events + loops
             │
             ▼
     fábrica do projeto
             │
      ┌──────┴────────┐
      ▼               ▼
 recursos web    contrato do motor
      │               │
      └──────┬────────┘
             ▼
   boot + reinício + descarte
```

## Áreas do projeto

As cinco molduras serão:

| Tipo Blockly | Rótulo | Conexão interna |
| --- | --- | --- |
| `sz_frame_structure` | 🧱 HTML | `HTMLNode` |
| `sz_frame_appearance` | 🎨 CSS | `CSSEntry` |
| `sz_frame_start` | ⚙️ Ao iniciar | `JSStartRoot` |
| `sz_frame_events` | ⚡ Quando acontecer | `JSEventRoot` |
| `sz_frame_loops` | 🔁 Enquanto estiver rodando | `JSLoopRoot` |

`sz_frame_behavior` continuará registrado como entrada legada oculta. O migrador
o consumirá, mas nenhum projeto novo nem reconstrução voltará a emiti-lo.

Cada área é opcional e única. O projeto novo continua com `blocksState` vazio.
Se a área já existir, a caixa de ferramentas passa a focalizá-la em vez de criar
uma cópia. Importação, colagem e desfazer também respeitam essa unicidade.

## Contrato de posicionamento

O núcleo manterá um registro canônico que reúne blocos nativos e blocos das
extensões oficiais. Todo bloco executável declarará seu posicionamento.

```ts
export type BehaviorArea = 'start' | 'events' | 'loops'

export type StatementContext =
  | 'statement'
  | 'event-body'
  | 'loop-body'
  | 'function-body'
  | 'class-member'
  | 'draw-world'
  | 'draw-hud'
  | 'map-draw'
  | 'map-enter'

export interface BlockPlacement {
  root: readonly BehaviorArea[]
  nested: readonly StatementContext[]
  role: 'declaration' | 'command' | 'event' | 'loop' | 'value'
  phase?: 'update' | 'periodic' | 'draw-world' | 'draw-hud'
}
```

O contrato também guarda a regra de migração e, quando o bloco registra um
recurso, sua relação com o ciclo de vida. `BlockDefinition` deixa de ser apenas
JSON livre e passa a exigir esse metadado para blocos executáveis.

As declarações alimentam diretamente quatro consumidores:

1. conexões físicas do Blockly;
2. organização da caixa de ferramentas;
3. migração de projetos antigos;
4. reconstrução e compilação do ciclo de vida.

O schema da IR repete a gramática com tipos de nós para proteger código e projetos
importados. Um teste atravessa definição, Blockly, IR e área para impedir que essa
validação fique diferente do catálogo. A caixa de ferramentas não possui uma lista
classificadora paralela. Sua lista de eventos serve apenas para ordenar os blocos.
Um teste de contrato falha se um bloco oficial não declarar posicionamento ou se
dois tipos se contradisserem.

### Gramática

- `Ao iniciar` recebe definições, configurações e comandos iniciais.
- `Eventos` recebe somente chapéus que representam ocorrências reais.
- `Loops` recebe somente raízes contínuas ou periódicas.
- Corpos de eventos e loops recebem comandos `JSStmt` compatíveis com o contexto.
- Eventos e loops não podem ser aninhados uns nos outros.
- Restrições especializadas continuam tipadas: desenho de mapa, mundo, HUD,
  função, classe, construtor e métodos de evento.
- O Blockly recusa a conexão errada; o schema repete a validação para código e
  projetos importados.

## IR e Bridge

O novo IR possui versão explícita e uma única representação de comportamento:

```ts
export interface BehaviorIR {
  start: JSStatement[]
  events: JSStatement[]
  loops: JSStatement[]
}

export interface SZIR {
  version: 2
  html: HTMLNode[]
  css: CSSEntry[]
  behavior: BehaviorIR
  extensions: ExtensionUsage[]
  htmlShell?: HTMLShell
}
```

`js` pertence apenas ao schema de entrada legado. A normalização o converte para
`behavior`; o restante do sistema trabalha somente com a versão 2. Não haverá
duas fontes verdadeiras dentro do projeto.

O JavaScript gerado contém marcadores estáveis:

```js
// Ao iniciar
// Quando acontecer
// Enquanto estiver rodando
```

O parser usa esses marcadores para reconstruir as áreas sem heurística. Para
código antigo sem marcadores, ele consulta o registro semântico. Código livre ou
ambíguo permanece em `Ao iniciar` como código avançado, com diagnóstico quando a
conversão específica for impossível.

As três seções formam uma única fábrica léxica. Assim, eventos e loops fecham
sobre variáveis e funções declaradas em `Ao iniciar`. O gerador remove o hoist
global ad hoc de animações e preserva source maps por bloco nas três seções.

## Execução de uma partida

Cada execução segue esta ordem:

```text
criar escopo limpo
→ executar Ao iniciar
→ registrar Eventos
→ registrar Loops
→ iniciar o motor
```

Nos runtimes que repetem a factory em memória, a execução associa à partida os
listeners DOM e RAFs genéricos emitidos pelo gerador. Reiniciar descarta esses
recursos antes de executar a factory novamente; o motor continua responsável
por limpar áudio, colisões, controles e tarefas próprios. Nos demais targets, o
descarte acontece junto com o documento do preview ou pelo método declarado no
contrato do motor.

Extensões oficiais recebem um contrato interno declarativo de ciclo de vida:

```ts
export interface RuntimeLifecycleContract {
  target: ProjectLifecycleTarget
  globalName?: string
  runMethod?: string
  managedProjectRun?: boolean
  bootMethod?: string
  restartMethod?: string
  pauseMethod?: string
  resumeMethod?: string
  disposeMethod?: string
}
```

`managedProjectRun` é usado por Jogo 2D e Jogo 2D Avançado, cujas factories
podem rodar novamente sem recriar o iframe. Nesses dois targets,
`ProjectRunContext` oferece sinal de cancelamento, registro LIFO de recursos e
pedido de nova partida. A API permanece interna ao Estúdio.

### Agendamento e descarte

Cada motor conserva seu scheduler de domínio, inclusive a cadência, a pausa e a
ordem de desenho. Um bloco genérico de animação continua usando
`requestAnimationFrame`; em targets com `managedProjectRun`, o gerador registra
o handle no contexto para cancelá-lo no reinício. Listeners DOM genéricos usam o
`AbortSignal` da mesma execução.

A ordem de cada quadro é:

```text
entrada
→ lógica contínua e repetições vencidas
→ física e colisões
→ eventos produzidos no quadro
→ desenho do mundo
→ desenho do HUD
→ exibição
```

Blocos da mesma fase executam de cima para baixo. Fases diferentes preservam a
ordem semântica mesmo quando aparecem em outra posição visual.

`A cada N quadros` dispara após N quadros ativos. `A cada N segundos` dispara
após N segundos ativos. Pausa congela ambos; nova partida zera os contadores.

Páginas sem motor executam `Ao iniciar` uma vez por abertura; eventos DOM e RAFs
seguem o ciclo de vida do documento do preview.

## Classificação semântica

| Conceito antigo | Destino |
| --- | --- |
| `Quando o jogo começar` e `Quando a página carregar` | conteúdo em `Ao iniciar` |
| `Começar o jogo`, `Começar o passeio` e equivalentes | removidos após migração |
| Clique, tecla, entrada de mapa, morte, fim de timer | `Eventos` |
| Contato iniciado | evento edge-triggered |
| `A cada quadro` | loop de atualização |
| `A cada N quadros` e `A cada N segundos` | raízes periódicas independentes |
| Desenho do mundo | fase `draw-world` |
| Desenho da tela/HUD | fase `draw-hud` |
| Varredura de sobreposição atual | loop contínuo, nunca bloco “Quando” |
| Consulta “A está encostando em B?” | valor booleano |

Funções, classes, variáveis e configurações ficam em `Ao iniciar`; chamadas e
comandos podem aparecer em corpos compatíveis. Métodos como `preventDefault`
exigem um corpo de evento. `return`, `super`, `break` e `continue` recebem as
travas de contexto que hoje faltam.

## Mapas

A arquitetura preserva a separação já aprovada para Jogo 2D Avançado:

- `Criar mapa` fica em `Ao iniciar` e declara dimensões e desenho escolhido pela
  criança;
- `Começar o jogo no mapa` configura o mapa inicial em `Ao iniciar`;
- `Quando entrar no mapa` fica em `Eventos` e contém apenas comportamento;
- transições e portas referenciam mapas declarados.

O runtime nunca inventa grade, chão ou cenário. Referência inválida produz um
diagnóstico preso ao bloco. Se um projeto legado tinha apenas um nome, a
migração conserva o comportamento, mas pede a criação do mapa.

## Reinício e erros

Nos targets que reiniciam a factory em memória, reiniciar executa esta sequência:

1. o runtime solicita outra execução da factory;
2. `ProjectRunContext.begin` descarta o escopo anterior;
3. o `AbortController` remove listeners DOM e os disposers cancelam RAFs;
4. a factory cria o novo contexto e registra início, eventos e loops;
5. o método de reinício do motor limpa e reinicia os recursos do seu domínio.

Se um callback falhar, o Estúdio pausa a execução, mostra o bloco culpado e
mantém os demais dados inspecionáveis. Reiniciar depois da falha começa limpo.
Assim, reinícios de Jogo 2D e Jogo 2D Avançado não acumulam listeners DOM ou
RAFs genéricos; hooks e loops próprios continuam sob o descarte do motor.

## Migração

A migração recebe versão própria e roda em memória ao abrir o projeto. O próximo
salvamento normal persiste a versão 2. Ela é idempotente.

O migrador:

1. aplica migrações atuais de campos, shadows e `if/else`;
2. lê projetos planos, parcialmente framados ou com `sz_frame_behavior`;
3. consulta o contrato de cada bloco;
4. desembrulha raízes antigas de início;
5. move eventos e loops para suas áreas;
6. remove boots manuais sem efeito adicional;
7. preserva ordem, IDs, campos, assets e extensões;
8. emite somente as áreas necessárias.

Repetições periódicas diretamente dentro de `A cada quadro` tornam-se raízes
independentes. Uma estrutura antiga cujo controle de fluxo mudaria ao ser movido
usa um nó de compatibilidade versionado e oculto da caixa de ferramentas. Esse
nó preserva a árvore e a semântica antigas; projetos novos nunca o produzem.

Se houver frames duplicados, o migrador preserva como executável apenas o frame
que o sistema antigo executava. Os demais tornam-se rascunhos identificados.
Uma migração jamais apaga silenciosamente um bloco.

Os 67 exemplos oficiais serão reescritos na versão 2. Eles não dependerão do
migrador durante cada abertura.

## Interface

`Áreas do projeto` permanece sempre visível e oferece as cinco molduras. Perfis
de aula continuam controlando somente os blocos de conteúdo.

Cada moldura explica quando roda:

- `Ao iniciar`: “Roda ao abrir ou a cada nova partida.”
- `Quando acontecer`: “Roda quando alguma coisa acontece.”
- `Enquanto estiver rodando`: “Repete enquanto o projeto estiver rodando.”

O organizador usa duas linhas:

```text
🧱 HTML          🎨 CSS

⚙️ Ao iniciar    ⚡ Eventos    🔁 Loops
```

Ele posiciona somente áreas existentes e põe rascunhos abaixo da categoria
correspondente. Em telas estreitas, o workspace ajusta o zoom e mantém navegação
horizontal.

Excluir uma área solta seu conteúdo como rascunho e permite desfazer. Colar um
bloco incompatível também o preserva como rascunho.

Todo statement solto recebe contorno e aviso persistentes no próprio bloco:

> Este bloco é um rascunho. Coloque em uma Área do projeto para ele funcionar.

Não há painel global de rascunhos sobre o workspace. O preview avisa que esses
blocos não foram executados. Valores soltos usados para experimentação não contam
como erro.

## Arquivos e responsabilidades

| Área | Arquivos principais | Mudança |
| --- | --- | --- |
| Contratos | `blockly/blocks/types.ts`, novo `blockly/blockContracts.ts`, `extensions/types.ts` | placement, migração e lifecycle tipados |
| Frames | `blockly/blocks/frames.ts`, `blockly/toolbox.ts`, `blockly/setup.ts` | cinco áreas, unicidade e foco |
| IR | `ir/schema.ts`, `ir/helpers.ts` | versão 2 e `behavior` |
| Blockly → IR | `blockly/buildIR.ts`, `blockly/semanticDiagnostics.ts` | três seções e rascunhos |
| IR → Blockly | `blockly/workspaceState.ts` | áreas opcionais e conexões tipadas |
| Migração | `blockly/normalizeFrames.ts`, sanitizers de estado | classificação estrutural idempotente |
| Bridge | `parsers/js.ts`, `parsers/project.ts`, `generators/js.ts`, `generators/project.ts`, `generators/sourceMap.ts` | marcadores, fábrica e round-trip |
| Preview | novo módulo de lifecycle, `preview/*`, `components/preview/*` | contexto, recursos, restart e erro |
| Motores | `official-extensions/*/blocks.ts`, `runtime.ts`, `index.ts` | contratos de lifecycle e classificação completa |
| Exemplos | `examples/core.ts`, `official-extensions/*/examples.ts` | IR versão 2 sem boots antigos |
| UI | `components/blocks/BlocklyPanel.tsx`, estilos e mensagens | rascunhos, foco e duas linhas |

## Compatibilidade pública

`@sistemazero/studio` mantém seus exports públicos. `ExtensionExample`,
`CoreExample`, `SZIR`, placement e lifecycle são contratos internos do pacote.
Projetos já copiados recebem a migração; projetos da galeria nascem diretamente
no formato novo. `showExamples` e o gate de perfil privilegiado não mudam.

## Testes e aceite

### Contratos

- Auditar todos os blocos core e todos os blocos das cinco extensões.
- Falhar por placement, migração, fase ou ownership ausente.
- Provar que a toolbox, o schema e o compilador consultam o mesmo registro.

### Migração e Bridge

- Cobrir projetos planos, parcialmente framados, duplicados e com código livre.
- Cobrir início antigo, `on_load`, boots manuais e loops periódicos aninhados.
- Provar preservação de blocos, ordem, IDs e idempotência.
- Fazer round-trip com marcadores sem warnings inesperados.
- Preservar nomes livres de cenas no Blockly.

### Runtime

- Provar escopo compartilhado e novo escopo no restart.
- Provar um listener e um RAF genéricos ativos após reinício da factory.
- Provar pausa e reinício nos schedulers de domínio dos motores.
- Provar ordem de fases, contato iniciado e sobreposição contínua.
- Provar limpeza após exceção e descarte.

### Exemplos e Chromium

A guarda compara automaticamente o catálogo real aos contratos de QA. Para cada
cartão, o teste usa `buildProjectFromKitEntry`, valida schema, IR, assets,
extensões, workspace e round-trip, abre o preview, executa a promessa e reinicia.

Jogos percorrem conclusão e nova partida. Demonstrações exercitam a técnica.
Explorações exercitam todas as interações anunciadas. Vila do Dragão cobre vila,
ferreiro, chave, porta, caverna, batalha, vitória e novo jogo.

O E2E cobre workspace vazio, criação e unicidade das áreas, duas linhas,
rascunhos, exclusão segura, conexão recusada, layout estreito e navegação por
teclado.

O aceite final exige testes do pacote, typecheck, Biome, build e E2E Chromium sem
tela vazia, exceção ou warning inesperado. Diagnósticos são aceitos somente em
fixtures deliberadamente inválidos.

## Ordem de implementação

1. Criar o contrato central de blocos e a guarda de cobertura.
2. Introduzir o IR versão 2 e a normalização legada.
3. Criar os três frames de comportamento, unicidade, áreas opcionais e layout.
4. Atualizar Blockly → IR, IR → Blockly, diagnósticos e rascunhos.
5. Atualizar gerador, parser, marcadores, source maps e Bridge.
6. Criar o contrato de execução e o escopo descartável para factories reiniciáveis.
7. Adaptar Jogo 2D e validar restart, pausa, timers e colisões.
8. Adaptar Jogo 2D Avançado, inclusive mapas e Vila do Dragão.
9. Adaptar Jogo 3D, Jogo 3D Avançado e Mundo 3D.
10. Migrar os 67 exemplos e atualizar contratos de QA.
11. Concluir UI, acessibilidade e E2E.
12. Executar a verificação completa e publicar o relatório final.
