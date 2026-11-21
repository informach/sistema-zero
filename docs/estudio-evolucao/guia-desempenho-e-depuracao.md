# Guia de desempenho e depuração do Estúdio (para a equipe)

Como medir, depurar e provar o que se afirma sobre o Estúdio Clássico e o Pro. Escrito em
21/11/2026 a partir dos scripts, testes e workflows que existem na staging. Os caminhos de código
são relativos a `packages/studio/`, salvo quando o caminho começa com `.github/` ou `packages/`.
Os números citados são exemplos com a fonte; o lugar de cada número é o documento da medida.

## 1. Regras antes de medir

1. **Medir antes de mexer, e registrar.** Todo número leva o SHA, a data, a máquina, o navegador
   (Chromium completo ou headless shell, versão) e a fixture. Sem isso ele não entra em documento.
2. **Não comparar máquinas.** Um número do Windows local não se compara com um do Linux do CI, nem
   com o de outra sessão. Antes e depois só valem na mesma máquina e na mesma rodada; nas medidas de
   abertura, os dois braços são servidos lado a lado e medidos em ordem alternada
   ([`classico-em-escala.md`](classico-em-escala.md)).
3. **Uma medida pesada por vez.** Sem servidor de desenvolvimento, typecheck ou outra suíte rodando
   junto: na estação compartilhada as rodadas variam entre si.
4. **Emulado é emulado.** CPU desacelerada no CI não é aparelho físico; a marca é "emulado"
   (seção 9).
5. **Nenhum teto sobe para um teste passar.** Os tetos de payload só descem; subir exige a
   justificativa escrita ao lado do número e a decisão da dona (seção 6).
6. **A medida não pode pesar no jogo de todo dia.** As abas Investigar e Desempenho só ligam a coleta
   quando são abertas, e o documento padrão da prévia não ganha nenhum byte. O custo da coleta (meta:
   menos de 5% do quadro) ainda não foi medido no navegador ([`mapa-da-missao.md`](mapa-da-missao.md),
   seções 9 a 11).
7. **Medida com profiler não se compara com medida sem profiler.** Iniciar o perfil de CPU dentro da
   janela medida já criou picos falsos de 100 a 250 ms
   ([`../qa/2026-11-08-python-classic-performance.md`](../qa/2026-11-08-python-classic-performance.md)).

## 2. Os workflows `studio-*.yml`

Ficam em `.github/workflows/`. Rodada registrada = a última citada nos documentos desta pasta ou
consultada em 21/11/2026.

| Workflow | Quando roda | O que mede ou confere | Artefato | Rodada registrada |
|---|---|---|---|---|
| `studio-mission.yml` (homologação integral) | sob pedido (`workflow_dispatch`) ou push numa branch `estudio-missao-*` | **contracts** (Linux e Windows): matriz dos cursos, contratos das cenas do Pinta e do Molda Cenários, armazenamento real em Chromium, WebKit e Firefox (com transação de saída abortada e o modo profundo de 10 mil blocos e migrações v1/v2/v3), cliente v3 congelado depois da migração, contratos Python com pygame-ce 2.5.7, suíte isolada do Estúdio, typecheck, diagnósticos de referência contra o esperado e o serviço de linguagem do Pro com 60 e com 1.000 arquivos. **browsers**: a suíte Playwright em Chromium (3 shards), Firefox e WebKit no Linux; no Windows, as aulas protegidas, os programas hostis, a casca, a gravação de saída e o Pro modular; mais as cenas do Pinta e as provas 2D e 3D. **isolation-measurement**: isolamento da prévia nas três engines e a casca no Firefox com o isolamento de mesa. **python-browser-isolation**: o Python no Worker de verdade. **runtime-audit** e **hosted-runtime**: imagem do runtime, build real no sandbox sem rede, Python e Three no contêiner | `studio-contracts-*`, `studio-browser-*`, `studio-isolation-measurement`, `studio-python-browser-isolation`, `studio-hosted-runtime` (14 dias) | 44860362872 em `48a8d0f05`: 12 de 12. 44904766980 em `1dd1f51c6`: 11 de 12 |
| `studio-classic-equivalence.yml` | push na staging ou PR para staging e main que mexa na abertura, na montagem sob demanda, no salvar, no script ou no `bun.lock`; sob pedido | O mesmo estado salvo e o mesmo código com e sem montagem sob demanda, com 2 mil e 10 mil blocos, depois de abrir, de editar no alto e de editar dentro da cauda; tempos de abertura e do gesto. Chromium completo | `studio-classic-opening-equivalence` (`classic-opening-equivalence.json`) | 44944817550 em `ee82d0dfd`: verde |
| `studio-engines.yml` | push na staging nos motores 3D, no runtime do Jogo 2D ou nos dois testes; sob pedido | Objetos de GPU dos três motores 3D em 10 recomeços (`e2e/engine-gpu-cycles.spec.ts`) e custo de desenhar sprites fora do palco no Jogo 2D (`e2e/engine-2d-offscreen.spec.ts`). Fora da suíte que barra o merge, porque usa esperas fixas sobre a GPU emulada | `studio-engines` (`engine-gpu-cycles.json`, `engine-2d-offscreen.json`) | 44944417041 em `d2b6ef238`: verde |
| `studio-export.yml` | push na staging em `src/export/`, nos modelos e kits do Pro ou na trava do runtime; sob pedido | No Linux e no Windows: exporta os 14 modelos do Pro e um projeto com biblioteca fora do grafo, instala numa pasta limpa e constrói duas vezes (`scripts/verify-exports.ts`); o job `compare` exige o mesmo build nas duas máquinas para os projetos com trava | `studio-export-Linux` e `studio-export-Windows` | 44944817571 em `ee82d0dfd`: verde |
| `studio-modest-device.yml` | push na staging no próprio arquivo ou em `e2e/helpers/cpuThrottle.ts`; sob pedido | **Emulado**: CPU 4x e 6x no Chromium. Clássico com 2 e 5 mil blocos, Pro modular de 60 arquivos e programas hostis. Cada passo roda mesmo que o anterior reprove (`continue-on-error`): o que importa é o número | `studio-modest-device-cpu4` e `-cpu6` | 44896882655 em `e5391751a` ([`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md)) |
| `studio-input-diagnostics.yml` | push na staging nos arquivos do diagnóstico; sob pedido | No Linux e no Windows: os jogos pesados da galeria 10 vezes cada, observando a entrada nativa ("teclado preso" nos jogos 3D sem placa de vídeo), e uma sonda com o filho bloqueado de propósito | `studio-input-*` (7 dias) | 44910663160 em `756ce2cfa` ([`isolamento-da-previa.md`](isolamento-da-previa.md)) |
| `studio-preview-dpr-diagnostics.yml` | push no próprio arquivo; sob pedido | Diagnóstico: os controles móveis do Reino Zero no celular emulado (DPR 3) com o headless shell e com o Chromium completo, para separar defeito da emulação do Chromium 159 de defeito do produto. Não muda nenhum teste | `studio-preview-dpr-*` | não registrada nesta pasta |
| `studio-runtime-image.yml` | push na staging em `packages/studio-runtime/runtime/validation-profile.json`; sob pedido | Qualifica a imagem Linux do `studio-runtime`: SDKs gerados sem mudar bytes, build da imagem, contratos reais, Python e Three no contêiner sem rede; empacota a imagem, o perfil, o SHA e a distribuição Python | `studio-runtime-image-<sha>` (3 dias) | não registrada nesta pasta |

Fora desta família, o `.github/workflows/ci.yml` roda a cada push na staging a suíte inteira do
Estúdio em Chromium (3 shards, contra o build de produção), as provas de segurança no Firefox, a
gravação de saída no WebKit e a prova de armazenamento no macOS. Estado em 21/11 em
[`homologacao-a-h.md`](homologacao-a-h.md).

## 3. Como medir, por área

Os comandos rodam dentro de `packages/studio`. Em PowerShell, troque `VAR=valor comando` por
`$env:VAR='valor'; comando`. Para usar um Chromium próprio (completo, de outra revisão), aponte
`PW_CHROMIUM`; para os objetivos de execução das aulas, `SZ_CHECK_CHROMIUM`.

### Clássico

| O que | Comando | Saída e onde ler |
|---|---|---|
| Custo de cada etapa de uma edição, sem tela (serializar, IR, diagnósticos, gerar) | `bun scripts/profile-js-classic.ts` (`SZ_PROFILE_BLOCKS`, `SZ_PROFILE_SAMPLES`, 31 por padrão; `--json` grava `{ version: 2, resultados, amostras }`). Perfil de CPU: `SZ_PROFILE_BLOCKS=5000 bun --cpu-prof scripts/profile-js-classic.ts` | p50 e p95 por etapa; [`classico-em-escala.md`](classico-em-escala.md), C0 e C1 |
| Abrir, editar e mover no navegador | `CLASSIC_SCALE_SIZES=2000,5000 bunx playwright test e2e/classic-scale.spec.ts --project=chromium --trace off` (padrão: 0, 500, 2000 e 5000) | tempo de abrir e a maior tarefa longa ao editar e ao mover |
| Abertura em dois braços e a equivalência | `SZ_CLASSIC_OPEN_URLS=adiado=http://127.0.0.1:5195,inteiro=http://127.0.0.1:5195/?montagem=inteira SZ_CLASSIC_OPEN_SIZES=2000,10000 SZ_CLASSIC_OPEN_EDIT=1 SZ_CLASSIC_OPEN_ASSERT=1 node scripts/measure-classic-opening.mjs`, com o playground servido por `E2E_PORT=5195 node scripts/serve-e2e.ts`. Também: `SZ_CLASSIC_OPEN_REPEATS`, `SZ_CLASSIC_OPEN_OUTPUT`, `SZ_CLASSIC_OPEN_TIMEOUT_MS`, `SZ_CLASSIC_OPEN_CPU_PROFILE=1` e `SZ_CLASSIC_OPEN_EDIT_PROFILE=1` | JSON gravado a cada amostra; `{"ok":true}` quando estado e código saem iguais nos dois braços e os braços seguiram caminhos diferentes |
| Montagem sob demanda no Blockly de verdade, nas três engines | `bunx playwright test --config e2e/offscreen-lifecycle.config.ts --project=chromium` (ou `firefox`, `webkit`) | estado, posição e tamanho iguais entre o workspace normal e o adiado |
| As aulas protegidas | `SZ_CHECK_CHROMIUM=<chromium> bunx playwright test e2e/protected-lessons.spec.ts --project=chromium --trace off` | 399 gestos, 66 objetivos, 13 referências de código. Regravar referências (`PROTECTED_LESSONS_UPDATE=1`) ou a matriz (`--gravar`) é admitir mudança no que foi ensinado: só com decisão dela |

Fixtures do playground: `/aula?aula=desafio-primeiro-jogo/desafio-dia-3&escala=N` repete os eventos
do Farol até N blocos; `&forma=sequencia` faz a sequência única; `&marca=1` põe a "marca do fim"
na última instrução; `?montagem=inteira` desliga a abertura adiada e a montagem sob demanda
(`blockly/offscreenThreshold.ts`, `setOnDemandMountingForTests`).

### Pro

| O que | Comando | Saída |
|---|---|---|
| Digitar, abrir painel, gaveta, primeira resposta da busca, diagnósticos entre arquivos e as operações do editor, no projeto modular de 60 arquivos | `bunx playwright test e2e/pro-workspace-performance.spec.ts --project=chromium --grep modular --trace off` | relatório com SHA e amostras em `pro-modular-current.json`, ou em `STUDIO_BROWSER_BENCH_OUTPUT` |
| Tudo ligado ao mesmo tempo (análise, jogo, pergunta ao Zappy em voo, painéis, busca, arquivo criado e renomeado, 10 ciclos de Parar e Rodar) | o caso "tudo ligado ao mesmo tempo" do mesmo arquivo | [`pro-em-escala.md`](pro-em-escala.md); o Zappy ali é um adaptador de teste que responde em 1,5 s |
| O serviço de linguagem sem tela | `bun --no-env-file scripts/measure-pro-modular.ts --output=.cache/mission/pro-modular-language.json` (`STUDIO_PRO_LANGUAGE_FILES=1000` para mil arquivos; `STUDIO_PRO_LANGUAGE_SAMPLES`) | edição e diagnóstico por arquivo; não mede digitação |
| WebContainer com uma dependência de verdade | `bunx playwright test --config playwright.pro-full.config.ts` (sob demanda: precisa de rede para o npm) | `npm install`, prévia, `npm run build` e recarga |
| Exportação reproduzível | `bun scripts/verify-exports.ts --output=.cache/export-proof.json` | hash SHA-256 de caminhos e bytes de cada build |

### Prévia e isolamento

| O que | Comando | Saída |
|---|---|---|
| Atraso do relógio do editor e clique com o filho travado 5 s, por arranjo de iframe | `SZ_MEASURE_BROWSERS=chromium,firefox,webkit node scripts/measure-preview-isolation.mjs --json`. Para o Firefox com o isolamento de mesa: `SZ_MEASURE_FIREFOX_SITE_ISOLATION=1 SZ_MEASURE_HOST_POLICY_SPLIT=1 SZ_MEASURE_ARRANGEMENTS=srcdoc,outro-site`; depois `node scripts/check-shell-isolation.mjs <arquivo>.json` reprova se a casca não isolar | isolado = abaixo de 500 ms ([`isolamento-da-previa.md`](isolamento-da-previa.md)) |
| Os programas hostis | `bunx playwright test e2e/preview-hostile-programs.spec.ts --project=chromium` (prévia direta) e `e2e/preview-shell-hostile.spec.ts --project=chromium` ou `--project=firefox` (casca) | o editor responde e salva, o Parar para em menos de 5 s e o conserto roda |
| Liberação de recursos do lado do jogo | `bunx playwright test e2e/preview-resource-release.spec.ts --project=chromium` (Chromium completo) | CPU rodando e parado, documentos no processo da prévia depois de 1 e de 10 ciclos, memória do jogo |

Sem `--trace`: o gravador do Playwright espera o iframe preso, e com ele os passos ficam lentos
enquanto o programa hostil roda (o trabalho síncrono de 30 s foi de 18 s para 37 s de teste).

### Motores

| O que | Comando | Saída |
|---|---|---|
| Linha de base dos cinco motores (abrir, editar, rodar e memória depois de 10 ciclos de Parar e Rodar) | `bunx playwright test e2e/engine-baseline.spec.ts --project=chromium` | registro, não teto: `.cache/mission/engine-baseline.json` ou `STUDIO_ENGINE_BASELINE_OUTPUT` |
| GPU em 10 recomeços e sprites fora do palco | `bunx playwright test --config playwright.engines.config.ts` | `.cache/mission/engine-gpu-cycles.json` (ou `STUDIO_GPU_CYCLES_OUTPUT`) e `engine-2d-offscreen.json`; [`motores-inventario.md`](motores-inventario.md) |

### Python

| O que | Comando | Saída |
|---|---|---|
| Editor de blocos e prévia do Python clássico (tarefas longas, intervalo de desenho, áudio) | `node scripts/profile-python-classic.mjs current`, com os servidores locais de qualificação ativos; `PERF_TRACE=1` com `trace` para o diagnóstico com tracing, separado | `.cache/python-classic-performance/` |
| Portões de desempenho dos jogos Python (F1, F3, Space Arena) | ver `e2e-runtime/PERFORMANCE.md` | não rodaram nesta missão |
| O Python no Worker de verdade | `bunx playwright test --config playwright.mission-python.config.ts` (precisa da distribuição: `bun packages/studio/scripts/build-python-runtime.ts`, da raiz) | supervisor, provedor, isolamento, jogos e mundos do Pinta |

O custo do interpretador, do transporte dos quadros, da renderização e do editor medidos
separadamente, pedido pela seção 17 (G), ainda não tem instrumento.

### Aparelho modesto emulado

Os testes que chamam `applyCpuThrottle` (`e2e/helpers/cpuThrottle.ts`), hoje
`classic-scale.spec.ts`, `pro-workspace-performance.spec.ts` e `preview-hostile-programs.spec.ts`,
aceitam `STUDIO_CPU_THROTTLE` de 1 a 20: `STUDIO_CPU_THROTTLE=6 bunx playwright test
e2e/classic-scale.spec.ts --project=chromium`. No Firefox e no WebKit a emulação não existe.

## 4. Depurar com as abas Investigar, Desempenho e Meus testes

As três abas moram na gaveta e saíram pela proposta aprovada em 20/11/2026
([`paineis-proposta.md`](paineis-proposta.md)). Para quem usa, os nomes e o passo a passo estão em
[`manual-classico.md`](manual-classico.md) e [`manual-pro.md`](manual-pro.md). Aqui, o que cada
executor permite e como funciona por trás.

### O que cada executor permite hoje

| Executor | Pausar e Avançar 1 quadro | Valores agora | Caminho até o erro | Desempenho | Meus testes |
|---|---|---|---|---|---|
| Jogo 2D | sim (`SZGame2D.pauseGame`) | sim | sim, com o bloco | quadros, tempo do quadro, sprites desenhados | no navegador, palco escondido; clique em sprite de grupo |
| Jogo 2D Avançado | sim, pelo estado "pausado" do motor, só com a partida rolando | sim | sim | quadros, tempo do quadro, personagens desenhados depois do recorte da câmera | no navegador |
| Jogo 3D, Mundo 3D, Jogo 3D Avançado | sim (`_paused` ou "pausado"), só com a partida rolando; pela variante `investigar` do motor | sim | sim | quadros, tempo do quadro, "Objetos na cena", "Desenhos por quadro" | no navegador |
| Página de HTML e CSS | não | sim | sim | "Esta página não tem quadros de jogo para medir." | o texto da página e as mensagens |
| Python com Turtle, Pygame Zero, pygame-ce ou Raylib | sim, na troca de quadro (precisa da distribuição nova do runtime) | sim (observador das missões) | sim (traceback, arquivo e linha) | quadros e tempo do quadro | testar o programa (o passo de tecla precisa da distribuição nova) e testar uma função |
| Python sem biblioteca de jogo | não | no fim do programa | sim | o tempo do programa | testar uma função |
| Pro em JavaScript | não | não | sim, com arquivo e linha | quadros e tempo do quadro | no servidor: testar o jogo e testar uma função exportada |
| Python Pro | as abas Investigar e Desempenho não entram | | Problemas | | |

Em nenhum executor existe breakpoint nem passo a passo por linha (fora da proposta aprovada). Não
apresente o caminho até o erro como depurador por linha, nem os verificadores dos cursos como
testes do aluno ([`capacidades-dos-runtimes.md`](capacidades-dos-runtimes.md)). A memória do jogo
fica "indisponível" em todos: o navegador não a informa.

### Como funciona por trás

- **Ligar só quando a aba abre.** A ponte da prévia (`preview/devtoolsBridge.ts`) é baixada só
  quando a criança liga Investigar ou Desempenho e entra como script confiável depois dos motores.
  Fechar a gaveta desliga. No clássico, ligar recomeça o jogo com a ponte.
- **Desempenho**: lê uma vez a cada meio segundo o que os motores já contam. O Jogo 2D conta os
  sprites desenhados entre duas "Limpar a tela" (`drawn`, no inspetor `game-2d:observation`); o 2D
  Avançado usa a porta opt-in dos inspetores; os três 3D usam a variante `investigar`
  (`official-extensions/three3dInvestigation.ts`), que a prévia só pede com uma aba ligada, porque
  os tetos dos 3D não têm folga; o Python conta os quadros pintados (`paintedFrames`) e manda a
  mensagem `perf` do protocolo do quadro; o Pro usa `sz:perf` na ponte que a prévia já injeta
  (`buildProHostBridgeScript`, `modes/pro/proPreviewDevtools.ts`).
- **Valores agora**: o mesmo leitor dos objetivos das aulas (`check/instrumentCheckScript.ts`), que
  só entra no jogo com a aba ligada e não muda o número das linhas. No Python, o observador das
  missões. Os valores vêm por `postMessage` de um quadro sem `allow-same-origin` e podem ser
  forjados pelo programa: servem para depurar, nunca para dar nota.
- **Pausar**: a pausa que cada motor já tem, chamada pela ponte; no Python, o quadro segura a
  resposta do próximo quadro pintado (`hold: true`, `framePause.ts`). O programa da criança não
  muda. Parar encerra o worker inteiro: uma pausa nunca deixa o executor preso.
- **Caminho até o erro**: o erro que o jogo já informa, com cada linha da pilha ligada ao bloco pelo
  mapa de blocos (`generators/sourceMap.ts`); no Pro, `sz:pro-error`, no máximo 20 por página.
- **Meus testes**: o formato e o julgamento dos objetivos das aulas (`SectionExecutionRule` e
  `judgeExecutionObservation`, de `packages/core/src/learning/project-execution.ts`). No clássico,
  o executor (`studentTests/`) monta o documento da prévia num quadro escondido, com o leitor e um
  piloto de teclas e cliques; a prévia entrega a fábrica do documento
  (`state/previewDocumentFactory.ts`), que grava o projeto antes, como o Rodar. No Python,
  `studentTests/pythonRunner.ts`. No Pro, `POST /members/studio/student-tests` no mesmo executor do
  "Verificar projeto", em lotes de até 8 testes e 40 s. Os testes ficam no campo `studentTests` do
  projeto (até 20); o Members confere o envio pelo esquema do documento, então ele sai com o
  esquema novo antes do Kids, da comunidade e do member-shell.
- **A distribuição Python.** A pausa e a tecla nos testes do Python dependem do quadro da
  distribuição publicada do runtime, que nenhum CI publica. No staging de 21/11 a distribuição nova
  estava ativa e a pausa funcionou num projeto novo
  ([`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md)). Com uma
  distribuição antiga, a aba diz que o Python ainda não pausa pelo Estúdio.

### Conferir as abas no staging

Os quadros dependem de a janela do navegador estar visível. Em 21/11, com o Chrome conectado numa
janela coberta, a página recebia de 4 a 5 quadros em 2 segundos: o jogo andava a cerca de 1 quadro
por segundo e a pausa não chegava. Antes de concluir que a aba falhou, confira quantos
`requestAnimationFrame` a página recebe; com a janela visível foram 121 em 2 segundos. As
conferências que dependem de eventos e relógios (teclas, foco, programa hostil, Parar) valem mesmo
com a janela coberta.

### O Zappy com as abas

Com Investigar ou Desempenho ligada, a pergunta ao Zappy leva o que a aba mostra naquele instante
(até 20 valores, os números dos cartões, as abas ligadas), cortado nos tetos do servidor, com os
segredos limpos e com teto de 3.000 caracteres no pedido. O Zappy é orientado a usar só esses
valores e a apontar uma causa provável de lentidão sustentada pelos números. Nada é observado sem
pergunta ([`zappy-e-as-abas.md`](zappy-e-as-abas.md)).

## 5. Tetos e limites que a medida protege

### Catracas de payload (só descem)

| O que | Teto | Onde |
|---|---|---|
| Documento da prévia (Reino Zero) | 790.000 bytes | `e2e/reino-zero-performance.spec.ts` |
| Pacote de abertura do modo Blocos | 4.750.000 bytes crus, 1.450.000 gzip, 20 arquivos | `src/projects/__tests__/initialBundleBudget.test.ts` (`MODE_BUDGETS`) |
| Lista inicial de projetos | 380.000 bytes crus, 120.000 gzip, 10 arquivos | o mesmo arquivo |
| Rota do editor | 5.000.000 crus, 1.600.000 gzip, 20 arquivos | o mesmo arquivo |
| Jogo 2D sem cenário | 369.500 bytes, 96.000 gzip | `official-extensions/game-2d/__tests__/bundle.test.ts` |
| Jogo 2D e Jogo 2D Avançado com cenário do Pinta | 397.000 e 437.000 caracteres | `MAP_TWO_D_FULL_BOOTSTRAP_MAX_CHARS` em `official-extensions/map-2d/bootstrap.ts` |
| Jogo 2D Avançado | 415.000 caracteres, 124.000 gzip | `official-extensions/game-2d-advanced/__tests__/runtimePayload.test.ts` |
| Jogo 3D (completo / sem cenário / sem Kit e sem cenário / sem Kit, com cenário) | 248.900 / 241.800 / 207.700 / 214.800 caracteres | `official-extensions/runtimePayloadBudget.test.ts` |
| Mundo 3D (completo / sem cenário) | 357.450 / 350.000 caracteres | o mesmo arquivo |
| Jogo 3D Avançado (completo / sem cenário) | 217.950 / 210.300 caracteres | o mesmo arquivo |

O gzip dos 3D tem teto próprio no Linux e no Windows (o Bun comprime diferente nas duas), escrito
ao lado de cada entrada de `runtimePayloadBudget.test.ts`, com o valor medido no Linux. Quando um
motor encolhe, o teto desce junto, no mesmo commit. O precedente do que não fazer está no achado T1
de [`revisao-2026-11-20.md`](revisao-2026-11-20.md): quatro tetos do 3D subiram para um teste passar
e foram desfeitos com a decisão da dona. Para caber, o caminho é tirar peso que não serve (o Jogo 2D
deixou de mandar 54,7 KB de comentários de bloco) ou mandar o código só a quem usa (a variante
`investigar`, o fragmento do cenário só no jogo com cenário).

### Limites do projeto

- **Pro**: 80 arquivos de código, 256 mil caracteres por arquivo e 1,5 milhão no total
  (`STUDIO_PRO_BUILD_LIMITS`), os mesmos no editor (quando o host declara), no BFF, no Worker e na
  execução leve; o artefato vai até 338 arquivos e 2,5 MB (`STUDIO_PRO_ARTIFACT_LIMITS`). Uma
  operação com arquivos mexe em até 24 arquivos. Nenhum desses foi aumentado
  ([`pro-em-escala.md`](pro-em-escala.md)).
- **Clássico**: a montagem sob demanda entra a partir de 1.500 blocos e a busca no programa a partir
  de 300 (`blockly/offscreenThreshold.ts`).
- **Motores**: 400 sprites por grupo, 80 partículas por emissão e 400 na tela no Jogo 2D; 1.000
  faíscas no 2D Avançado; 120 faíscas por explosão, 300 por efeito e 64 enfeites no 3D Avançado.
  Cada teto avisa uma vez por partida no console do jogo ([`motores-inventario.md`](motores-inventario.md)).
- **Guardas da prévia**: laço cortado em cerca de 4 s, vigia de batimentos de 6 s, console limitado a
  180 mensagens por segundo ([`depuracao-matriz.md`](depuracao-matriz.md)).
- **Meus testes**: até 20 testes, 15 segundos por teste, segurar até 5 s, esperar até 10 s, 8 casos
  num teste de função.

## 6. Como provar por sabotagem

Um teste verde só prova algo se ficar vermelho quando o conserto sai. O procedimento usado na missão:

1. Rode o teste com o conserto e veja verde.
2. Desfaça só a linha do conserto (ou troque um número, um texto, um z-index) e rode de novo.
3. Confirme o vermelho **pela razão certa**: a mensagem do teste tem de apontar o defeito, não um
   erro qualquer.
4. Volte o conserto, e registre a sabotagem no commit ou no documento ("vermelho antes, verde
   depois", "provado por mutação").
5. Grave a evidência da rodada sabotada em outro arquivo. No teste da GPU isso é
   `STUDIO_GPU_CYCLES_OUTPUT`: na revisão do lote 4, o JSON tinha sido copiado depois da rodada de
   sabotagem e contradizia o documento. Desde então o relatório leva o SHA e diz se a árvore tinha
   mudança sem commit.

Exemplos que ficaram registrados:

| Teste | Sabotagem | Resultado |
|---|---|---|
| `e2e/protected-lessons.spec.ts` | o texto "Deixar o sprite … com … % de visibilidade" trocado para "Tornar o sprite…" | a aula 1 do Cadê reprova no gesto 14, com a frase do robô ([`README.md`](README.md)) |
| `e2e/engine-gpu-cycles.spec.ts` | tirar o descarte dos efeitos e dos moldes do 3D Avançado | os objetos vivos crescem 4 buffers e 2 VAOs por recomeço |
| `e2e/preview-resource-release.spec.ts` | o Parar antigo, que trocava o iframe | 9 documentos no processo da prévia contra 1 |
| O recado "Não deu para abrir estes blocos" | o z-index antigo | o e2e reprova: o recado ficava atrás da paleta |
| O comparador da `jsonPlainCopy` | um comparador que ignora `undefined` | o teste novo mostra que o antigo não mordia |

Duas armadilhas que a missão já pagou:

- **O vácuo.** Contas iguais podem só provar que nada aconteceu. Por isso o teste da GPU exige que
  os objetos criados subam a cada recomeço nos motores que recriam a cena, e a equivalência do
  Clássico exige que os dois braços tenham seguido caminhos diferentes.
- **O teste que passa pela cópia.** Um teste que refaz à mão a fiação do código testa a própria
  cópia. O teste dos contratos passou a abrir pelo caminho de produção (`sanitizeStoredProject`);
  sem a trava, os três casos de recusa reprovam.

## 7. Onde guardar a evidência

- `docs/estudio-evolucao/evidencias/<tema>-<data>/`, com o nome da máquina no arquivo
  (`windows-local.json`, `linux-ci-<run>.json`, `linux-homologacao.json`).
- O JSON leva o SHA, a data, o navegador e as amostras; os scripts da missão já gravam assim
  (`STUDIO_BROWSER_BENCH_OUTPUT`, `SZ_CLASSIC_OPEN_OUTPUT`, `STUDIO_ENGINE_BASELINE_OUTPUT`).
- Evidência de CI vai nos artefatos da rodada; quando entra num documento, o JSON é copiado para a
  pasta de evidências com o número da rodada.
- Número sem evidência bruta versionada é dito assim no documento (como a abertura de 5 mil blocos
  de 16,7 a 17,8 s para 13,9 a 14,0 s, de 19/11, em [`classico-em-escala.md`](classico-em-escala.md)).

## 8. Chromium completo e headless shell

- A medida de processo e de isolamento usa o **Chromium completo** (`PW_CHROMIUM` apontando o
  executável do `playwright-core`). O headless shell padrão do Playwright não serve para isso.
- O headless shell **cai** com a cadeia aninhada inteira de blocos desenhada (arrastar uma área com
  5 mil blocos na base, abrir 6 mil ou 10 mil). Por isso o `studio-classic-equivalence.yml` usa o
  Chromium completo.
- O Firefox do Playwright desliga os iframes em outro processo
  (`fission.webContentIsolationStrategy = 0`). Para medir como o Firefox de mesa, use
  `SZ_MEASURE_FIREFOX_SITE_ISOLATION=1`
  ([`../qa/2026-11-20-studio-firefox-site-isolation.md`](../qa/2026-11-20-studio-firefox-site-isolation.md)).

## 9. O que é emulado e o que não é

| Emulado | Como | O que não cobre |
|---|---|---|
| Aparelho modesto | CPU do editor desacelerada pelo CDP (`Emulation.setCPUThrottlingRate`), 4x e 6x, só no Chromium (`studio-modest-device.yml`) | Firefox e WebKit; o processo do jogo (não é desacelerado); placa de vídeo; memória limitada |
| GPU | os runners do CI não têm placa de vídeo: o 3D é desenhado por software | quadros por segundo de um computador comum; o "teclado preso" do 3D no Windows vem daí ([`isolamento-da-previa.md`](isolamento-da-previa.md)) |
| Celular | viewport e DPR emulados no Playwright | no Chromium 159 do Linux, a emulação com DPR 3 divide o documento do Reino Zero pelo DPR; o `studio-preview-dpr-diagnostics.yml` separa isso de defeito do produto |
| Isolamento do Firefox de mesa | a preferência `fission.webContentIsolationStrategy: 1` devolvida ao Firefox do Playwright | o Firefox de Android |
| Zappy no ensaio do Pro | um adaptador de teste que responde em 1,5 s | o modelo de verdade, a rede e os créditos |

Nenhum aparelho físico foi usado, por decisão da dona (seção 16 da missão). Número emulado é escrito
como "emulado, não conferido em aparelho físico".

## 10. O que ainda não tem medida

- O custo da coleta das abas Investigar e Desempenho (meta abaixo de 5% do quadro).
- O custo do interpretador Python, do transporte dos quadros, da renderização e do editor, cada um à
  parte.
- A gravação no IndexedDB com 10 mil blocos no Estúdio livre.
- Quadros por segundo dos jogos 3D numa máquina com placa de vídeo, e os 30 quadros por segundo em
  qualidade leve que a seção 16 propõe.
- O jogo 2D extenso e o 3D de exploração da seção 17 (D e E), que dependem das regiões.
- O áudio do jogo, separado do áudio do próprio editor: o Blockly mantém `AudioContext` próprios
  ligados, que gastam cerca de 14 ms por segundo com o jogo parado no Playwright
  ([`isolamento-da-previa.md`](isolamento-da-previa.md)).
