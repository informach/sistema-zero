# Áreas do projeto no Python

Status (22/11/2026): proposta aprovada por ela no canvas "Áreas do projeto no Python" e
implementada em lotes (plano de trabalho em `C:\Users\tocha\.claude\plans\frolicking-painting-fiddle.md`).
Substitui [`2026-11-08-python-project-areas.md`](2026-11-08-python-project-areas.md) (a área única
"Programa").

## A proposta aprovada

O editor de blocos do Python tinha uma área só, o "Programa", em que o arquivo inteiro aparecia
numa coluna. Agora ele tem as seis áreas do JavaScript, que no Python são **trechos do arquivo,
na ordem em que o Python o lê**:

| Área | Cor | Comentário no código |
|---|---|---|
| 📦 Bibliotecas | `#2348cf` | `# 📦 Bibliotecas` |
| 🎛️ Configurações | `#e63946` | `# 🎛️ Configurações` |
| 🧩 Meus moldes | `#6366f1` | `# 🧩 Meus moldes` |
| ⚙️ Ao iniciar | `#f97316` | `# ⚙️ Ao iniciar` |
| ⚡ Quando acontecer | `#eab308` | `# ⚡ Quando acontecer` |
| 🔁 Enquanto estiver rodando | `#14b8a6` | `# 🔁 Enquanto estiver rodando` |

- O código continua sendo a fonte da verdade. A área de cada linha vem do tipo da linha; o
  comentário é só para ler, e o Estúdio o escreve e o apaga sozinho.
- Regra do Python: cada área só usa o que está nas áreas de cima. O corpo de uma função usa
  tudo, porque só roda quando alguém a chama.
- No arraste, as cinco áreas especiais só aceitam os blocos delas; o ⚙️ Ao iniciar aceita
  qualquer um. Dentro de função, evento ou laço cabe qualquer comando.
- **Todo programa cabe.** Uma linha que não pode ir para a área dela sem mudar o programa fica
  no Ao iniciar (ou na área de uma linha anterior que não pode descer), com uma nota dizendo por
  quê e "Levar para <área>" no menu.
- 🎛️ = `guardar` com nome em MAIÚSCULAS e valor fixo, atribuído uma vez (e WIDTH/HEIGHT/TITLE do
  Pygame Zero). Lista, dicionário e conjunto de valores fixos também, se ficam iguais enquanto o
  jogo roda: Configurações são as constantes; a lista que o programa muda é variável e mora no ⚙️
  Ao iniciar (decisão dela, 22/11/2026). ⚡ = `on_*` do Pygame Zero e registros de tecla/clique do
  Turtle. 🔁 = `update`,
  `draw` e `clock.schedule_interval` do Pygame Zero, o bloco novo do Turtle "🔁 repetir … a
  cada … milissegundos", o laço da janela do Raylib e o `while` do jogo no Pygame-ce.
- O bloco que liga ou desliga o jogo (`pgzrun.go`, `mainloop`, `close_window`, `pygame.quit`) mora
  no fim da última área usada, e nada encaixa embaixo dele. Tudo o que vem depois do laço do jogo
  só roda quando a janela fecha, e fica preso como esse fim.
- Organizar: o código que veio de fora (abrir o projeto, Ponte, modo Código) se organiza no
  primeiro clique ou foco nos blocos, nunca enquanto a criança digita; "Organizar blocos" faz o
  mesmo a qualquer hora. Um passo só de desfazer.
- Projeto em branco começa sem área nenhuma; a paleta 🗂️ oferece as áreas que ela usa (o ⚙️
  sempre; 🎛️ com "guardar"; ⚡ só com Pygame Zero e Turtle). Uma área de cada tipo.

## O modelo: o que pode mudar de lugar (`packages/studio/src/python/blocks/areas.ts`)

`analyzePythonModuleAreas(módulo, codecIds, contexto)` classifica cada linha de topo (`pinned`,
`terminal` ou a área preferida) e calcula os efeitos dela. `pythonDisplayAreas` escolhe a área em
que cada linha aparece sem mexer no arquivo (programação dinâmica, nunca volta, custo 0 na área
dela, 1 no Ao iniciar, 3 noutra). `planPythonOrganize` dá a ordem mais arrumada que faz o MESMO
programa (Kahn com prioridade área, índice).

A regra de segurança (refeita depois da revisão de 22/11, achados M1 a M12):

- **Duas linhas com efeito nunca trocam de lugar.** Só troca de lugar a linha que só cria nomes
  e não pode dar erro: `def` sem decorador, classe com uma base que é classe com certeza, import
  de biblioteca conhecida (o `from x import nome` só quando o nome está na lista do módulo),
  configuração com valor que se calcula sem erro, atribuição de constante ou de nome que JÁ existe
  numa linha de cima.
- Configuração com lista, dicionário ou conjunto (`fixedValue`): criar um valor escrito no código
  não roda nada, então trocar de lugar é sempre seguro; o que decide a área é se ele fica igual.
  `changedInPlace` percorre o arquivo inteiro: método que muda (`append`, `update`…), item trocado
  ou apagado, e o valor (ou um pedaço dele que pode mudar) guardado noutro nome, devolvido ou
  entregue a uma função que não seja das que só leem (`len`, `print`, `random.choice`…) fazem dele
  variável. O `reach` do valor diz a quantos `[…]` há algo que muda (`MAPA[l][c]` num mapa de
  textos não entrega nada mutável; o `for` num dicionário entrega as chaves). Medido em 22/11: 98
  tabelas dos exemplos de Pygame Zero, Raylib e Pygame-ce e 24 do Turtle sobem; ficam 9, todas
  com valor que não é fixo ou com um pedaço entregue adiante (`self.golpes = MONSTROS[n]["golpes"]`).
- O registro de tecla/clique do Turtle e o `clock.schedule*` só guardam a função: trocam com o
  que não mexe nos registros (`clear*`, `reset*`, `bye`, `mainloop`, `on*`, `listen`…).
- Conflito de nomes: o que uma linha cria contra o que a outra lê ou cria. Uma chamada de função
  da criança soma o que o corpo ALCANÇADO lê e troca (grafo `f:`/`m:`/`c:` de quem chama quem; "não
  sei" para parâmetro, apelido de função e atributo que guarda função, e aí vale tudo).
- Barreira: laço de topo, chamada que prende ou encerra (também dentro de `if` e das funções
  alcançadas), `exec`/`eval`/`globals()`, nó desconhecido. `while True` com `break`, `return` ou
  `raise` termina e não é barreira.

Prova: `areas.differential.test.ts` roda cada programa no CPython na ordem original e na
organizada (os casos da revisão, mais programas sorteados com `AREAS_FUZZ_COUNT`/`AREAS_FUZZ_SEED`)
e exige a mesma saída e o mesmo erro; sabotagens do modelo reprovam. Exige Python 3.13+ (o
`analyzer.py` usa `ast.parse(..., optimize=0)`); o CI instala o 3.13.

## O código: comentários de área (`python/language/areaMarkers.ts`)

`planPythonAreaMarkers(documento, áreas)` mantém um comentário no começo de cada área com conteúdo
e tira os repetidos, os de áreas vazias e os do rodapé; insere o que falta acima dos comentários
colados à primeira linha da área, nunca acima de shebang ou da declaração de codificação (PEP 263,
linha 1 ou 2, `pythonModuleHeaderEnd`). Comentário de área = linha inteira, coluna 0, texto exato
(espaço no fim não conta). Quando um sai, a separação que sobraria no começo do arquivo ou grudada
em outra linha em branco sai junto. Só comentário da coluna 0 cola na primeira linha da área: um
comentário recuado que fecha uma função fica com ela. Numa linha com dois comandos (`A = 1; b = 2`)
não cabe comentário entre eles; se uma área começa no segundo, o comentário dela vai para a
próxima linha própria da área. Quando um comentário de área sai do meio de uma área com código
logo embaixo, a linha em branco de cima (a separação que ele trouxe) sai junto, a não ser que
outro comentário de área entre ali: trocar a primeira linha de uma área e desfazer não deixa
linha em branco a mais.

A transação visual (`visualTransaction.ts`) ganhou a fase 2: depois de aplicar e conferir o
gesto, acerta os comentários de área e confere de novo (comentários preservados, árvore igual). As
proteções de comentário só aceitam soltar um comentário de área. Mover uma linha para dentro de
uma função deixa o comentário de área no módulo (`statementTransfers.ts`). Uma linha nova de uma
área anterior entra no fim da área dela (`statementInsertions.ts`); antes da PRIMEIRA linha do
arquivo, ela entra logo acima do comentário de área dela (o título do arquivo fica no topo), com
uma linha em branco antes do comentário.

O planejador de movimento (`statementMoves.ts`) trata os comandos que dividem uma linha
(`A = 1; b = 2`) como uma peça só: eles andam juntos e na mesma ordem, e só esse planejador
desiste se o plano os separa (antes, uma linha assim reescrevia o arquivo inteiro). Um `;` sozinho
no fim (`x = 1;`) não prende a linha. Os comentários de uma linha que sai do programa ficam onde
estavam, antes da próxima linha que fica (antes iam para o topo, e o desfazer não os devolvia).

Prova com o analisador de verdade: `python/language/areas.transaction.test.ts` (codificação na
linha 2, ida para dentro de função, espaço no fim, organizar e desfazer, excluir a última área,
`;` no fim e linha com dois comandos, comentário de linha que vai para os rascunhos, primeira
linha trocada e de volta, linha nova embaixo do título).

## O editor

- `areaFrames.ts`: os seis blocos de área (`sz_py_area_<tipo>`, entrada `CHILDREN`), a exclusão
  segura do JavaScript (as linhas vão para Rascunhos e o desfazer devolve), o layout em duas
  fileiras e o empurrão da área que cresce (`pushOverlappingPythonAreas`, fora do desfazer).
  `isLegacyPythonRoots`: pilhas soltas só são o programa no modo antigo, com raízes que existem.
- `blockly.ts`: `pythonVisualToWorkspace(…, { areas })` monta uma corrente por área;
  `pythonWorkspaceToVisual` lê na ordem do arquivo; `pythonBlockStatement` lê um bloco sozinho.
- Persistência: o programa são as áreas com linhas; áreas vazias e blocos soltos são rascunho e
  sobrevivem à Ponte. Rascunho com área vazia repetida reabre com uma só; o rascunho da área
  "Programa" conta como ausente. O rascunho solto que não reabre não trava o arquivo e NÃO some:
  `preparePythonScratchRestoreKeeping` reabre bloco a bloco, e os que não reabrem ficam crus
  (`keptScratch`) e voltam em toda gravação (`capturePythonWorkspace(…, kept)`).
- `areaConnectionChecker.ts`: a regra do arraste (`doDragChecks` só no arraste).
- `areaGuards.ts`: área repetida vira rascunho (como no JavaScript). O fim do jogo (o primeiro
  bloco que liga ou desliga o jogo e a cauda dele, o que vinha depois sem mexer no gesto) vai para
  o fim da última área quando o gesto mexeu nele ou pôs uma LINHA depois dele; a pilha que caiu
  embaixo do fim volta para cima, e o resto que o Blockly religou embaixo dela fica com o fim.
  Mexer dentro de uma linha que já estava depois do fim não conta (o `def on_key_down` depois do
  `pgzrun.go()` de um programa aberto do código). Os eventos do organizar
  (`PYTHON_ORGANIZE_GROUPS`) não passam por essa guarda. "guardar" que entra em 🎛️ ganha
  MAIÚSCULAS (e ao terminar de digitar o nome lá dentro), só se o nome não aparece em outro bloco,
  nem já em MAIÚSCULAS (juntaria duas variáveis). Tudo no passo de desfazer do gesto; a carga e o
  desfazer não disparam as guardas.
- `areaOrganize.ts`: organizar (religa os blocos na ordem planejada, um passo de desfazer), as
  notas (aviso do Blockly com id `python-area`) e o item `sz_py_organize` ("Organizar blocos"; o
  `sz_organize` do JavaScript some no Python). `areaContextMenu.ts`: "Levar para", "Mover para
  Rascunhos", "Inserir no final de", sempre antes do bloco que liga o jogo.
- `programNavigation.ts`: o "Ir para" lista as áreas e, dentro delas, funções, classes e os blocos
  de evento e de laço; "Fechar as funções" fecha também esses blocos.
- `PythonBlocklyEditor.tsx`: liga tudo; o organizar fica pendente depois de cada carga vinda do
  código e roda no primeiro `pointerup`/`focusin` nos blocos, só para quem edita, nunca com um
  campo aberto (`WidgetDiv`/`DropDownDiv`). O pedido só é gasto quando organizou de fato
  (`organizeNow` devolve falso com o programa incompleto, `incomplete` no resultado).
- A linha que divide a linha do arquivo com outro comando ganha a nota `fixed` ("ponha cada
  comando na sua própria linha"); a linha segurada por ela ganha `fixedNeighbor` (é a do caminho
  que divide a linha, não ela).
- O "repetir a cada" do Turtle confere a tela no escopo da chamada `ontimer`, dentro da função
  (`bindingScopeNode` no contrato do codec): um `tela = …` local não passa pela tela de fora.

e2e: `e2e-python-editor/program-areas.spec.ts` e `workspace-layout.spec.ts` (no job
`python-browser-isolation` do `studio-mission.yml`). No Windows, o servidor de provas exige Bun 1.4.3;
o cliente do Playwright roda no Node.

## Os exemplos

1. `scripts/python/example-edit-fixtures.ts`: as edições de qualificação de cada recibo viram
   fixtures (`scripts/python/fixtures/<família>/<jogo>.edits.json`, `--check`), e
   `requalify-gallery.ts` passa a lê-las.
2. `scripts/python/organize-examples.ts`: organiza cada exemplo pelo caminho do editor (blocos da
   versão final, analisador no CPython 3.13+), com `--out <pasta>` para não mexer no repositório
   e o remapeamento das fixtures (posição nova pelo texto da linha, conferida contra a projeção).
   Medido em 22/11: 58 Pygame Zero, 17 Raylib e 69 arquivos de Pygame-ce organizam sem nenhuma
   linha fora da área.
3. Turtle (20 jogos): à mão. Abrir o `iniciar()` (preparo no Ao iniciar, teclas em Quando
   acontecer), trocar lambdas por funções com nome e o relógio `agendar`/`quadro` pelo bloco
   "repetir a cada" (`sz_py_turtle_every`, lote 5), ajustando os `test_model.py`.
4. Requalificar jogo a jogo com o motor novo, gerar (`gen:*`) e conferir (`check:*`). Os
   exemplos do repositório só mudam junto com os recibos novos, senão o `check:python-visual-examples`
   do CI reprova.

## O que falta (22/11/2026)

- Lotes 5 e 6 entraram em `d99a00d32` (bloco "repetir a cada", os 104 exemplos e os recibos);
  os achados do full review do modelo em `5ddcc8dca` e os do editor em `c0c2460c1`.
- Lote 8 preparado (só local, nada implantado): release `python-browser`/`2026-11-22-areas-1`,
  catálogo do Members `01c079c1…` e seletor de staging `1dd32fdc…`; roteiro da implantação em
  `docs/plans/evidencias/2026-11-22-python-areas-motor/`. Produção pede o baseline de produção.
- e2e por família (22/11): Ponte 50/50; `python-runtime` com as fixtures nas áreas
  (`2cb5cc170`), fora só o que exige o acervo externo licenciado (Pac-Man e Space Arena
  originais) e o REPL do `python-boot-reuse`, sem relação com as áreas; `pgzero` 63/63,
  `raylib` 26/26, `pygame` 22/22. ⚠️ Essas três configs NÃO sobem o servidor de provas: suba
  `bun experiments/studio-python-runtime/server.ts` antes, com `PYTHON_PROBE_PORT=5297` (a do
  `pygame` usa 5298 por padrão) e as variáveis `PYTHON_PROBE_DISTRIBUTION_*`; sem ele, todo teste
  reprova com `ERR_CONNECTION_REFUSED`.
- A suíte inteira `playwright.python-bridge.config.ts` (fora do CI) tem ~25 reprovações que parecem
  anteriores às áreas (o "Rodar" que não existe na fixture e campos cobertos pelo Monaco no painel
  estreito); os 20 jogos clássicos do Turtle reprovam até os exemplos serem convertidos.
