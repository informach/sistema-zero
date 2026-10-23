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

**Pendente naquela preparação:** executar os 42 casos causais em runtime real; ampliar input/foco,
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
minutos ou 30 reinícios. Naquela etapa os 42 casos novos de Pac-Man estavam
preparados e não executados; a execução posterior está abaixo. O lote continua sujeito ao review do coordenador; a matriz
S01–S10 e o aceite integral permanecem abertos.

## Pac-Man: preparação do embedding nativo anterior à execução gráfica

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
executam ou aprovam os 42 casos geométricos/IA; naquela preparação a janela gráfica permanecia pendente.
O remoto `2744bab0c` foi buscado e conferido sem merge/rebase/reset na branch;
não houve delta nas receitas/corpus ou fontes Core/Runtime conferidas.

## Pac-Man: 32 casos de geometria e dez de IA passaram no nativo

Em 20/10, após o encerramento do TSC do Root, uma nova janela exclusiva permitiu
iniciar até 18:37 UTC e terminar até 18:40 UTC, com teto próprio de 120 s.
START foi registrado localmente e enviado às 18:34:12,448 UTC; END às
18:34:49,492 UTC: **37,044 s de janela**, abaixo também do alvo de 60 s.
Relógio e pins de fonte/venv/artefato foram reconferidos antes de cada filho.
Os dois PIDs próprios 9364/15368 foram observados ausentes antes do END.
Não houve browser, Docker, build, performance, retry ou mudança de código para
esses resultados.

- `geometry-r1`: **32 casos passaram** em 1,554 s de execução nativa. Para
  jogador e primeiro inimigo: quatro faces, oito correções de alinhamento e
  quatro bordas por ator, no loop original, com testemunhas before/after dos
  métodos reais. Os sete inimigos permaneceram presentes e o jogador conservou
  três vidas. A escolha de direção após parede foi válida nos casos dedicados.
- `ai-r1`: **dez casos passaram** em 0,824 s: perseguição nos quatro rumos,
  radar 149/150/151, alinhamento dentro/exatamente na fronteira de meia célula
  e uma escolha aleatória válida. Seed 2026 fixada uma vez, sem busca/retry.
- Ambos: CPython 3.14.2/Tk oficial e WASAPI, Map0/Destroy1, áudio liberado,
  temporário ausente, árvore canônica de 32 arquivos inalterada e os cinco
  imports do jogo exclusivamente no export. Foram observados 833 itens reais
  de canvas antes do `bye` da QA; isso não comprova raster/visual responsivo.
  Exit 0, sem erros, deadline cooperativo ou sinal externo. As configurações
  tiveram exatamente os bytes usados pela preparação browser.

**Limite das provas de borda:** o oráculo de wrap confere o resultado de `move`,
e também preserva a correção de paredes posterior. Nas fixtures horizontais
injetadas em y=0, o original vai para x=±500 e em seguida a parede daquela linha
leva a x=±510; para os inimigos há novas escolhas de direção. Essa linha tem
borda fechada no labirinto: não se afirma uma saída horizontal jogável ali, nem
se classifica a consequência da posição sintética como defeito do adapter.
Nas fixtures verticais, y=−425/365 permaneceu após a fase de paredes. Isso também
não equivale a percorrer naturalmente todos os túneis numa partida completa.

Agregado próprio `games-functional-r1/pacman-native-window-r1-verification.json`,
SHA `eda68a03084497153129dcdc674d06e6dd1a2272ea645035f7b619d48c5bc50b`.
Contém os dez hashes dos recibos/owners/logs dos dois processos, marcadores
START/END e os dois recibos de clock/pins prévios. Recibo geometry SHA
`d8d5a0564b9a884128097e8128dd20c8e784ab962526a87a2c4cb4502a5492b8`,
supervisor `54479d26c2b53fec9a47da501284f0bd916a9527928bca345b1e779a54bdeb6f`.
Recibo AI SHA `b432c863569d41c3ddb9141f6b2b3421ec7b98869067484b1ae5fa75db72e501`,
supervisor `7fbb8d038dc081507bbe3d7b87dd33ac815464f3b723bd589540510f16959f2f`.
Fonte de execução `3c99bb1565245fe801efc270f7f76a8b3b12057d`; runner SHA
`d202778b1c450a03c5818d9dfbbe067ac443de22f305bd8e8d459dda24d925ac`,
observer fonte SHA
`fb56b424a7ea0a74d9cd6f5d085de282d4b55edcca27a8d3d12d400f19ab5a4e`.
Os hashes configurados geometry/AI estão na preparação anterior e conferem.

São **dois cenários com 42 casos causais**, não 42 partidas. As posições/estados
são injetados explicitamente antes do timer autoral real de 2,5 s; não houve
aceleração/interceptação de timers. O fechamento é da QA depois da última
observação, e não vitória/derrota natural. P05/P08 ganham evidência nativa deste
recorte; ainda faltam browser/runtime final, input/foco/repetição, raster/clear/
reset detalhados, áudio/cancelamento/reinício, Pro/Mural e gates de desempenho/
endurance. Recibos negativos anteriores permanecem preservados e o aceite
integral P01–P16 continua aberto, sujeito ao review do coordenador.

## Space Arena Q08: pacote preparado, execução pendente

O próximo pacote usa o mesmo runner nativo e o observer externo
`qualification/space_arena_q08.py`, sem alterar receita, fonte exportada,
Core/Runtime ou dependências. São duas tentativas separadas:

- `Q08-pause`: invoca os bindings autorais S, p/P e c/C; aguarda um timer QA
  real de 1.200 ms e o timer FPS autoral de 1.000 ms durante a pausa; exige
  posições, velocidades, saúde, combustível, partículas e contadores de chamadas
  originais congelados. Ao retomar, exige avanço dos métodos originais e um
  `pen.clear` real. O reset de `game.frame` pelo FPS não é usado como movimento.
- `Q08-bgm`: repete essa prova curta, pausa novamente e aguarda o segundo
  `sz_audio.play` do WAV original, pelo timer autoral de 120 s. Exige intervalo
  real de pelo menos 120 s, handles distintos e duas vozes ativas no mixer nativo
  durante a sobreposição. O WAV canônico dura 122,251958 s. O hook de áudio
  delega a chamada original uma vez; não acelera timer nem reproduz mídia falsa.

O primeiro caso tem deadline cooperativo de 30 s/externo de 40 s e pede janela
de até 60 s. O segundo tem 150 s/160 s e pede **outra janela de até 180 s**, com
alvo de 130 s. Serão seriais, com inspeção/cleanup e parada no primeiro negativo.
O supervisor exige prazo UTC futuro válido com todo o orçamento do filho ainda
disponível e registra a identidade do observer adicional. Deadline/sinal falha;
nenhuma janela vencida será reutilizada. START/END e PIDs próprios serão
registrados no topo do status local. A queue do coordenador recusou entrega por
limite de 100 submissões; o status compartilhado é o canal de entrega disponível.

Os testes leves cobrem snapshots independentes, detecção de mutação de partículas,
delegação/restauração e propagação de exceções, além dos negativos de admissão
do processo. Não executam jogo, Turtle ou áudio. Os dois cenários Q08 continuam
**não executados**: não há aprovação nativa nova, input físico, prova acústica,
browser final, partida completa ou endurance. Positivos e negativos anteriores
permanecem ligados às identidades de fonte dos seus próprios recibos.

## Próximo lote browser: somente host atual, sem iniciar serviços

`packages/studio/playwright.python-games-current.config.ts` usa um Chrome,
um worker e uma página por caso, serial, sem retries, trace ou vídeo. Não tem
`webServer` e não constrói/reinicia host ou distribuição. O primeiro negativo
interrompe o lote. O setup HTTP anterior ao browser exige autoridade atual do
coordenador, janela UTC futura com todo o orçamento disponível, fonte congelada,
hash canônico da distribuição/release, bytes do provider e configuração exata.
Os recibos antigos não fornecem automaticamente essa autoridade.

A descoberta sem execução lista 14 cenários: os oito Pac-Man existentes e Space
Q02–Q07. O driver browser do Space adiciona dois módulos QA e mantém toda a
fonte/mídia original. Reutiliza os algoritmos/fixtures do observer nativo; observa
stamps/itens do pen sem chamar `getcanvas`, indisponível no browser. Isso não
equivale à contagem de itens Tk, inspeção raster ou teclado físico. Os cenários
continuam não executados no host atual.

| Recorte | Prova preparada | Continua fora desse lote |
|---|---|---|
| Pac-Man geometry/AI | 32+10 fixtures causais com manifesto completo | Partida natural, foco/repetição, áudio e publicação |
| Outros seis Pac-Man | Observação/input dirigido, pellets, power, morte e estados próximos de fim | Partida completa e cobertura integral P01–P16 |
| Space Q02–Q04 | Bindings invocados por QA, impulso/tiros, bordas/dano e mísseis/score | Entrada física e jogo completo |
| Space Q05–Q07 | Pickups, penalidade, IA/câmera/radar, partículas e clear | Raster detalhado, pausa/replay120s, Stop/restart e Pro/Mural |

Próximo comando usa `--grep 'Pac-Man instrumented (geometry|ai) |Space Arena instrumented Q02 '`:
três testes seriais, alvo estimado 60–120 s, teto de suíte 180 s e até 30 s
adicionais para cleanup pelo operador já revisado do coordenador. O total é
estimativa, não medição de performance. Os onze restantes terão orçamento novo
após esse diagnóstico; previsão inicial de 3–6 min, sem reserva ou execução agora.
Chrome apenas; Edge permanece uma dependência posterior de compatibilidade.

Dependências ainda abertas: URL viva do host autorizado; autoridade nova com
owner/instância, prazo, distribuição/release/provider/configuração; endpoints
`/provider`, `/distribution`, `/configuration`, `/provider-host.mjs` e os dois
`/project/...Portable`; corpora/receitas/media correspondentes e extensão áudio
na distribuição existente; JSPI no Chrome instalado; integração/review do pacote
e janela exclusiva após JS7/primeiro fluxo Lessons Pro. Não há pedido de rebuild.
Se o host atual não expuser esses endpoints, o lote permanece UNBOUND e volta ao
coordenador; este pacote não inicia um host alternativo nem amplia o escopo de
infraestrutura. O freeze e comandos completos ficam no cache próprio
`games-functional-r1/current-host-browser-package-r1/`.

### Continuação sem janela: corpus real e entrada/ciclo de vida

Sem iniciar host, jogo, Turtle ou áudio, a preparação foi conferida contra o
ZIP canônico real de Space Arena: os 42 arquivos e nove mídias passaram nos
hashes/inventário; Q02 e o novo `input-lifecycle` preservaram entrypoint original
e assets. Duas alterações deliberadas, no fonte principal e em um byte de WAV,
foram recusadas. Recibos próprios `canonical-browser-source-check-r1/receipt.json`
e `canonical-browser-source-check-r2/receipt.json`; a configuração usada nessa
checagem é declaradamente offline e não autoriza host/browser.

O caso novo envia S/s, setas, keyup, repetição de Up, espaço, P/p e C/c pelo
teclado do browser. O observer registra os callbacks reais, sem injetar estado
ou invocar teclas por Python. O teste confere foco fora do canvas, eventos DOM
confiáveis e repeat, dois aumentos de impulso, releases, três mísseis, pausa com
simulação congelada por 1,2 s e FPS autoral atendido. Depois usa Parar real,
aguarda áudio liberado e observa 1,1 s sem novos eventos; prepara uma sessão nova,
inicia novamente e exige mídias novas enquanto as anteriores permanecem liberadas.
Isso está **preparado, não executado**, e não substitui input físico/30 reinícios.
São mantidos todos os pools, métodos, WAVs e timers autorais. O deadline desse
caso é 90 s; orçamento proposto separado é até 120 s mais até 30 s de cleanup.

O pacote r2 congela essas fontes separadamente, sem reescrever r1 ou seus
recibos. A descoberta passa a listar 15 casos; o primeiro lote continua limitado
aos mesmos três diagnósticos e não inclui automaticamente o caso novo.
Os specs Space agora esperam a inicialização assíncrona do provider por CDP
sem conceder ativação antes do Jogar. Os controles/aceites nativos anteriores
não foram repetidos. Root foi avisado diretamente pelo MCP de mensagens; a
prioridade JS/admin e o slot browser continuam sob sua coordenação.

O mesmo pacote r2 fecha outra lacuna de preparação: nos casos Pac-Man próximos
de vitória/derrota, o spec agora aguarda o disparo real do timer autoral de
3.000 ms, o `bye` original e o estado completed antes de descartar a sessão.
O observer delega callback/bye uma vez e registra os tempos; não muda delay.
Os oito casos continuam os mesmos, e não se reclassificam esses estados
injetados como partidas completas. Essa versão do observer não herda a
aprovação dos recibos antigos nem foi executada no host atual.

### Diagnóstico opcional de raster e consulta estreita

O spec `python-pacman-render.spec.ts`, com configuração própria
`playwright.python-games-render.config.ts`, prepara uma prova adicional de P02.
Usa o mesmo host atual/distribuição e o cenário observe sem injeção de posição.
Confere canvas lógico 1010×860, pixels pretos/opacos e coloridos reais, proporção
da apresentação em 1280 e 480 px de viewport, screenshots e entrega de uma seta
no tamanho estreito. Não compara imagens de uma partida em movimento por igualdade
de pixels, nem afirma inspeção completa dos nove GIFs ou uso em celular físico.

Esse diagnóstico é separado dos 15 casos do pacote r2 e dos três iniciais;
não altera suas fontes congeladas. Foi apenas descoberto/checado sem browser ou
serviços. Janela proposta futura: alvo 15–45 s estimado, orçamento de suíte
120 s mais até 30 s de cleanup no operador do coordenador. Continua UNBOUND,
com os mesmos requisitos de autoridade atual e pins de fonte/host antes do
browser; nenhuma permissão anterior é reutilizada.

### Correção concreta dos leitores de console

Os quatro specs de Games interpretavam cada fragmento final do console como
uma linha JSON completa. Uma reprodução sem browser falhou em quatro de seis
testes (`Unexpected EOF`), usando a mesma lógica anterior. O console tem
transporte em chunks: uma leitura intermediária pode terminar no meio de um
registro do observer, embora nenhum caractere tenha sido omitido.

O decoder comum `qualification/game_observations.ts` agora interpreta somente
linhas terminadas por newline. A leitura cumulativa seguinte completa o registro;
JSON inválido em linha completa continua falhando. Seis testes/289 asserções
cobrem as três famílias de prefixos em cada fronteira de fragmento, registro
completo antes de cauda incompleta, CRLF, Unicode e erro completo preservado.
RED/GREEN ficam em `games-functional-r1/console-fragment-repro-r1/`, sem alterar
os recibos de execução anteriores. Essa correção é do harness, não do runtime
ou do jogo; não houve browser, nativo, serviço ou repetição dos 42 casos nativos.

### Correção concreta do inspetor de configuração Space Arena

Um segundo negativo foi reproduzido com o ZIP canônico real: retirar toda a
lista de extensões instaladas ainda passava em `prepareSpaceQualification`.
O snapshot de fonte é válido para edição sem Turtle; portanto não substitui a
identidade da configuração do corpus que será executado. O inspetor agora
confere a extensão canônica `python-turtle@1.0.0`, como já fazia o de Pac-Man.
É uma verificação da fixture de QA, sem nova política do produto ou aprovação.

O projeto real, com seus 42 arquivos/nove mídias, continua passando na preparação
Q02/input. Sem Turtle deve ser recusado; a versão errada também é coberta pelo
teste leve. RED e GREEN separados ficam em `space-inspector-extension-red-r1/`
e `space-inspector-extension-green-r1/`, sem reescrever evidência antiga.
Esses checks não instalam extensões, importam Turtle ou executam o jogo.

### Inspeção das mídias pelos leitores atuais do browser

Uma inspeção offline usou os leitores reais `readTurtleImage` e
`readPythonAudioWav`, sem decoder nativo, browser ou reprodução. Os leitores do
worktree Games e do Root estavam byte a byte iguais. Os 21 arquivos reais
conferiram tamanho e SHA dos manifestos de corpus; as declarações de
`register_shape` dos fontes pinados cobrem exatamente os nove GIFs de Pac-Man
e os quatro de Space Arena.

| Corpus | GIFs aceitos pelo leitor de primeiro frame | Dimensões |
| --- | --- | --- |
| Pac-Man | pac, up, down, left, right, green_enemy, pink_enemy, red_enemy, wall | 28×28 px |
| Space Arena | hunter, surveillance, mine, powerup | 20×20 px |

Nos 13 GIFs, o resultado codificado do primeiro frame preservou os bytes
originais e uma segunda leitura produziu o mesmo SHA. Isso verifica a entrada
do decoder, sem provar pixels decodificados, transparência ou comparação visual.
Os oito WAVs passaram na estrutura RIFF/PCM16 e nos limites atuais. O
`powerup.wav` de Space Arena usa estéreo a 96.000 Hz, exatamente o limite
superior aceito; o BGM usa estéreo a 48.000 Hz e dura 122,251958 s, enquanto a
receita original pede nova reprodução após 120 s. Essa diferença já está
preservada no plano Q08 e não foi alterada para esta inspeção.

Evidência própria em `games-functional-r1/canonical-browser-media-inspection-r1/`:
script, log e recibo com metadados dos 21 arquivos e linhas dos registros de
formas. SHA do recibo:
`fa876125519418d299443c48fc9ea327acc91cbe1157098703546dbb874702f2`.
Execução do inspetor terminou com código 0. Não houve browser, Tk, HTTP,
reprodução, build ou repetição dos controles nativos. Os 28 pins do pacote r4
permanecem os mesmos; esta evidência não amplia o lote de três casos nem
constitui aceite de imagem decodificada, áudio ouvido, input ou jogo completo.

### Browser atual: primeiro lote funcional r3

O operador único do coordenador executou o lote em 20/10/2026,
21:06:17.828–21:06:53.160 UTC. A suíte Playwright terminou com três passes,
zero skips, flaky ou unexpected, em 27,6 s. O recibo do operador registra
`PASS-PENDING-REVIEW`, sem erros ou força, fontes estáveis, encerramento normal
e liberação observada das portas 5297 e 52018. Os negativos anteriores ficam
preservados: r1 parou na inicialização do sampler, antes do host/browser; r2
validou o host, mas a reimportação da configuração pelo worker falhou antes
dos algoritmos dos jogos. A correção QA é o commit `8275ccf6f`.

O lote usou a distribuição Python `a8a6c625…`, release local
`python-probe/probe-1` com manifesto `0123ab8f…`, e o novo freeze r5
`07e9afaf…`. A distribuição Python e a receita foram reutilizadas nessa execução.
Esse caminho CPython/Pyodide e Canvas não qualifica a imagem JS/SDK `9e33`.

A revisão dos anexos JSON originais, somente em leitura, confirmou:

| Caso | Duração do teste | Payload efetivamente registrado |
| --- | --- | --- |
| Pac-Man geometry | 3,794 s | 32 nomes únicos na ordem do manifesto, 88 witnesses de métodos |
| Pac-Man ai | 2,108 s | 10 nomes únicos na ordem do manifesto, 31 witnesses de métodos |
| Space Arena Q02 | 18,367 s | Sete frames, nove callbacks autorais, três mísseis, sete clears |

Nos dois casos Pac-Man, o término registra `closedByQA=true` após todos os
casos; são posições de atores declaradamente injetadas no loop real. Em Q02,
os pools iniciais são 25 inimigos, 30 mísseis, 20 estrelas e cinco powerups,
com 30 partículas de explosão e 20 de exaustão. Os callbacks registram rotação,
release e impulso 0,2 → 0,4 → 0; o disparo mantém o witness de três mísseis e
recuo. Os sons delegados são dois `thruster.wav` e um `missile_fire.wav`.
Todos os clears têm stamps antes e zero depois. Os três payloads terminam em
`completed`, sem omissão de console, sequência de eventos contínua ou cauda JSON
incompleta. As identidades de fonte, runtime e freeze correspondem ao lote.

O operador amostrou RSS agregado de 2.284.335.104 bytes, árvore do host de
354.430.976 bytes e árvore do browser de 1.889.771.520 bytes; o menor valor livre
observado foi 2.982.604.800 bytes. São amostras desse lote, sem pico de memória
privada, prova de FPS/performance ou aceite em máquina de 8 GB.

Evidência original: cache somente leitura do coordenador em
`games-first3-host-r3/evidence/`, recibo SHA
`b4344eaa1e4db1e833cac95b25892255e56e005998bb6a375eabdae55b0e9532`
e report SHA `44c24be1cdfa3d060dac45f4a503aa52f24464fd2935c521764f6c77f8acb88e`.
A revisão semântica própria fica em `root-r3-functional-payload-review-r1/`,
SHA `31475d1873bd599bb2e348cad1dfb0b698ef3e3e8cc68135e0e672c6184a759d`.

O resultado é restrito aos três cenários instrumentados. Não prova input DOM/OS
confiável, raster/golden, áudio ouvido, partidas completas ou os demais casos.
A proposta seguinte é somente Space Arena Q03/Q04/Q05, pelos testes existentes,
alvo estimado de 60–90 s e limite total de 240 s no operador. Ela exige novo
namespace, autoridade, revisão e janela do coordenador, depois do Docker serial;
não houve execução adicional nem reserva automática.

### Browser atual: Space Arena Q03–Q07 e Pac-Man básico

O coordenador executou mais três lotes com a distribuição `a8a6c625…`,
release `0123ab8f…` e os mesmos 28 arquivos do freeze r5 `07e9afaf…`.
A revisão abaixo lê os reports, recibos e anexos originais; não executa jogos.
O namespace Space `games-space-q03-q05-r1` foi somente preparado, nunca
executado. Ele não é um negativo histórico.

| Lote real | Intervalo UTC em 20/10/2026 | Resultado dos testes | Resultado do controlador |
| --- | --- | --- | --- |
| games-space-q03-q05-r2 | 21:59:40.624–22:00:44.223 | 3 passes, suíte 55,755 s | PASS-PENDING-REVIEW |
| games-space-q06-q07-r1 | 22:02:43.480–22:03:28.570 | 2 passes, suíte 37,7 s | NEGATIVE preservado |
| games-pacman-core-r1 | 22:05:27.134–22:05:59.007 | 3 passes, suíte 24,7 s | PASS-PENDING-REVIEW |

Q06/Q07 terminou com Playwright, host e sampler em exit 0, mas o controlador
exigia literalmente `expected:3` para um plano com dois títulos. A comparação
dos títulos, projetos e passes ocorreu antes dessa assertiva. O recibo mantém
`tests:null` e `NEGATIVE`; o aceite dos payloads é limitado aos dois cenários
do jogo. A correção do controlador é responsabilidade do coordenador/Core e
não justifica repetir esses testes verdes.

| Caso | Duração | Evidência semântica dos anexos reais |
| --- | --- | --- |
| Space Q03 | 17,979 s | Quatro paredes em ±790/±590, velocidade invertida; distância 18 mantém saúde 40, contato seguinte reduz a 27; saúde −19 precede reset para 40 e vidas 0; nove frames/clears |
| Space Q04 | 17,874 s | Inimigo inativo com saúde 0, score +10; míssil ready com fuel/max_fuel 200; duas limpezas e um som explosion |
| Space Q05 | 17,858 s | Powerup aumenta o pool original de 30 para 31; thrust 5,25, max_fuel ≈220, damage 5,5; acertar outro powerup aplica −50; duas limpezas |
| Space Q06 | 18,177 s | Seis inimigos em pares dentro/no limite do sensor, três algoritmos; câmera de (−80,−40) para (−70,−35); callbacks c/C e sete witnesses de radar |
| Space Q07 | 17,881 s | 50 partículas originais decrescem até zero em 20 frames; integração, amortecimento 0,85 e reset verificados pelas assertivas do observador; 20 limpezas |
| Pac-Man observe | 9,309 s | Sem injeção de estado; quatro teclas enviadas ao canvas após tick 200 chegam com headings 180/90/0/270 e estado move |
| Pac-Man pellet | 1,843 s | Posição declaradamente injetada: score 0→2 e pellets 355→354 |
| Pac-Man power | 10,705 s | Posição injetada: score 0→50, power 4→3 e velocidade 5→8→5; callback real reset_speed dispara após 3,0026 s |

Todos os payloads mantêm sete inimigos Pac-Man ou os pools Space completos
25/30/20/5 e partículas 30/20. Em Q05, o 31º míssil é o upgrade autoral; o
fuel corrente permanece 200 no instante do upgrade, distinto do novo máximo.
Não houve omissões de console, lacunas de sequência ou cauda JSON parcial.
Os três snapshots Pac-Man estão `running` antes de dispose; isso não é término
natural. As vidas incidentais de power no tick 250, inclusive valor 1, foram
preservadas. Q03 continua no loop `playing` após a derrota próxima injetada.

Nos três lotes, o recibo registra fontes estáveis, cleanup observado, host
normal e ausência de força; as duas portas de cada host ficaram livres. RSS
agregado amostrado foi, respectivamente, 2.304.712.704 e 2.317.524.992 bytes
nos dois lotes Space; mínimos de RAM livre foram 3.312.898.048 e
2.989.735.936 bytes. Esses valores não certificam pico privado ou desempenho.

Recibos originais, na ordem da tabela: `d5a78d1f202f75f075955b4cd82cba09232e5b5ecb89ea7f7cf025dcd0e14234`,
`58152a6cbb82ca2930f2753c28221b2b270f5aa84920ce9a4f7c0146011c753b` e
`258fbf5c61a1d8f5c088c03057dfa4e8e03294d4938b670e5978c52b329bca42`.
Revisões próprias em `games-functional-r1/root-space-q03-q07-payload-review-r1/`
e `root-pacman-core-r1-payload-review-r1/`, com scripts e JSONs SHA
`02c3d9f50f28e9f57e364a6e2e39ba9b01ff00e0828686230e91114ac0ca53c4` e
`879f562d576a3c254dce8fb8e19537cfd983ad8ed708d585649e4b2842022797`.

O próximo caso Space existente verifica input entregue pelo browser, foco,
repeat/release, pausa por 1,2 s, Parar e um reinício, com timeout de 90 s.
O diagnóstico raster Pac-Man existente usa configuração separada já congelada
e mede canvas lógico 1010×860 em viewports 1280 e 480 px. Ambos dependem de
novo namespace, autoridade e janela do operador único. Não exigem novos testes,
runtime ou distribuição. Continuam pendentes partidas completas, áudio ouvido,
comparação golden, dispositivos físicos e os gates de duração/performance.
