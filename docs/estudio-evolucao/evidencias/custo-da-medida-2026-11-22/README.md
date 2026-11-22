# Custo das abas Desempenho e Investigar (22/11/2026)

Lote 3 da conclusão do plano de evolução do Estúdio. A proposta aprovada dos painéis
([`../../paineis-proposta.md`](../../paineis-proposta.md)) diz: "O custo da medida fica abaixo de 5%
do quadro, conferido por teste antes de ligar". Até aqui a frase não tinha prova.

## Como se mede

`packages/studio/e2e/devtools-cost.spec.ts` (config `playwright.engines.config.ts`, workflow
`studio-engines.yml`, fora da suíte que barra o merge), no Chromium completo, onde a prévia roda em
outro processo:

- Três braços alternados na mesma rodada, cada um num documento novo da prévia: a gaveta fechada (o
  documento de sempre), a medida do Desempenho ligada e o Investigar ligado. A gaveta fechada é
  medida duas vezes por rodada (antes de cada braço).
- Em cada janela de 4 s, depois de 2,5 s de aquecimento: o tempo de tarefa do processo do jogo
  (`Performance.getMetrics` numa sessão de depuração do quadro do jogo) dividido pelos quadros que o
  navegador desenhou, contados por um relógio de `requestAnimationFrame` igual nos três braços.
- Custo = (tempo por quadro com a aba − sem a aba) ÷ 16,7 ms, na mediana das rodadas. O teste
  reprova acima de 5% e também se alguma janela tiver 10 quadros ou menos.
- Jogos: Pegue a moeda (Jogo 2D), Pong Profissional (2D Avançado), Desvie dos blocos (Jogo 3D), Meu
  Mundo (Mundo 3D) e Defesa da Torre Profissional (3D Avançado). Quando o jogo abre numa tela de
  Jogar, o teste aperta Jogar nos três braços.
- **Pro (JavaScript):** o playground não abre o Pro sem o WebContainer. A medida usa a mesma ponte
  que a prévia do Pro põe em toda página (`buildProHostBridgeScript`, do core) sobre um jogo de canvas
  sintético (300 retângulos andando), numa prévia com sandbox, ligando e desligando a medida no mesmo
  documento. No Pro a medida não recarrega o jogo, e o Investigar é o ouvinte de erro que a prévia já
  tem sempre.
- **Python (Pygame Zero, Turtle e Raylib):** `e2e-runtime/python-devtools-cost.spec.ts`, na suíte
  Python da homologação (`playwright.mission-python.config.ts`, job `python-browser-isolation` do
  `studio-mission.yml`). No Python a medida roda no quadro e o Investigar roda no worker, então a
  conta é a CPU de todos os processos de página (`SystemInfo.getProcessInfo`), com o laço real da aba
  Investigar (`runPythonInvestigation`, lendo as variáveis a cada meio segundo). O servidor de provas
  Python exige Bun 1.4 no Windows, então esta parte só roda no CI (Linux). Custo = (CPU por
  segundo com a aba − sem) ÷ 1000 ms, na mediana das rodadas; o teste reprova acima de 5%.

## Resultado (local, Windows, Chromium completo, 3 rodadas)

Medido sobre `5482c2778` com o teste ainda sem commit (`resultado-local.json`). Mediana das rodadas,
em porcentagem do quadro de 16,7 ms:

| Motor | Jogo | Desempenho | Investigar | Gaveta fechada (ms por quadro) |
|---|---|---|---|---|
| Jogo 2D | Pegue a moeda | −0,06% | −0,23% | 0,48 a 0,62 |
| Jogo 2D Avançado | Pong Profissional | 0,17% | 0,35% | 0,49 a 0,89 |
| Jogo 3D | Desvie dos blocos | −0,18% | 0,23% | 0,66 a 0,90 |
| Mundo 3D | Meu Mundo | 1,44% | 0,14% | 1,03 a 2,50 |
| Jogo 3D Avançado | Defesa da Torre Profissional | 0,36% | 0,64% | 1,23 a 1,62 |
| Pro (JavaScript) | canvas sintético com a ponte do Pro | 0,35% | não se aplica | 0,60 a 0,81 |

## Resultado do Python (CI, Linux, homologação)

Homologação 45026124308 sobre `b4acc3fd6`, job `python-browser-isolation`, nos dois Chromium da
suíte (o Chrome do canal e o Chromium do Playwright). Em porcentagem de um segundo de CPU:

| Motor | Navegador | Desempenho | Investigar |
|---|---|---|---|
| Pygame Zero | Chrome | 0,25% | 2,00% |
| Pygame Zero | Chromium | 1,00% | 1,25% |
| Turtle | Chrome | −1,25% | 1,00% |
| Turtle | Chromium | −1,75% | 1,25% |
| Raylib | Chrome | −1,00% | 1,00% |
| Raylib | Chromium | 1,50% | 1,50% |

O Investigar é o mais caro dos dois no Python (o observador lê as variáveis no worker a cada meio
segundo), e mesmo assim fica em até 2%. Os negativos são ruído, como nos jogos JavaScript.

### O que cada ambiente cobra (revisão do lote 3)

- **Jogo 2D, 2D Avançado e Pro:** reprovam acima de 5% em qualquer máquina, inclusive no CI.
- **Jogo 3D, Mundo 3D e 3D Avançado:** cobrados só com placa de vídeo. No `studio-engines.yml`
  (Linux sem placa, SwiftShader), o tempo por quadro variou de −40% a +45% entre rodadas com a
  gaveta fechada dos dois lados: o teste reconhece a GPU emulada pelo nome do renderizador e
  registra os números sem cobrar (regra 4 do guia, "emulado é emulado"). A prova dos 3D é a
  tabela acima, medida com placa de vídeo.
- **Pro:** a ponte de verdade da prévia do Pro sobre um jogo de canvas sintético, não a prévia
  real (o playground não abre o Pro sem o WebContainer).
- **Python:** cobrado na suíte da homologação (tabela acima).
- **Toda janela prova que a aba trabalhou:** o braço do Desempenho recebe as fatias da medida e o
  do Investigar recebe os estados, contados na página do editor; a gaveta fechada não recebe nada.
  O palco tem o mesmo tamanho nos três braços (no fechado, a gaveta abre na aba Mensagens).

Números negativos são ruído: a diferença entre duas janelas da gaveta fechada da mesma rodada chega
a 0,3 ms por quadro (2% do quadro) nos jogos 3D. Mesmo assim, nenhum motor chegou perto da meta.

O Investigar dos jogos 3D conta os objetos da cena (`traverseVisible`), mas só duas vezes por
segundo, na fatia da medida, e não a cada quadro: não houve o que consertar no
`three3dInvestigation.ts`.

## Prova por sabotagem

Um laço de 2 ms por quadro no relógio da medida (`devtoolsBridge.ts`, `function frame(now)`) fez o
Jogo 2D medir 11,21% no Desempenho, e o teste reprovou (`Expected: < 0.05, Received: 0.112`). O
arquivo voltou ao original depois da rodada.

## Correção de texto

`paineis-proposta.md` dizia que o Desempenho "lê uma vez por segundo"; o código lê a cada meio
segundo (`DEVTOOLS_PERF_SLICE_MS`, 500 ms). O texto foi corrigido.
