# Motores do Clássico: o que existe, e o que o lote 4 mudou (21/11/2026)

Seção 8 da missão ("motores preparados para jogos grandes"): antes de mexer, o inventário do que
os cinco motores JavaScript já fazem. Feito por leitura do código, com arquivo e linha, num
levantamento independente e conferido nos pontos que este lote tocou. Pastas: `OE` =
`packages/studio/src/official-extensions`; `CORE` = `packages/core/src/studio` (onde mora o motor
das cenas do Pinta, `pinta-scene-player.ts`).

## O que cada motor já tem

| Capacidade | Jogo 2D | Jogo 2D Avançado | Jogo 3D | Mundo 3D | Jogo 3D Avançado |
|---|---|---|---|---|---|
| Passo | fixo 1/60 com acumulador (`game-2d/runtime/lifecycle.ts`) | variável (teto 0,1); fixo 1/60 com interpolação na campanha | variável, teto 0,1 | variável, teto 1/30 | variável, teto 1/30, subpassos de colisão |
| Atualizar separado de desenhar | não (o "a cada quadro" faz os dois) | sim | sim | sim | sim |
| Pool de entidades | não (só teto) | sim (por molde, pré-aquecido) | não | instâncias | sim (recursos de modelo com dono) |
| Índice espacial | parcial (grade do terreno, sort-and-sweep acima de 2048 pares) | sim (células de 64 a partir de 1600 pares) | não | colisores em grade | sim (grade 16×16) |
| Recorte fora da tela | tiles e, desde o lote 8 da conclusão, sprites (margem de 64 px mais o maior lado; quem está fora só atualiza o estado do quadro) | tiles e entidades (margem 128) | frustum padrão do three | pedaços de 80 m com esfera própria | frustum padrão; recicla longe da origem |
| Instancing | (Canvas 2D) | (Canvas 2D) | não; geometria e material compartilhados | sim, em muitos lugares | não; clones compartilham geometria e material |
| Regiões / streaming | cenas do Pinta ligadas por portas: destinos prontos antes de passar e cache de 8 cenas (lote 8); no jogo D, as regiões ligam as entidades pelo programa | não (o RPG troca o mapa inteiro) | o Kit Plataforma (17 colunas à frente, 11 atrás) e, com o cenário do Molda, a carga por regiões e o bloco "Quando … entrar na região" (lotes 5 a 7b da conclusão) | grama toroidal (só visual) e, com o cenário do Molda, a carga por regiões e o bloco "Quando … entrar na região" | com o cenário do Molda, a carga por regiões e o bloco "Quando … entrar na região" |
| Qualidade adaptativa | (Canvas 2D) | (Canvas 2D) | sombra por nível | modo turbo | modo leve e composer |
| Descarte de GPU | (Canvas 2D) | (Canvas 2D) | recomeçar descarta mundos; fechar solta caches e o renderer | recomeçar leve no lugar; fechar descarta tudo | nova partida descarta pools e moldes; fechar descarta tudo |
| Persistência do jogo | pelos blocos de armazenamento do navegador (o jogo D guarda na cama) | sim (slots validados) | não | não | sim (`localStorage` com prefixo) |

As regiões dos cenários 3D (proposta aprovada em 21/11/2026, feita nos lotes 5 a 7b da conclusão,
22/11/2026; [`regioes-3d-especificacao.md`](regioes-3d-especificacao.md)): a carga por regiões não
mora em nenhum dos três motores. Ela fica no motor dos cenários (`carregarCenaNoThree`, em
`packages/molda-cenarios-motor/src/compilar/runtime-three.ts`, opção `carga: 'tudo' | 'regioes'`,
padrão `'tudo'`) e no SDK do Estúdio (`packages/studio/src/three/scene3d.ts`, que pede
`'regioes'`); os motores só ganharam o bloco "Quando … entrar na região" (`onEnterRegion`, das
regras comuns em `OE/game3dRules/runtime.ts`; no catálogo, o valor `event: 'regiao'` da regra
`onGame`), pago com os bytes da seção "O bloco … pagou os próprios bytes", abaixo.

As cenas do Pinta ("Criar cenário do meu desenho", Jogo 2D e Avançado): os tiles são recortados
pela câmera (`CORE/pinta-scene-player.ts`), e desde `719fade30` os objetos de arte também: só os
que estão perto da câmera são desenhados (16.384 para 1.358 desenhos por quadro numa cena no
limite). A instância de CONJUNTO fica fora do recorte (full review final de 21/11): o conteúdo dela
pode passar do retângulo nominal, e o raio do retângulo cortava um filho à vista. Dentro de um
conjunto o recorte não segue a câmera. As imagens do cenário são pedidas ao criar o cenário, para a
arte de um objeto distante não chegar atrasada. A cena inteira é preparada de uma vez (256×256
células, 32 camadas, 512 objetos por camada no máximo). Desde o lote 8 da conclusão (22/11/2026),
num mundo com portas: as cenas preparadas ficam num cache de 8 (voltar não prepara de novo), os
destinos das portas da cena ativa ficam prontos um por quadro com as imagens decodificadas, as
áreas são conferidas de novo só quando o corpo muda de lugar e o host do Jogo 2D cria o mapa de
colisão pelo `_newTileMap` (70 passagens davam o aviso falso de "Criar mapa rodando sem parar").
O relógio das áreas e a pré-carga vivem na mesma geração: na primeira versão, o relógio abria uma
geração nova e matava a pré-carga em todo jogo com "Quando entrar em área" (revisão do lote 8).
O jogo D (`evidencias/jogo-d-2026-11-22/`) mede isso num mundo de 96 × 72 peças com 14 portas:
pior passagem de 7,8 ms e p95 de 2,1 ms por quadro no Windows local.

O orçamento de desenho dos três motores 3D (`OE/threeRenderBudgetRuntime.ts`) cuida do pixel
ratio, do tamanho da tela, do mapa de sombra e dos efeitos, e passa ao nível leve uma vez abaixo
de 45 quadros por segundo. Não cuida de draw calls, quantidade de objetos nem nível de detalhe:
esses são tetos de cada motor, mais o orçamento por modelo do carregador compartilhado.

## Os tetos que cortavam calados (seção 8.4)

A missão pede: "quando um limite for alcançado, o usuário deve receber uma mensagem clara e não um
jogo silenciosamente incompleto". O inventário achou cortes sem recado (a revisão do lote 4 achou
mais um, o rastro do Avançado). Os tetos não mudaram; agora cada um avisa, uma vez por partida, no
console do jogo (onde moram todos os avisos dos motores). "Por partida": o Jogo 2D zera os avisos a
cada recomeço; os dois Avançados apagam as chaves destes recados no "jogar de novo":

| Motor | Teto | Recado |
|---|---|---|
| Jogo 2D | 400 sprites num grupo ou tipo de inimigo (em todos os caminhos: soltar, pôr no grupo, tiros, obstáculos, ovos, asteroides, inimigos e a lista mexida direto no modo Código) | "um grupo (ou tipo de inimigo) só guarda até 400 sprites, e o que passou disso ficou de fora. Use "Tirar do grupo quem sair da tela" ou "Destruir o sprite" para abrir vaga." (verdadeiro também quando, no modo Código, um `unshift` deixa o novo entrar e o último sai) |
| Jogo 2D | 80 partículas por emissão; 400 na tela | "Soltar partículas" solta no máximo 80 de cada vez: soltei 80. / chegou a 400 partículas ao mesmo tempo e as novas não apareceram. Solte menos de cada vez. |
| Jogo 2D Avançado | 1000 faíscas (o bloco diz "faíscas"), no efeito e no rastro | chegou a 1000 faíscas ao mesmo tempo e as novas não apareceram. Use menos faíscas no "Criar o efeito". / o rastro chegou a 1000 faíscas ao mesmo tempo e as novas não apareceram. Deixe o rastro em menos objetos. |
| Jogo 3D Avançado | 120 faíscas por explosão; 300 por efeito ao mesmo tempo; 64 enfeites | um efeito 3D solta no máximo 120 faíscas de cada vez: usei 120. / um efeito chegou a 300 faíscas ao mesmo tempo e as novas não apareceram. Diminua a quantidade ou a vida delas. / espalhar enfeites usa no máximo 64: espalhei 64. |

Testes, todos vermelhos na versão anterior: `game-2d/__tests__/limitWarnings.test.ts`,
`game-2d-advanced/__tests__/runtime.test.ts` ("os tetos avisam") e
`game-3d-advanced/__tests__/runtime.test.ts` ("os tetos avisam").

## O peso dos motores (os tetos de payload desceram)

Nenhum teto de payload pode subir, e o Jogo 2D estava a 40 bytes do dele (o teto é em bytes de
UTF-8, e os recados têm acento). O que se achou: o Jogo 2D mandava **54,7 KB de comentários de
bloco** (`/** … */`) a cada criança, a cada execução; o compactar só tirava os comentários de linha.
`compactOfficialRuntimeSource(…, { stripBlockComments: true })` tira o comentário que começa uma
linha (ali ele não pode estar dentro de uma string nem de uma expressão regular), com modo
cauteloso para um `/*` aberto no meio do código e recusa de linha com barra de continuação.
`bundle.test.ts` prova, com o parser do TypeScript (que sabe onde começa uma expressão regular),
que o programa impresso sem comentários é o MESMO antes e depois. O typecheck do runtime passou a
ler a fonte, que é o mesmo programa e tem os tipos JSDoc.

| Runtime | Antes | Depois | Tetos |
|---|---|---|---|
| Jogo 2D (sem cenário) | 422.457 bytes, 120.628 gzip | 368.619 bytes, 95.238 gzip (−13% e −21%) | 422.500 → 369.500; 121.500 → 96.000 |
| Jogo 2D com cenário | 447.878 caracteres | 394.477; 392.787 em 22/11 (compositor compactado, cache das cenas) | 449.000 → 397.000 → 393.500 |
| Jogo 3D Avançado | 220.689 caracteres, gzip 64.974 (Windows) e 62.564 (Linux) | 217.833, 63.490 (Windows; Linux estimado pela razão medida no CI, 0,962) | 220.700 → 217.950; gzip Windows 65.000 → 63.600; Linux 62.600 → 61.250 |
| Jogo 3D Avançado sem cenário | 213.058, 62.755 | 210.202, 61.269 | 213.150 → 210.300; Windows 62.900 → 61.400; Linux 60.550 → 59.100 |

No 3D Avançado o compactar não mudou: os comentários no fim de linhas de código (que iam para o
jogo, 3,5 KB no total do motor) foram para uma linha própria. O CI mediu o primeiro passo no Linux
(run 44932070234: 218.501 caracteres, 61.465 e 59.316 bytes gzip, abaixo dos tetos estimados).
Revisão do lote 4: `stripLeadingBlockComments` ganhou a leitura de "a linha termina dentro de um
comentário?" (`endsInsideComment`), que corrige dois padrões que a primeira versão errava (um `/*/`
e o modo cauteloso terminando numa linha que reabre um comentário; nenhum existe nas fontes de
hoje), e a variante com cenário também tem o teste de equivalência pelo parser. O Avançado 2D e os outros dois 3D
ainda levam comentários de bloco: é a mesma economia esperando um lote que meça e desça os tetos
deles, com o gzip do Linux medido no CI.

As cinco aulas protegidas passaram no navegador com os motores novos (`e2e/protected-lessons.spec.ts`,
5 de 5), a matriz dos cursos (43) e os testes completos dos três motores mexidos (Jogo 2D e cenas
3.345, Avançado 1.237, 3D Avançado 576).

### O bloco "Quando entrar na região" pagou os próprios bytes (22/11/2026, lote 6 da conclusão)

O bloco entrou nos três motores 3D do JavaScript sem subir teto nenhum. Cada motor pagou o seu:

- **O laço de apoio de 9 amostras saiu dos três motores** e virou `fisica.apoio` do SDK dos
  cenários (`three/scene3dPhysics.ts`, o mesmo resultado do laço antigo, conferido por teste).
- **O fragmento das regras ganhou um subfragmento de regiões** (`/*__SZ_GAME_RULES_REGIONS__*/`):
  o "Quando entrar na região" só entra no motor com o cenário do Molda; sem cenário, três nomes
  vazios (`withGameRules3DRuntime(fonte, false)`).
- **176 comentários no fim de linhas de código** dos fragmentos dos motores 3D foram para uma linha
  própria (o compactar só tira a linha inteira; no fim da linha eles iam para o jogo). No Mundo 3D
  isso desceu ~7 mil caracteres e ~3,4 KB gzip.
- No 3D Avançado o bloco segue um **molde** (as entidades nascem dentro do "Quando o jogo entrar no
  estado", e a regra mora no ⚡ Quando acontecer, onde a variável não existe): o motor procura o
  primeiro vivo do molde com o `forEachAlive` que já existia.

| Runtime | Antes (20/11 e 21/11) | Depois (22/11) | Tetos (caracteres; gzip Windows) |
|---|---|---|---|
| Jogo 3D (completo) | 248.765; 70.123 | 248.064; 69.697 | 248.900 → 248.100; 70.250 → 69.800 |
| Jogo 3D sem cenário | 241.722; 68.289 | 240.939; 67.786 | 241.800 → 241.000; 68.400 → 67.900 |
| Jogo 3D sem Kit e sem cenário | 207.640; 58.573 | 207.326; 58.329 | 207.700 → 207.400; 58.700 → 58.450 |
| Jogo 3D sem Kit, com cenário | 214.683; 60.412 | 214.451; 60.248 | 214.800 → 214.500; 60.550 → 60.350 |
| Mundo 3D (completo) | 357.367; 106.823 | 350.553; 103.443 | 357.450 → 350.650; 106.950 → 103.550 |
| Mundo 3D sem cenário | 349.931; 104.710 | 342.786; 101.227 | 350.000 → 342.900; 104.850 → 101.350 |
| 3D Avançado (completo) | 217.833; 63.490 | 217.947; 63.470 | 217.950 (igual); 63.600 → 63.550 |
| 3D Avançado sem cenário | 210.202; 61.269 | 210.265; 61.234 | 210.300 (igual); 61.400 (igual) |

O gzip do Linux desce com a medida do CI do commit (o teste a registra no log): até lá ficam os
tetos de antes, que a medida nova não alcança. Na revisão do lote 6, o Jogo 3D ganhou 44
caracteres (a carga por regiões segue quem começou no cenário quando a câmera não segue ninguém),
dentro dos tetos novos.

## A GPU em 10 recomeços (descarte medido)

`e2e/engine-gpu-cycles.spec.ts` (config própria, `playwright.engines.config.ts`, e workflow
`studio-engines.yml`: esperas fixas sobre a GPU emulada não entram na suíte que barra o merge). Os
motores 3D não expõem as contas do renderer, então o teste conta os objetos do próprio WebGL: um
script, em todo quadro da página, embrulha criar e apagar de buffers, texturas, programas, shaders,
framebuffers, renderbuffers e vertex arrays. Os VIVOS ficam guardados por contexto (apagar duas
vezes, ou apagar o que não é dele, não desconta nada) e os CRIADOS são somados; contexto perdido
sai da soma dos vivos. Cada jogo é reiniciado 10 vezes no mesmo documento, pelo caminho do motor
(`SZGame3D.restart`, `SZWorld3D.restart`, e no 3D Avançado o "jogar de novo", do menu para
jogando), e a API tem de existir. Critério:
- os quatro últimos recomeços com as mesmas contas vivas (um vazamento por recomeço cresce a cada
  um) e no máximo uma passagem com alguma conta subindo (a troca de qualidade);
- no Jogo 3D e no 3D Avançado o recomeço RECRIA a cena: os criados sobem a cada ciclo (senão contas
  iguais provariam só que nada aconteceu);
- o último ciclo tem contexto e objetos vivos.

| Jogo | Ao abrir (buffers/texturas/programas/framebuffers/VAOs) | 1º recomeço | 10º recomeço | Buffers criados (1º → 10º) |
|---|---|---|---|---|
| Jogo 3D, Cubo girando | 4/7/2/4/2 | 4/7/2/4/2 | 4/7/2/4/2 | 8 → 44 |
| Jogo 3D, Meu herói do Molda (modelo .glb) | 17/11/6/4/8 | 16/11/7/4/7 | 16/11/7/4/7 | 33 → 177 |
| Mundo 3D, Meu Mundo, qualidade fixa em alta | 92/21/16/15/109 | igual | igual | 92 → 92 |
| Mundo 3D, Meu Mundo, qualidade fixa em desempenho (CI Linux, run 44944417041) | 88/11/18/4/133 | igual | igual | 97 → 97 |
| Jogo 3D Avançado, Defesa da Torre | 11/10/6/4/8 | 29/10/6/4/14 (os caches se enchem) | 29/10/6/4/14 | 37 → 73 |

- **O Mundo 3D recomeça "leve", no lugar**: reposiciona corpos e moedas sem criar nem apagar objetos
  do WebGL (os criados não sobem, em "alta" e em "desempenho"). Ele prova só esse recomeço, não um
  descarte. Em "desempenho" (o nível mais leve da seleção pública), o pós-processamento já sai na
  abertura (framebuffers 15 para 4, texturas 21 para 11) e entram as variantes leves dos materiais
  (+2 programas, +24 VAOs); depois, nada muda nos 10 recomeços.
- **Correção de 21/11/2026:** a primeira versão desta tabela tinha uma linha "qualidade fixa em
  leve", medida com um nome de nível que a seleção pública não reconhece. A troca que ela mostrava
  no 10º recomeço era a qualidade adaptativa caindo sozinha (a sonda de quadros por segundo, sem
  placa de vídeo), não o nível pedido. Outra frente corrigiu o teste para "desempenho" (`d2b6ef238`)
  e a linha acima é a do CI com ele; a linha antiga do `windows-local.json` desta pasta não vale.
- **Sabotagem**: tirar o descarte dos efeitos e dos moldes do 3D Avançado reprova (os vivos crescem
  4 buffers e 2 VAOs por recomeço). Revisão do lote 4: a primeira versão desta evidência tinha sido
  gravada DEPOIS da rodada de sabotagem e mostrava esse crescimento; o arquivo foi refeito, e agora
  o relatório leva o SHA e se havia mudança sem commit, e uma sabotagem grava em outro arquivo
  (`STUDIO_GPU_CYCLES_OUTPUT`).

Evidência: `evidencias/motores-gpu-2026-11-21/windows-local.json` (SHA `74c852e78`, árvore limpa;
Chromium 159 sem placa de vídeo;
o Parar e Rodar, que troca o documento, já é medido na `preview-resource-release.spec.ts`).

## Desenhar sprites fora do palco (medido antes de mexer)

`e2e/engine-2d-offscreen.spec.ts` (a mesma config própria): o runtime do Jogo 2D numa página em
branco, 400 sprites (o teto de um grupo; metade com imagem, conferido pela contagem de `drawImage`:
200 por quadro), o tempo do `drawGroup` por quadro em lotes de 100 (o relógio da página tem
resolução de 0,1 ms). No Chromium 159 desta máquina, em duas rodadas (a estação é compartilhada):
**de 1,49 a 2,27 ms por quadro** com todos dentro do palco e **de 0,28 a 0,45 ms** com todos fora. (Revisão do lote 4: a primeira rodada passava a imagem como
elemento, que o runtime não aceita, e media só retângulos de cor: 0,33 e 0,15 ms.)

Recortar quem está fora economizaria de 0,3 a 0,45 ms por grupo cheio fora da tela num computador
de mesa (num aparelho modesto, que é 4 a 6 vezes mais lento, de 1 a 3 ms: uma fatia real do quadro num mundo
grande com vários grupos). **O recorte não entrou neste lote**, por um motivo do código: o
`drawSprite` muda estado do quadro além de desenhar (o piscar de quem tomou dano diminui a cada
desenho, a ordem de pintura que o clique usa é carimbada ali, o texto de um sprite é medido ali).
Pular quem está fora congelaria o piscar de um inimigo fora da tela e mudaria o jogo da criança,
num motor que os cursos protegidos usam. Fazer direito pede separar o estado do quadro do desenho,
com as aulas conferidas no navegador: fica registrado como pendente. Evidência:
`evidencias/motores-gpu-2026-11-21/sprites-fora-do-palco-windows.json`.

**Feito no lote 8 da conclusão (22/11/2026).** O `drawSprite` se dividiu: o estado do quadro
(piscar, ordem de pintura, medida do texto) continua a cada quadro para todos, e só o desenho é
pulado para quem está fora do retângulo do mundo visto pela transformação do contexto (margem de
64 px mais o maior lado; com rotação ou inclinação, nada é recortado). Testes:
`game-2d/__tests__/offscreenCulling.test.ts` (400 fora não desenham, piscar, ordem de pintura que o
clique usa, câmera, DPR e rotação); `e2e/engine-2d-offscreen.spec.ts` conta os desenhos do canvas:
0 com os 400 fora, 400 com eles dentro. O ganho de TEMPO num computador de mesa é pequeno (0,275
para 0,2 a 0,25 ms por grupo cheio fora), porque o Chromium já descartava quase todo desenho fora
da tela; a régua de tempo sozinha passaria sem o recorte, e por isso a prova conta desenhos.

## O que falta na seção 8, sem enfeite

- **Regiões e streaming genéricos** (8.3): nos três motores 3D, feito nos lotes 5 a 7b da conclusão
  (22/11/2026), pela proposta que ela aprovou em 21/11: a carga por regiões do cenário do Molda
  (no motor dos cenários e no SDK, nunca nos motores) e o bloco "Quando … entrar na região". No 2D
  não há carga genérica por regiões: há as cenas do Pinta ligadas por portas, com os destinos
  prontos antes de passar e o cache de 8 cenas (lote 8), e o jogo D liga as entidades de cada
  região pelo programa.
- **Recorte das instâncias de conjunto das cenas do Pinta**: pede a caixa real do conteúdo de cada
  conjunto, calculada ao preparar a cena (os objetos de arte já são recortados, `719fade30`).
- **Jogos de homologação D e E**: feitos. O jogo D no lote 8 da conclusão
  (`evidencias/jogo-d-2026-11-22/`); o jogo E, com as regiões 3D, nos lotes 5 a 7, com um mundo de
  384 m em vez de 1 km (`evidencias/jogo-e-regioes-2026-11-22/`). Os dois estão nas seções D e E de
  [`homologacao-a-h.md`](homologacao-a-h.md).
- **Instancing no Jogo 3D e no 3D Avançado**: só se um perfil apontar.
