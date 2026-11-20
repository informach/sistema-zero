# Depuração, desempenho e testes do aluno: o que cada executor permite hoje (20/11/2026)

Etapa 9 do plano de 20/11, parte 1 (por trás, sem interface). Levantamento só de leitura do código
na staging de 20/11. **E** existe · **P** parcial · **N** não existe · **?** não confirmado.
Prefixos: `S:` = `packages/studio/src/`, `OE:` = `S:official-extensions/`, `PY:` = `S:runtime/python/`,
`RT:` = `packages/studio-runtime/`, `CO:` = `packages/core/src/`.

**Resumo:** nenhum executor tem hoje pausa comandada pelo Estúdio, passo a passo nem leitura de
variáveis durante a prévia. Já funciona: erro → linha → bloco no Clássico, no Jogo 2D e no Python, e
leitores e contadores escondidos atrás de opções que o editor não liga.

## 1. Depuração

| Executor | Pausar | Passo | Valores | Pilha | Erro → linha | Linha → bloco |
|---|---|---|---|---|---|---|
| Clássico (iframe) | N (só Rodar/Parar) | N | N na prévia; leitor só no executor (`S:check/serverCheck.ts`) | P: texto do `err.stack` (`S:preview/interceptors.ts`) | E: `onerror` → `errorAt` → `runtimeMark` | E: mapa por `__id` (`S:generators/sourceMap.ts`, `S:hooks/useCrossHighlight.ts`) |
| Jogo 2D | P: `pauseGame`/`resumeGame` da criança; o Estúdio não comanda | N (quadro fixo de 60 Hz, `OE:game-2d/runtime/lifecycle.ts`) | P: inspetor `game-2d:observation`, desligado por padrão | P | E: `__szReportCaughtError` | E |
| Jogo 2D Avançado | P: estado `pausado` | N | P: inspetores `campaign/perf/rpg/battle` desligados | N para erros apanhados (viram aviso) | P: só não apanhados | E |
| Jogo 3D | P: `_paused` pelas regras | N | N (só `__szModelosPendentes`) | P | P | E |
| Mundo 3D / 3D Avançado | P / ? | N | N | P | P | E |
| Python (núcleo) | N (`playback: stop-only`; o contrato `pausable` já existe em `S:runtime/types.ts`) | N (sem `sys.settrace`) | P: REPL só depois do fim; observador só em missão | P: traceback no `diagnostic` | E | E: `blockAtLine` |
| Turtle, Pygame Zero, pygame-ce, Raylib | = núcleo | = | P: checkpoints por quadro só em missão | = | E | E |
| Pro WebContainer | N | N | P: `__studioGame.inspect()` só nos kits, o Estúdio não lê (outra origem) | P: stack pelo `preview-message` | N (`errorAt` existe no tipo, ninguém preenche) | n/a |
| Pro hospedado | N | N | N | N? (só a ponte de console) | N (build com `sourcemap: false`) | n/a |
| Executor dos objetivos | N | P: passos de entrada | E: leitor `S:check/instrumentCheckScript.ts` lido por CDP | P: `pageerror` curto | N | N |
| Executor de missão Python | N | P: passos | E: `PY:mission-observer.py` | P | E | n/a |

**Caminho mais curto e seguro:**
- **Pausar/continuar:** ponte por `postMessage`, só com o painel ligado, que chama a pausa que cada
  runtime já tem (`pauseGame`, `pausado`, `_paused`, `projectRunContext.pause`). Nas bibliotecas Python,
  o Estúdio segura a resposta do quadro (`nextFrame`). O código da criança não muda.
- **Passo a passo:** por quadro (um `_runSimulationFrame` do Jogo 2D ou uma resposta de quadro no
  Python). Por bloco: gravar um rastro (instrumentação pela árvore sintática, só no caminho da prévia)
  e andar na REPRODUÇÃO, não na execução. Python núcleo: `settrace` + `run_sync` atrás de uma opção.
- **Valores:** reaproveitar `instrumentCheckScript` pelo `transformScript` (`S:preview/renderProject.ts`)
  só com o painel aberto, com o codec `createExecutionObservationCodec` do core. Python: a sonda
  `value` de `observePythonMission`.
- **Pilha:** não há pilha viva no Clássico; mostrar a stack/traceback já capturado, ligando cada quadro
  ao bloco pelo mapa.
- **Erro → linha:** `__szReportCaughtError` nos `catch` do 2D Avançado e dos 3D (custa bytes; medir).
  Pro local: tirar o `errorAt` da stack. Pro hospedado: source map só em builds de depuração.

## 2. Desempenho

| Executor | O que já mede | Onde entra uma coleta desligada por padrão |
|---|---|---|
| Clássico | batimento de 1 s, vigia de 6 s, guarda de laço de 4 s, console limitado a 180 mensagens/s | uma tag como `runtimeInspectorsTag` (`S:preview/bootstrap.ts`): zero byte desligada |
| Jogo 2D | bloco `showFps`, aviso de quadros atrasados, `_frameStamp` | inspetor `game-2d:perf` pela tag desligada (? se o fragmento de inspeção já entra sempre) |
| Jogo 2D Avançado | contadores `perf` sempre ligados, `proSim.droppedSeconds` | **já pronto**: inspetor `game-2d-advanced:perf`; falta ligar e a ponte |
| Jogos 3D | sonda de FPS entre 1,5 e 4 s, `world._frame`, custo por modelo | no callback do quadro, lendo `renderer.info` (não usado hoje) |
| Python | cotas de mensagens no supervisor, `frameSequence` nos renderizadores | contadores na janela de 1 s do supervisor, fora do worker (custo zero para o programa) |
| Pro WebContainer / hospedado | nada | `setPreviewScript`, como a ponte de console / ? |
| Executor dos objetivos | espera de quadros e de modelos | `Performance.getMetrics` do CDP |

**Caminho mais curto:** ponte `sz:perf` desligada por padrão que, a cada 1 s, lê os contadores que já
existem; cada número marcado como medido, estimado ou indisponível; custo da coleta medido abaixo de
5% do quadro (`plano-execucao.md`).

## 3. Testes do aluno

| Executor | O que dá para reaproveitar | Tempo e memória | Sem escrita escondida | O que falta |
|---|---|---|---|---|
| Clássico e as 5 extensões | regras `behavior`/`functionReturns`/`script` e o julgamento `judgeExecutionObservation` (`CO:learning/project-execution.ts`) | E: 2 s por caso, 3 s por regra, 110 s por processo; memória só pelo tamanho da instância | E: cópia do projeto, leitor só no documento do teste | P: a criança escreveria a resposta esperada (hoje ela nunca entra na página); `script` precisa de CDP (só servidor) |
| Python | `behavior` e `functionReturns`, sem `script` | E: missão de 140 s, observação de 10 s | E | P: `unittest` está na stdlib e há `test_model.py` nos exemplos; ? se a criança roda dentro do Estúdio |
| Pro WebContainer | nenhum executor local | n/a | n/a | P: terminal npm sem vitest nos modelos; usar o hospedado |
| Pro hospedado | `proCheckEntry` com a tabela de módulos; `game` via `__studioGame.inspect` | E | E | P: arquivo e linha exigem source map |

**Caminho mais curto:** um "teste da criança" é uma `SectionExecutionRule` escrita por ela, validada
pelos mesmos limites e julgada por `judgeExecutionObservation`. Para não custar contêiner a cada
clique, pode rodar numa prévia oculta no navegador com o leitor (sem `script`).

## Riscos

1. CSP da prévia sem `unsafe-eval` e o `scriptSourceGuard`: não há como avaliar expressão qualquer;
   leitores precisam ser gerados antes, pela árvore sintática.
2. Sandbox sem `allow-same-origin`: os dados vêm por `postMessage` do ambiente do programa e podem ser
   forjados. Servem para depurar, nunca para dar nota.
3. Pausa dentro de código síncrono briga com as guardas (laço de 4 s, vigia de 6 s); sem isolamento
   entre origens não há `SharedArrayBuffer`/`Atomics`. A pausa tem de ser na fronteira de quadro ou
   de callback.
4. Documento da prévia no teto de 790.000 bytes (folga de 57): nenhum byte a mais no documento
   padrão; toda coleta por tag desligada, com teste de bytes.
5. Bundle do modo Blocos (teto 4.750.000 cru): os painéis carregam sob demanda.
6. Cadê e Farol: instrumentação só no caminho da prévia, nunca no gerador; nada de blocos de depuração
   na paleta.
7. Instrumentação nova preserva os números de linha (erro → bloco depende disso).
8. Python: `settrace` com `run_sync` é factível mas caro; ? suporte de JSPI em cada navegador.
9. Executor: sem teto de memória por página e até 3 objetivos em paralelo; testes da criança no
   servidor custam contêiner a cada clique.

## Próximo passo

A proposta inteira dos três painéis (Depurar, Desempenho, Testes do aluno), com fotos do app real e
só o que a tabela acima mostra que é factível, para a dona aprovar antes de qualquer interface.
