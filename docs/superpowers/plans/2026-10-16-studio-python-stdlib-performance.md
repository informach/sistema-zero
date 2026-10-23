# Qualificação da pré-compilação da biblioteca padrão

**Atualização18/10:** o SDK Linux/CPython real passou novamente na distribuição4a com o boot cache privado: UUIDa2f5c1e9-29c5-40f5-a391-99dcb53e6713, input/tecla/click/capture/preview e cleanupACK, review de artefatos independente sem novo achado. Chrome/Edge comprovaram três workers novos com globals/FS distintos e reutilização dos três recursos16.783.568B sem novos GETs. Isso não qualifica o desempenho completo: F1frio≈10,5s; cache/editado3,6–4,7s acima das metas, módulos ainda3.125.197B por reexecução. Compressão HTTP agora implementada/em revisão nativa, nova distribuição e medições pendentes. Timeout secundário do contadorF1Pro continua aberto. Detalhes atualizados em `2026-10-16-studio-python-execution-state.md` e `2026-10-18-studio-python-http-compression.md`; os checkpoints antigos abaixo são históricos.

O perfil de CPU L3 mostrou ~1,3–1,44 s em `rawRun(import _pyodide_core)` e ~240–260 ms em outras chamadas Python; a interface permaneceu ociosa. Distribuição baseline f4ea4fa7ab4a2be08783da13f0b3ea775a14124a4681548837c584a072e5ad8f. Traces em `.cache/studio-python-runtime/runs/2026-10-16T22-49-58.682Z/report.json`; lifecycle baseline30ciclos em `2026-10-16T22-45-35.108Z/report.json`.

Uma única mudança em qualificação: adicionar `.pyc` com `py_compile` público do CPython3.14.2, optimize=0 e CHECKED_HASH, mantendo todas as entradas/fontes originais. Não remover módulos, docstrings ou asserts, nem mudar loader/runtime. Receita inicial `experiments/studio-python-runtime/precompile-stdlib.py`. O builder aceita a saída pelo caminho/hash apenas na ferramenta de build, não nos projetos. Ainda não é o padrão ou aprovação de catálogo.

Impacto4 × confiança4 ÷ esforço2 =8. Critério da skill extreme-software-optimization≥2. Perfil e baseline precedem a mudança.

## Equivalência a demonstrar

- Ordem de efeitos: inalterada; mesmos módulos/loader Python, somente compilação antecipada.
- Desempates/float/RNG: nenhuma alteração pretendida; fixtures verificam RNG fixo, frações e resultados.
- Diagnósticos e introspecção: fontes originais preservadas byte a byte; `dfile` portátil, testes de inspect/traceback.
- Golden: mesmas saídas/erros de execução, REPL, inputs, arquivos e biblioteca padrão, em Chrome/Edge nas duas distribuições.
- Segurança/recursos: repetir isolamento/stop/ciclos após eventual adoção; nenhum intérprete pré-aquecido adicional.
- Custo: ZIP passa2.545.637→7.112.499bytes. Medir cache frio em20Mbps/80ms e quente; não esconder bytes a mais.

Primeiro diagnóstico instrumentado (duas amostras por browser, insuficiente para aceite): Chrome2132/2017ms→798/805ms; Edge2297/2234ms→942/885ms. ZIP559módulos compilados, fontes preservadas; SHA02900077d6d689e6b179454059228f0cff91af254dd38442046acc61f5db80c4. Report otimizado `2026-10-16T22-54-15.876Z/report.json`.

## Resultado local do recorte console

Receita determinística sob CPython3.14.2 sem otimização do compilador; validações explícitas não desaparecem com `-O`, e `-O/-OO/PYTHONOPTIMIZE` são recusados. A serialização marshal de functools variou sob `-O`, apesar dos mesmos code objects: o modo do compilador faz parte da receita. Dois builds normais repetiram SHA02900077…; revisor verificou614entradas originais idênticas,559pyc CHECKED_HASH e18.159code objects com caminhos portáveis. ReviewL3-006:3achados resolvidos (guardas, floor por manifesto, golden exato).

Suite otimizada56/56,161,2s, report `runs/2026-10-16T22-57-56.004Z/report.json`, distribuiçãof164fb90beb9d8460f4d9ca034b294cc370a2db39099fdfdad5036d57b7f26f9. Golden inspect/traceback coincide com baseline `2026-10-16T22-57-01.426Z`; fixado no teste. Inclui isolamento/stop/input/REPL e30ciclos por browser. Chrome warmPreparep95=792,4ms, aumento máximo amostrado220.499.968bytes, retenção−5,91%; Edge817,9ms/212.647.936bytes/−9,05%. Sem forcedGC, nenhum worker após dispose. Pico instantâneo/editor/Turtle/vídeo não são medidos por esse ensaio.

Rede:60testes por distribuição (30novos contextos por navegador),20Mbps agregados+80ms por resposta no servidor local. Otimizada `2026-10-16T23-02-49.125Z`,60/60em582,9s; baseline `2026-10-16T23-12-42.861Z`,60/60em588,4s. Não é emulação de NIC/upload/videoconferência; rodadas sequenciais com outras tarefas locais, portanto diferenças pequenas de CPU não provam ganho frio.

| Distribuição | Chrome p50/p95 | Edge p50/p95 | Bytes transferidos por sessão |
|---|---|---|---|
| Upstream | 9058/9314ms | 9656/9844ms | 14.851.800 |
| Pré-compilada com fontes | 9239/9318ms | 9323/9404ms | 19.418.662 |

As duas respeitam≤12s neste recorte. A troca é explícita: +4.566.862bytes no primeiro download, preparação quente substancialmente menor. Os números não qualificam o computador externo8GB nem a experiência completa.

Próximo: incorporar receita em pipeline de build hermético/verificado, antes de torná-la padrão de produto. A opção experimental continua reversível e a aprovação de catálogo continua separada. L4 altera artefatos do runtime e exige nova regressão pertinente, sem reutilizar esse hash como se fosse a distribuição nova.

## Adoção no build — plano de execução de18/10

Diagnóstico atual `performance-startup-profile-1`: Chrome155.0.8059.80 preparou console em2389/2312ms com tracing. Não são medições de aceite. A opção qualificada acima ainda não era padrão; investigar a interface sem incorporar o preparo aprovado esconderia esse custo conhecido de inicialização.

A montagem passará a compilar a biblioteca padrão usando o próprio CPythonWASM/Pyodide pinado, através de `loadPyodide`, `FS` e `runPython` públicos em um processo Node24 exclusivo. Isso elimina dependência de uma instalação nativa de Python e de Docker para gerar a distribuição. Somente fontes confiáveis da biblioteca padrão entram nesse processo; fontes de projetos não são entradas do assembler. Nenhuma alteração no loader, precisão, asserts, docstrings, ordem de efeitos ou API Python.

Spike já executado antes da adoção: Windows/Node24.22 duas vezes e Linux/Node24.15 offline produziram exatamente7.066.273bytes, SHA`afc02bfca854c42376d79358e1c808da58c49801de3b0e9e8b16e01b3a4d9b1a`. Linux usou imagem de ferramentas imutável, entradas próprias em leitura, saída própria e sem rede/socketDocker. O primeiro comando usou um ID de imagem inexistente e foi corrigido pela inspeção do ID real; não houve execução nesse primeiro comando. Custos frios: +4.520.636bytes frente ao ZIP upstream. Fontes614entradas preservadas,559pyc CHECKED_HASH,18.159code objects. Cinco serializações marshal diferem do ZIP nativo029; comparação recursiva de todos os campos `co_*` não-callable, constantes, paths e tabelas de linhas/exceções confirmou equivalência. ZIPWindows/Linux são idênticos. Verificador independente confirmou os artefatos; isso ainda não qualifica a nova distribuição inteira.

1. Promover a receita para `scripts/python`, com manifesto fixando input/output, versões, magic, quantidade e hash da receita. O processo Node verifica todos os arquivos vendor e a receita antes do import e recusa versão/API incompatível. Saída só é aceita após verificar o pin completo.
2. Criar helper de build com cache por hash, leitura revalidada e publicação por temporário próprio+rename. Cada compilação possui seu processo, deadline abrangente, drenagem limitada e retirada/limpeza confirmadas; nenhuma promessa compartilhada permite que um chamador encerre o processo de outro. Um cache inválido nunca vira fallback silencioso para o ZIP lento.
3. Tornar a saída compilada o padrão do assembler, mantendo override explícito apenas para qualificação de biblioteca preparada. CI precisa disponibilizar Node24 antes da primeira montagem. `STUDIO_PYTHON_BUILD_NODE`, se necessário no desenvolvimento, é opção da ferramenta de build, jamais configuração de projeto/browser. O caminho JavaScript não invoca esse assembler.
4. Provar cache/tamper/concorrência/encerramento e repetibilidade da implementação promovida, além da regressão de console/Turtle/inputs/REPL/stop/diagnósticos/fontes. Repetir a prova SDK pertinente na nova distribuição; preservar os resultados anteriores como históricos.
5. Medir novamente frio/cache/pequena edição com30amostras, rede/vídeo e memória; tratar separadamente os custos da interface/sala. Review do lote, correções e QA global antes de commit/merge local. Nenhuma ativação remota decorre desta mudança.

## Primeira regressão da distribuição adotada — 18/10

O primeiro build padrão gerou `c4abecc6ea657055f3a27895a09db9a48a5afd130835b149b9b8f62c5898a9a3`, com 24 arquivos. O revisor conferiu o manifesto canônico e tamanho/SHA de todos os arquivos. A receita promovida usa pin LF `6de6a73a55bffcbf939d455b8f0e27e2011cbfbd844978a89420dcc6faf3316e`; o ZIP final permanece `afc02bfc…`, com 7.066.273 bytes. A review 109, fechada 1/1/0, corrigiu o retorno após retirada na fronteira de hash/await e após a limpeza. Os 12 testes do helper, com 32 assertivas, passaram usando Node/WASM reais e regressões de cancelamento em processos isolados. A segunda verificação TypeScript e a repetição dos comandos de build/testes do CI passaram. CI/testes devem executar da raiz para usar globais nativos; o preload HappyDOM de Studio não é o ambiente de execução das ferramentas de build.

Na regressão selecionada atual, 83 de 84 testes passaram em Chrome/Edge, sem skip ou retry. Evidências: `stdlib-runtime-regression-1/report.json`, `analysis.json` e log `l8-stdlib-runtime-regression-1.log`. Console, REPL, fontes/inspect/traceback, frações/RNG, input, isolamento, Stop e os casos selecionados de Turtle passaram. A única falha foi a meta local de preparação quente no Edge; a distribuição não está qualificada por essa rodada.

| Console Pro — 30 ciclos | Chrome 155.0.8059.80 | Edge 155.0.4283.62 |
|---|---:|---:|
| Preparação quente p95 | 1.034,1 ms | **3.130,1 ms — falha, meta ≤ 3.000 ms** |
| ACK Parar máximo | 1,7 ms | 2,2 ms |
| Targets de workers removidos — máximo | 27,55 ms | 188,53 ms |
| Incremento nativo ativo máximo | 220.561.408 bytes | 216.862.720 bytes |
| Crescimento retido final/aquecido | 0,38% | 1,74% |

As métricas são do console/provider local, sem editor, vídeo ou rede controlada. Não são pico instantâneo, nem liberação de um loop ocupado (esse caso tem teste separado). Durante Edge foram observados 87–93% de CPU total e outros processos ffmpeg consumindo vários núcleos; snapshot em `l8-stdlib-environment-1.json`. Nenhum processo externo foi alterado. Esse dado limita a comparação causal, não anula a falha nem prova sozinho sua causa. Manter a rodada negativa e investigar sob condições registradas.

O próximo diagnóstico usa a interface real da sala e três fases clique→primeiros pixels úteis (frio, recursos em cache, executar após editar), com iframe anterior confirmado removido. A review 110 corrigiu um falso negativo de antialias no fixture editado (espessura 6 como a baseline, predicado de pixel estrito mantido). Esse diagnóstico ainda não substitui 30 amostras, cargas F1/F3/F4, rede/vídeo e máquina de referência. SDK com o pacote novo, regressão global e aceites de desempenho permanecem pendentes.

### Diagnóstico da sala e próxima instrumentação

A rodada `stdlib-live-diagnostic-1` passou as 10 assertivas funcionais em Chrome/Edge: Clássico/Pro, continuação, edição, handoff aluno/professor, persistência e revogação. O relatório `analysis.json` separa esse resultado dos flags de tempo. Cada célula abaixo contém uma amostra; não é p95 nem homologação, e a espera Playwright para observar pixels está incluída.

| Interface | Frio | Cache | Executar após editar |
|---|---:|---:|---:|
| Chrome Clássico | 3.124 ms | 1.897 ms | **2.072 ms > 1.500** |
| Chrome Pro | 2.923 ms | **3.384 ms > 3.000** | **3.076 ms > 1.500** |
| Edge Clássico | 2.367 ms | 1.773 ms | 1.384 ms |
| Edge Pro | 2.669 ms | 1.629 ms | **1.547 ms > 1.500** |

Próxima instrumentação: registrar o primeiro pixel útil dentro do frame em requestAnimationFrame, antes de o observador Playwright tomar conhecimento do resultado. Preservar a verificação estrita de cor, a retirada da geração anterior e as medições originais. Registrar tanto o timestamp do desenho quanto o tempo até o teste observá-lo; intervalos crescentes de polling não devem ser confundidos com CPU do interpretador. Adicionar captura CPU opcional somente para diagnóstico, sem usar tracing nas rodadas de aceite. Não alterar o runtime para emitir um “pronto” antecipado.

A prova promovida Linux também encontrou uma exigência incorreta da ferramenta: Node 24.15 não expõe JSPI por padrão, mas a receita usa somente `runPython` síncrono. A [documentação oficial de JSPI no Pyodide](https://blog.pyodide.org/posts/jspi/) distingue essa execução do caminho que pode suspender. A review 111 retirou apenas esse guard do build; o requisito JSPI do runtime interativo permanece. A primeira prova negativa está em `l8-stdlib-promoted-linux-1.log`. A repetição corrigida, `l8-stdlib-promoted-linux-2.log`, passou offline no Node 24.15 com 512 MiB e uma CPU, gerando o ZIP exato `afc02bfc…`. O revisor confirmou igualdade de bytes com o cache Windows, quatro fontes staged iguais às atuais e os sete vendors pinados. Review 111 fechada 1/1/0.

A prova SDK com a distribuição atual também passou: `inspection-sdk/e92e3db1-3cbf-440d-a0e4-5371cf94d612`, log `l8-stdlib-python-builder-sdk-1.log`. Members/PostgreSQL, política, Pyright, workerd/R2/DO/SDK/CPython/playtest reais nos mesmos limites de B3. Duas validações/execuções com sandbox criado uma vez e destruição confirmada por ciclo; renovação mantém CAS e identidade de execução, muda a referência e não chama o modelo novamente. Relatórios, manifests, PNG e limpeza das duas proxies próprias foram conferidos independentemente. A receita padrão termina aguardando input sem enviar teclas/cliques/stdin; acesso/modelo/reserva de linguagem são controlados. Não é prova de desempenho, UI autenticada de quatro hosts ou infraestrutura remota.

A instrumentação de pixels seguinte é somente QA: primeiro bitmap útil observado em rAF no frame novo, com possível atraso de um frame. Não é timestamp de GPU/compositor. A review 112 corrigiu a retirada da sessão CDP quando `Tracing.start` falha, preservando o erro inicial e tornando falha de cleanup observável; testes controlados e revisão independente passaram. A versão nova ainda precisa de TypeScript e execução browser antes de produzir novos números.

### Separar custo do teste e custo do produto

O primeiro diagnóstico CPU da interface, `stdlib-live-profile-1`, passou duas verificações funcionais Chrome e gerou traces íntegros. TypeScript passou antes da execução. Esses números incluem tracing e continuam inadequados para aceite. O profiler mostrou `visitNode → captureSnapshot`, confirmado no snapshotter do Playwright 1.60 instalado (`coreBundle.js`): cerca de 509 ms amostrados no caso Clássico. A gravação `retain-on-failure` captura o DOM durante o teste mesmo quando seu arquivo final será descartado por sucesso. Isso é trabalho da instrumentação, não uma função do Turtle que deva ser otimizada.

A próxima rodada desliga somente a gravação DOM no arquivo de diagnóstico de desempenho. Os testes funcionais continuam com seus traces. A captura CPU própria permanece opcional para investigação e seu overhead deve continuar explícito. O relógio inicial passa a ser o evento DOM de clique confiável, capturado antes do handler React; o atraso entre solicitar a ação pela automação e o clique real fica em coluna separada. O timestamp final continua sendo o bitmap útil observado em rAF no frame da geração nova. Marcas de tempo identificam esse intervalo nos traces, para excluir preparação do profiler, edição anterior e screenshot posterior da análise do caminho crítico. Preservar todos os resultados antigos, sem tratá-los como baseline comparável de uma otimização do produto.

### Clique real sem tracing DOM — diagnóstico 2

TypeScript passou (`l8-live-method-studio-typecheck-2.log`). A rodada `stdlib-live-diagnostic-2` passou 4/4 verificações funcionais, sem skips/retries, e preservou os flags de tempo separadamente. Runtime continua `c4abecc6…`. CPU tracing desligado; instrumentos só de leitura. Uma amostra por fase, sem vídeo/rede moldada e sem carga F1: **não é homologação**.

| Interface | Frio | Cache | Após editar |
|---|---:|---:|---:|
| Chrome Clássico | 1.120,0 ms | 865,0 ms | 863,0 ms |
| Chrome Pro | 1.062,3 ms | 1.147,6 ms | **1.526,8 ms > 1.500 — falha** |
| Edge Clássico | 1.109,2 ms | 761,4 ms | 946,2 ms |
| Edge Pro | 1.163,8 ms | 1.079,9 ms | 1.030,8 ms |

Despacho da automação: 11,3–70,3 ms, registrado fora do intervalo clique→bitmap; atraso de observação também separado. Não houve alteração do produto entre as rodadas 1/2, portanto a diferença não é uma nova otimização do interpretador. Não excluir a falha de 1.526,8 ms nem a falha anterior do console Edge. Próximo aceite requer 30 amostras, F1 e cenários de rede/vídeo/memória definidos no contrato.

### Próximo lote QA: série F1 na interface da sala

**Atualização após implementação do cache (18/10):** consumidores/build/SDK metadata revisados, distribuição local4a05019af88024f73190c95258061524e182568e08dd9efea1d9ae7e45636c77/26files; CPython análise/Turtle/raw/privatesupervisor smoke8/8ChromeEdge. Prova3boots×2browsers2/2pass:16.783.568B dos três dados só no primeiroboot porcontexto, globals/FSfresh/IDsdistintos/Stop. NãoéaceiteF1/p95/memória. QAagoralimpa HTTP+exataCacheStorage generation desse runtime apósparserconsoleprontos; registra{name,existed,removed}, preservaoutroscaches eIDB. Reviewleve vsStoreREALwarm/absent clean `.cache/studio-python-l0/review-live-cold-cache-reset.md`; freshQA TSC/F1smokeaindapendentes. O desenho default semreset não foiqualificadofrio. NovoSDKnative --turtle --preview emandamento; nãoiniciarF1ououtraheavyatécolher. Manter todasfalhasanteriores, nãoiniciar30antesgatesbytes/timingsmoke.

**Atualização 18/10:** fixture e gates QA implementados/revisados (114 fechada 2/2/0, TSC fresh exit0). Série30 ainda não iniciada. Smoke3 confirmou falha real de cache: Classic funcional passou, mas frio/cache/edição fizeram cada um 19.613.552B e levaram 10.331,4 / 10.639,8 / 10.729,2ms; duas fases quentes reprovadas. Pro preservou frio10.825,2ms antes de falhar na consulta de contador em5s, causa independente ainda aberta. Não descartar falhas. Prova isolada opaque-http-cache-3/result.json (8casos Chrome/Edge) confirmou downloads repetidos no contexto opaco, inclusive mantendo o documento e criando workers novos; controle não opaco somente de teste reutilizou cache. Não foi teste do mesmo worker. Plano da correção candidata/prova: `2026-10-18-studio-python-immutable-boot.md`. Nenhuma mudança do isolamento ou aprovação de desempenho.

O próximo recorte mede 30 amostras por fase, superfície e navegador com a carga F1; não qualifica vídeo, upload, infraestrutura de identidades real ou computador de 8 GB. Reutiliza a limitação agregada de respostas do servidor de runtime existente (20 Mbps + 80 ms por resposta). Esse mecanismo não é emulação de NIC nem o perfil completo download/upload/RTT; registrar essa limitação em cada evidência. Não mudar metas nem código do produto.

Arquivos e interfaces:

- Criar `packages/studio/e2e-python-editor/fixtures/performance.ts`: `turtleF1Source(color: 'red' | 'black'): string`, duas tartarugas e exatamente 200 chamadas de movimento no laço; comandos de setup separados. Sem assets externos ou animação proposital. Segunda tartaruga azul na linha y=-40; primeira linha útil em y=0, espessura 6, cor red/black. O módulo compartilhado fica dentro do pacote ESM de Studio, usado pelo runner Node e pelo servidor Bun; a primeira tentativa fora desse pacote foi interpretada como CommonJS pelo Node24 antes de descobrir os testes.
- Modificar `experiments/studio-python-runtime/fixtures.ts`: caso `turtleF1` e clássico `classic-turtleF1`, reutilizando o mesmo documento validado e extensões do fixture Turtle existente.
- Modificar `experiments/studio-python-runtime/liveService.ts`: setup local aceita workload `f1`; o padrão permanece o desenho já usado pelas regressões. Sem novo endpoint de produção ou código arbitrário por query.
- Modificar `packages/studio/e2e-python-editor/live-performance.spec.ts`: `PYTHON_LIVE_WORKLOAD=f1` seleciona fixture, fonte editada, fonte esperada e metadados F1; grava índice `testInfo.repeatEachIndex`. No frio F1, limpa cache HTTP via CDP pertencente ao teste depois de o editor estar pronto, antes do clique, e registra os contadores do servidor antes/depois. O parser/editor já preparado não será descrito como cold boot do shell. Não usar tracing DOM/CPU na série de tempo.

- [ ] Implementar o fixture explícito e revisar a diferença antes da série:

```python
for _ in range(100):
    first.forward(0.6)
    second.forward(0.6)
screen.update()
print('f1-ready', round(first.xcor(), 6), round(second.xcor(), 6))
```

- [ ] Preservar as três fases e relógios confiáveis já revisados. Confirmar fonte F1 real no Monaco antes do frio e editada antes de Reiniciar; verificar `f1-ready 60.0 60.0` além dos pixels, para não aceitar só um cursor como carga concluída. Pixels medem primeiro desenho útil; a saída confirma execução das 200 chamadas.
- [ ] Run: Node24 Playwright `test --config playwright.python-live.config.ts live-performance.spec.ts` com `PYTHON_LIVE_WORKLOAD=f1`, `PYTHON_PROBE_NETWORK=reference`, `PYTHON_LIVE_PROFILE=0`, output novo. Primeiro ensaio 4 casos Chrome/Edge; TypeScript e review antes de medir em escala.
- [ ] Confirmar que bytes frios entregues depois da limpeza incluem pelo menos o conjunto de boot do runtime; caso contrário, reportar carga fria inconclusiva e corrigir o harness, sem reclassificar como cache frio. CDP sempre destacado em finally.
- [ ] Run o mesmo comando com `--repeat-each 30`, outputs novos, sem outras tarefas pesadas. Agregar report JSON por navegador/superfície/fase, manter todas falhas e amostras incompletas; exigir 30 registros completos por grupo. Calcular mediana, p95 pelo índice `ceil(n*0.95)-1`, máximo e falhas contra as metas 12000/3000/1500 ms. Comparar metas no agregado, não excluir outliers ou aceitar apenas porque as assertivas funcionais passaram.
- [ ] Review do lote QA/resultados e investigação por perfil apenas se houver falha persistente. Vídeo, F3/F4/F7/F8/F9/F10 e memória/entrada continuam nas próximas provas obrigatórias, sem inferir resultado deste recorte.
