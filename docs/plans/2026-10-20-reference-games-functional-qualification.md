# Jogos de referência: qualificação funcional adicional

Escopo desta frente: [Pac-Man P01–P16](2026-10-16-pacman-aceite.md) e
[Space Arena S01–S10](2026-10-16-space-arena-aceite.md). O aceite integral permanece
aberto. Os casos abaixo acrescentam instrumentação de QA; não alteram o adapter,
as fontes do runtime, os jogos originais, a variante portátil ou suas mídias.

## Space Arena Q02–Q07

O runner `experiments/studio-python-runtime/qualification/space_arena_native.py`
consome o export canônico externo `space-arena-canonical-r2` sem modificar o cache
do coordenador. Confere o recibo SHA `df6d6812ac511686e5dd32187b900cc68c9b565d5d49498e5d3265e9b137fcc0`,
o ZIP SHA `55a893f0a982d37f2ca87b5af6f0f7614d93516722d3f9c880f3409d253609df`
e os 42 arquivos, inclusive a fonte portátil 1.1.0 SHA
`9db951e68bd4ce10f3739368d806d2a8a15db3535d9d543f21ddd5f2bd2f38a5`.
O código GPL e as mídias externas ficam exclusivamente em cache ignorado.

`space_arena_observer.py` observa o namespace da execução original por um wrapper
de `TurtleScreen.update`. Cada wrapper delega uma vez ao método original, incluindo
desenho, clear, radar, colisão e som. As injeções são registradas individualmente;
não se substitui o loop do jogo. Todos os 25 inimigos, 30 mísseis, 20 estrelas,
cinco powerups e 30/20 partículas permanecem. O pickup original acrescenta o 31º
míssil e a identidade dos 30 anteriores é conferida.

| Caso | Oráculo preparado | Alcance e limitações |
|---|---|---|
| Q02 | Left/Right press e release, Up duas vezes e release, movimento/inércia, três tiros e recoil sequencial, thruster e missile_fire | Chamada QA dos callbacks registrados; não comprova teclado físico, foco ou repetição do SO |
| Q03 | Quatro limites ±790/±590, distância 18 exata versus interior, dano, troca de momento, saúde não positiva em um frame e reset no seguinte, GAME OVER seguido de outro frame | Posições, saúde e uma vida declaradamente injetadas; não é partida perdida completa nem fechamento natural |
| Q04 | Distância 13 exata versus interior, dano 5, transferência de momento, score +10, reset/fuel do míssil, explosão | Um inimigo e um míssil existentes são posicionados; demais pools preservados |
| Q05 | Pickup +31º míssil, upgrades 1,1/1,05/1,1, penalidade −50 e duas chamadas autorais de explosão | Dois powerups existentes são posicionados; não deduplicar o áudio original |
| Q06 | Hunter/mine/surveillance dentro e exatamente no raio 100, câmera delta/8, C/c, posições/forma/cor dos carimbos reais do radar | Fixtures de tipo e posição; raster, tipografia detalhada e aparência final ainda exigem inspeção gráfica |
| Q07 | Emissores originais, 30/20 partículas, cores/offsets, damping 0,85, lifetime 10–20, inatividade e clear dos carimbos | Disparo explícito dos emissores; não é medição de frame rate ou endurance |

O encerramento ocorre por uma exceção exclusiva da QA **depois** do `pen.clear()`
original do último frame observado. A evidência distingue essa fronteira do
fechamento natural do jogo. A janela Tk oficial é ocultada antes do primeiro
setup/pump com a técnica delegada já revisada no Q01. Cada execução exige Map=0,
Destroy=1, áudio liberado, árvore exportada inalterada e temporário ausente.

O orçamento cooperativo é 30 s, incluindo o splash original; o supervisor externo
tem 40 s. Um deadline/sinal produz resultado negativo. Nenhum timer, pool ou
animação do jogo é acelerado. Outputs usam criação exclusiva: uma tentativa não
pode sobrescrever outra. As fontes do runner/observer e a versão real do Node
acompanham os recibos.

Exemplo PowerShell, somente após combinar a janela com o coordenador:

```powershell
node experiments/studio-python-runtime/qualification/run_space_arena_native.mjs `
  C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-native-env-r1/Scripts/python.exe `
  C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/space-arena-canonical-r2 `
  .cache/studio-python-l0/games-functional-r1/Q02-r1 Q02
```

Executar um caso por vez e inspecionar resultado/cleanup antes do próximo. Uma
falha deve manter seu diretório; a repetição recebe outro ID e registra a causa.
Não executar séries concorrentes com o gate pedagógico, browser, Docker ou TSC.

## Verificação leve realizada nesta preparação

- Preflight do ZIP: 42 hashes/tamanhos conferidos e 23 módulos Python compilados.
- Parse dos dois novos arquivos Python e sintaxe Node do supervisor.
- Três testes reais de processo do supervisor: executável ausente, preservação de
  tentativa anterior e cenário inválido. Nenhum abre Tk ou toca mídia.
- Onze exemplos numéricos sobre as definições de classe extraídas da fonte exata:
  quatro bordas, seis fronteiras de IA e câmera. Esse preflight não executa o loop,
  o renderer ou áudio e não é prova funcional do jogo.
- Novo venv próprio com CPython 3.14.2 e instalação do pacote exato exportado;
  miniaudio 1.71, cffi 2.1.1, pycparser 3.11 e sete arquivos do módulo conferidos.
  Wheels foram reaproveitados do cache do pip. Não é instalação em máquina limpa;
  cada caso reutiliza esse venv e confere seus bytes/dependências novamente.

Recibos novos: `.cache/studio-python-l0/games-functional-r1/` no worktree de jogos.
O executável do venv temporário histórico ficou indisponível durante a preparação;
nenhuma evidência anterior foi alterada e a dependência foi comunicada ao coordenador.

Comandos leves reproduzíveis:

```powershell
node --test experiments/studio-python-runtime/qualification/space_arena_supervisor.test.mjs
node --check experiments/studio-python-runtime/qualification/run_space_arena_native.mjs
git diff --check
```

**Estado do primeiro lote de preparação:** instrumentação e preflight leve, sem
execução de Q02–Q07 naquela etapa. A janela nativa posterior está registrada
abaixo. Q08 música por 120 s/pausa, Q09 Pro/publicação e
Q10 partida de dez minutos/30 reinícios permanecem em janelas próprias. Pac-Man
continua com as pendências documentadas na matriz P01–P16, inclusive geometria/IA,
input detalhado, fluxos de produto e desempenho. As provas históricas não qualificam
automaticamente a composição final do runtime.

## Pac-Man: geometria e IA preparadas

O novo `pacman_functional_observer.py` acrescenta os cenários `geometry` e `ai`
à preparação canônica existente. Os seis cenários anteriores conservam o mesmo
observer e a mesma configuração de fonte; dez testes de preparação conferem essa
preservação, o clone independente e a recusa de sobrescrita/seed inválida.

- `geometry`: 32 casos no loop real, para jogador e primeiro inimigo: quatro
  faces, oito correções de alinhamento e quatro passagens de borda por ator.
  As fixtures derivam do labirinto original. Evitam especiais que alterariam a
  velocidade antes do teste; não removem especiais ou mudam velocidade/timers.
- `ai`: dez casos: perseguição nas quatro direções, distância 149/150/151 para
  o radar 150, alinhamento dentro/exatamente na borda de meia célula e escolha
  aleatória de vizinho válido. A seed é fixada uma vez; não se procura uma seed
  conveniente. A posição do jogador foi conferida numericamente contra o método
  de paredes original, com o heading 90 explicitamente declarado.
- O observer registra before/after dos métodos originais dentro do loop completo.
  A passagem de borda é conferida no resultado de `move`, antes da correção de
  paredes subsequente; ambos os resultados ficam no recibo, evitando confundir
  duas fases do algoritmo. Uma direção aleatória válida não é prova estatística
  de todas as escolhas possíveis.
- Os sete inimigos permanecem visíveis/presentes; participantes não envolvidos
  são posicionados longe, ainda parados antes do timer autoral de 2,5 s. Se esse
  timer vencer durante a fixture, o teste falha; não se reduz ou intercepta o
  atraso. O fechamento final é explicitamente da QA por `bye`, após os casos.

O spec Playwright existente agora descobre oito cenários em Chrome e Edge:
**16 testes listados, nenhum executado nesta preparação**. Para os dois cenários
novos, exige todos os nomes de casos na ordem, contagens 32/10, conclusão,
nenhuma omissão de console e sequência contínua abaixo do limite do host.
Erros de página/console são capturados sem filtrar CSP. Uma distribuição atual
pode ser fixada por `SZ_PACMAN_QA_DISTRIBUTION` (SHA-256 exato, validado pelo helper);
sem essa variável, o pin histórico permanece. Isso não autoriza reutilizar um host
encerrado: o coordenador deve provisionar/vincular um host novo ao runtime final.

Verificação leve adicional: 19 arquivos do corpus Pac-Man tiveram hashes pinados
conferidos e foram copiados, com normalização LF declarada, para o cache próprio.
O builder gera 32/10 nomes únicos e sete posições isoladas disponíveis por caso.
Os 24 exemplos numéricos de paredes/alinhamento e dez posições de IA foram
conferidos contra métodos extraídos da fonte exata, sem Turtle, renderer ou loop;
isso continua sendo preflight de fixture, sem aprovação de P05/P08.

Os dez testes de documento passaram com 84 asserções. A primeira execução recusou
corretamente a fixture estrutural compartilhada, que contém um nome de imagem
legado não canônico; a fixture própria passou a declarar apenas fontes, seguindo
os testes de snapshot. O guard produtivo não mudou. Esse negativo e o erro inicial
de localizar o binário Playwright na raiz estão preservados no cache próprio.
As dependências do worktree foram instaladas por `bun install --frozen-lockfile
--ignore-scripts`, sem mudança do lock.

```powershell
bun test experiments/studio-python-runtime/qualification/pacman.test.ts
& packages/studio/node_modules/.bin/playwright.exe test `
  --config packages/studio/playwright.python-runtime.config.ts `
  python-pacman-portable.spec.ts --list
```

**Pendente:** executar os 42 casos causais em runtime real; ampliar input/foco,
clear/reset detalhado, fluxos Pro/Mural/exportação e os gates longos. Não somar
esses 42 casos preparados aos resultados históricos já executados.

## Primeira janela nativa: Q02 passou, Q03 negativo preservado

Em 20/10, o coordenador concedeu até quatro minutos para observadores CPython/Tk.
START foi enviado às 14:40:46−03 e END às 14:41:41−03, liberando antecipadamente
o recurso após a primeira falha. Os dois processos terminaram sem deadline ou
sinal; os PIDs próprios 41640/36448 foram observados ausentes antes do END.
Não houve browser, Docker, build ou TSC nesta janela.

- **Q02-r1 passou** em 15,925 s, dos quais 15,735 s até o jogo completo estar
  pronto, com CPython 3.14.2/Tk e backend WASAPI. Observou callbacks registrados
  de Left/Right/Up, releases, duas acelerações, inércia, três tiros com offsets
  0/+5/−5 e recoil sequencial, duas chamadas `thruster.wav` e uma
  `missile_fire.wav`. Pools completos, radar real e clear foram observados.
  Map=0, Destroy=1, áudio liberado, árvore exportada inalterada e temporário
  ausente. Encerramento pelo limite explícito da QA após clear, sem afirmar
  teclado físico, acústica, partida completa ou desempenho.
- **Q03-r1 falhou** em 15,725 s, exit 1, ao exigir saúde não positiva no passo 6.
  O recibo anterior mostra que o choque legítimo do passo 5 deixou o jogador com
  saúde 27 e matou o inimigo: saúde −4, estado `inactive`. A fixture seguinte
  restaurava saúde 20 e posição, mas não o estado. O loop original corretamente
  ignorou esse inimigo, e a saúde do jogador permaneceu 1. Map=0, Destroy=1,
  áudio liberado e temporário ausente foram observados também no negativo.
  O runner não registrou árvore inalterada/backend no caminho da falha; não se
  infere essa evidência para Q03.
- **Correção restrita à fixture Q03:** cada novo choque declarado restaura
  explicitamente o mesmo inimigo para `state='active'`, além da saúde/posição.
  Não muda fonte do jogo, RNG, timers, áudio, pools ou runtime produtivo.
  Replay mínimo com as classes pinadas e o estado do recibo reproduziu a
  inelegibilidade do alvo (RED exit 1) e verificou a elegibilidade após a correção
  (GREEN exit 0), sem Tk/render/áudio. **A correção ainda não foi executada no
  jogo real**; uma nova janela foi solicitada para Q03-r2 e Q04–Q07.

Agregado próprio `games-functional-r1/native-window-r1.json`, SHA
`a7928813c53f7ec829bd78e8ac810e7bab69a0c492fdd2cd5e941d8e467fd7e6`.
Q02 nativo SHA `d93048f1fd421db763ff3d3b15d8333e1a9c6f7eba82a2c945aade6f71636dfd`,
supervisor `42f3b73f04bd7ab22c96c2079e959e793685a8392d8b73ca30c37532196af04e`.
Q03 negativo SHA `259d1012c7bb9c90a9bf4de150dbced098bc566376e0e787396d6c64b10b8758`,
supervisor `b394e7d59341887b2a2adc9954229450df0f2db32570a0f443fd3547d46116a2`.
Ambos usaram observer SHA `121da6a308cfd99bb0471846611a06ba5c16efaab6be64c5c86828bf08bf385b`.
A aprovação Q02 fica vinculada a esses bytes; a correção posterior de Q03 não
herda aprovação nativa de todo o arquivo. Naquela etapa Q04–Q07 e os dois cenários
Pac-Man ainda não tinham execução real; a janela seguinte está abaixo.
Nenhum desses recortes fecha integralmente S02/S03/
S06/S07, P05/P08 ou o aceite geral.

## Segunda janela nativa: Q03-r2 e Q04–Q07 passaram

O novo acordo autorizou somente CPython/Tk até 17:52 UTC, com no máximo três
minutos de uso. START foi registrado localmente e enviado às 17:46:48,953 UTC;
END às 17:49:09,761 UTC: **140,808 s de janela**, abaixo do teto de 180 s e antes
do prazo absoluto. Os cinco processos foram seriais e seus PIDs
5952/9100/760/29748/3328 foram observados ausentes antes do END. Não houve
browser, Docker, build ou performance. Nenhum caso foi repetido automaticamente.

| Tentativa | Tempo nativo | Resultado observado |
|---|---:|---|
| Q03-r2 | 15,795 s | Quatro clamps/inversões ±790/±590, distância 18 exata versus interior, dano, troca de momento, saúde −19 com três vidas antes do reset, saúde 40/zero vidas após a injeção declarada de uma vida, `GAME OVER` uma vez e outro frame autoral |
| Q04-r1 | 15,779 s | Distância 13 exata versus interior, dano 5, inimigo inativo/saúde 0, score +10, transferência dx=1/dy=−1 e míssil ready/fuel 200, explosão |
| Q05-r1 | 15,802 s | Pickup cria o 31º míssil, preserva os 30 anteriores, aplica upgrades e depois colisão distinta com powerup aplica −50 e duas chamadas autorais de explosão |
| Q06-r1 | 15,710 s | Hunter/mine/surveillance dentro e exatamente no sensor 100; câmera −80/−40→−70/−35, C/c e sete carimbos reais do radar com coordenadas/forma/cor conferidas |
| Q07-r1 | 15,923 s | Pools 30/20 de partículas; offsets/cores/damping/lifetime originais conferidos; 50 partículas ativas até zero em 20 frames, clear sem acúmulo de carimbos/itens |

Todos passaram com CPython 3.14.2/Tk e backend WASAPI, Map=0, Destroy=1,
áudio liberado, árvore exportada inalterada, temporário ausente, exit 0 e sem
deadline/sinal. Os sete arquivos do áudio instalado, suas três dependências e
o ZIP canônico foram reconferidos por processo. Os pools 25/30/20/5 e 30/20
partículas foram preservados; o aumento 30→31 é o comportamento original do
pickup. O splash original continua responsável por 15,593–15,686 s antes dos
frames destes cinco casos. Esses tempos descrevem esta instrumentação oculta,
sem qualificar desempenho normativo ou renderização visível.

Houve um negativo no guard externo PowerShell: `ConvertFrom-Json` materializou
o deadline como DateTime, e uma chamada posterior a `DateTimeOffset.Parse`
tentou interpretar texto com cultura incompatível. O erro não terminante permitiu
Q04 iniciar, ainda dentro de ambos os limites temporais. Antes do próximo filho,
o guard foi corrigido para cast direto de DateTimeOffset e erros terminantes;
o prazo UTC e o saldo foram reconferidos. Esse incidente está preservado em
`window-guard-negative-r1.json`; não é omitido nem contado como falha do jogo.

Agregado próprio `games-functional-r1/native-window-r2-verification.json`, SHA
`75512906b7f14fd291cf2d9a6e4873da4cea0930ec856b2d2fae42144c0d97e0`.
Contém os hashes completos de recibos nativos, supervisores, owners e logs dos
cinco casos, além dos marcadores START/END. Os cinco usaram runner SHA
`ecbe23e0943ef0bd5448865fb263e3e13d389fe181e734be603d12b767838f3a`
e observer corrigido SHA
`7596179006d8a854f8190c429dc88379244a33092ed39739d0d2a22e6f630e5b`,
correspondentes ao HEAD de execução `b70f38a4eb771f5ec8572f7c9d724d9765bc9b41`.
Q02-r1 anterior permanece vinculado ao observer anterior; não foi repetido
porque a mudança foi restrita à fixture Q03. Q03-r1 negativo permanece intacto.

**Alcance:** seis cenários funcionais nativos Q02–Q07 passaram nas composições
registradas, somando Q02 da primeira janela. Ainda não há aprovação de teclado
físico/foco/repetição, raster/inspeção visual completa, acústica, música por 120 s,
pausa integrada, saturação das velocidades máximas da IA, fluxos Pro/publicação,
browser/runtime final, instalação em máquina limpa, desempenho, partida de dez
minutos ou 30 reinícios. Os 42 casos novos de Pac-Man continuam preparados e
não executados. O lote continua sujeito ao review do coordenador; a matriz
S01–S10 e o aceite integral permanecem abertos.

## Pac-Man: embedding nativo pronto, ainda sem execução gráfica

`qualification/pacman_native.py` executa o mesmo observer de geometria/IA sobre
o ZIP baseline canônico, com seus 32 arquivos intactos. O observer é compilado
externamente, com configuração explícita; nenhum arquivo é acrescentado ou
reescrito na árvore exportada. Os cinco imports do jogo devem vir desse ZIP.
As duas configurações produzidas têm exatamente os mesmos bytes que
`preparePacmanScenario` entrega para browser, conferidos por SHA:

- `geometry`: `4ab4c0691c951b6c4d39beee27d049b9324aeb7eb084c41e2c9cc67208eaba73`;
- `ai`: `22c2c8305b76d98f1164d662e06fb55857ae9bc3c7d5d7ae1e61b9ae2dea39df`.

O runner verifica preparation SHA `7fe7d174…`, ZIP baseline SHA `d67e8f17…`,
main portátil SHA `8bd91529…`, inventário completo, sete arquivos do áudio instalado,
declarações build/runtime e versões exatas das três dependências. A instalação
própria é reutilizada, sem alegar instalação fresca para cada caso. O modo
`--preflight` não importa Turtle nem o backend de áudio e não cria Tk/temporário.
Ambos os preflights passaram e estão em
`games-functional-r1/pacman-native-{geometry,ai}-preflight-r1/`; recibos nativos SHA
`7716fceb7645b6ef818106a77024eed5752b29a7d975532b75ac79d0236c3c5d` e
`5ddc43eb9770a5c18b03622d558661b6ed4e53c3caf5769dcec45ed9897338fd`.

A execução gráfica futura usa o root Tk oficial ocultado antes do primeiro pump,
captura erros dos callbacks, exige os 32/10 nomes completos e ordenados, todos os
imports vindos do export, Map0/Destroy1, áudio/temporário liberados e árvore
inalterada mesmo no caminho de falha. Há deadline QA adicional de 12 s, sem
substituir os timers autorais. O supervisor externo tem 20 s por processo;
deadline/sinal é negativo. As fixtures atuais precisam terminar antes do início
autoral de 2,5 s; se isso não ocorrer, o teste falha e preserva o negativo, sem
acelerar/interceptar o timer.

`run_pacman_native.mjs` exige, para abrir Tk, um prazo absoluto UTC válido e ainda
com pelo menos 20 s disponíveis antes do spawn. Mensagem atrasada/prazo expirado,
saldo insuficiente, data ambígua ou data inexistente são recusados antes de criar
o diretório da tentativa. O valor `preflight` permite somente o modo sem Tk.
Quatro testes de processo/admissão passaram, sem criar GUI; incluem a preservação
de falha de spawn e recusa de sobrescrever uma tentativa existente.

Exemplo para uma janela nova explicitamente combinada; substituir o último
argumento pelo prazo UTC efetivamente concedido, sem reutilizar horários vencidos:

```powershell
node experiments/studio-python-runtime/qualification/run_pacman_native.mjs `
  C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-native-env-r1/Scripts/python.exe `
  C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/pacman-native-r1 `
  .cache/studio-python-l0/games-functional-r1/pacman-native-geometry-r1 geometry PRAZO_UTC_CONCEDIDO
```

Orçamento solicitado para os dois casos seriais: até 60 s, incluindo inspeção e
cleanup entre eles, parando no primeiro negativo. Nenhum recurso é reservado
durante preparação/review. Esses dois preflights e a paridade de fonte **não**
executam ou aprovam os 42 casos geométricos/IA; a janela gráfica permanece pendente.
O remoto `2744bab0c` foi buscado e conferido sem merge/rebase/reset na branch;
não houve delta nas receitas/corpus ou fontes Core/Runtime conferidas.
