# Carregamento paralelo do Python/Turtle

> **For agentic workers:** Use executing-plans em lotes com revisão. O usuário autorizou implementação, desempenho e revisões. Autorizou também um checkpoint de conciliação com commit, merge e PUSH em staging após os gates/review desse conjunto, seguido da continuação Python. Isso não autoriza deploy manual ou produção. O estado vigente está em `2026-10-16-studio-python-execution-state.md`.

**Goal:** Reduzir a espera de boot/reexecução por downloads independentes, preservando intérprete/FS novos, validação, isolamento e cancelamento.

**Architecture:** Reordenar somente o preparo de recursos imutáveis do runtime aprovado. Primeiro carregar os quatro fontes Turtle e seu módulo de protocolo em paralelo. Depois permitir startup explícito do worker para que o hint Turtle capturado do snapshot autenticado antecipe esses recursos durante o carregamento do CPython; leitor privado permanece configurado antes de qualquer chamada ao Pyodide. Finalmente sobrepor o renderer ao boot, publicando ready somente quando ambos terminarem.

**Tech Stack:** TypeScript, import() ESM público, fetch/AbortSignal, APIs públicas Pyodide/CPython, Worker/MessagePort, Bun build, Node24/Chrome/Edge.

**Spec:** `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, `docs/plans/2026-10-16-estudio-python-desempenho.md`, execução L3/L8 e plano HTTP de18/10.

## Evidência anterior à mudança

Distribuição d8cde416540c1d88f55c4535671c019621132069955986239e0722c083c12ce7. F1gzip2: ChromeClassic9498,3/2745,8/2597,2ms; EdgeClassic9682,4/2679,2/2630,1; ProEdge10033,6/2846,5/2879,9. Frio/cached/editado, metas12000/3000/1500ms inalteradas. Frio17.608.147B; quente824.579B. Funcional3/4, mas editado acima da meta. ChromePro9947,5msfrio e timeout secundário `/network`5s reapareceu; problema continua aberto, sem troca de transporte/retry/timeout. Não é série30 nem aprovação de desempenho.

Perfil ChromeClassic edited (`http-compression-live-f1-cpu-1`, 60612EXIT0): até o primeiro bitmap, novo worker amostrado2048,069ms, idle1407,433ms e não-idle640,636ms. O perfil completo inclui523,667ms posteriores ao bitmap e não deve ser atribuído inteiro ao caminho crítico. Trace instrumentado, overhead de profiler visível, não usar tempos como aceite. Cronologia relativa ao primeiro request observado: frame.mjs311→510ms; metadata538→658; renderer658→779; reader787→901; worker902→1111; loaderPyodide1155→1256; asm1259→1539; protocoloTurtle1983→2085; quatro fontes Turtle2086→2638, em série. CPU/FS/CPython ainda precisam de tempos separados; não atribuir1s a compilação Turtle/WASM sem prova. Revisão independente: `.cache/studio-python-l0/review-live-f1-cpu.md`.

## Restrições globais

- Nenhum worker/intérprete/FS de aluno compartilhado, persistente ou pré-aquecido. Reexecutar cria outra VM e Stop termina a geração.
- Sem global fetch/WebAssembly monkeypatch, hooks privados Pyodide, transformação regex de vendor ou alteração de código do aluno.
- URLs continuam derivadas somente de import.meta.url e nomes fechados da distribuição aprovada. Não aceitar URL/arquivo de extensão no hint.
- Manter CSP, Trusted Types, frame opaco, desafio/identity, duas ports autenticadas e protocolo fechado de três recursos de boot. Nenhum allow-same-origin ou privilégio novo.
- Fontes Turtle só são buscados para projeto que instala Turtle; Python sem extensão e analisador não antecipam biblioteca gráfica.
- Hint booleano é captura do snapshot validado no frame, nunca autorização independente. Conferir igualdade com extensão real no prepare; erro invalida geração, sem executar aluno.
- Recursos em paralelo pertencem à mesma geração. Falha/cancelamento cancela siblings; download/import tardio não monta canvas, publica ready, inicia aluno ou escreve no projeto seguinte.
- Módulos Python/JS preservam nomes/bytes. Otimização muda ordem de preparo; protocolo de programa, RNG, ponto flutuante e ordem de efeitos do aluno permanecem iguais.
- Manter prova de metadata/pin, namespace HTTP, source/web export, SDK/preview, análise/REPL/isolamento/Stop. Qualificar nova distribuição, não reutilizar d8 como se já contivesse mudanças.

## Lote A — fontes e protocolo Turtle em paralelo

**Files:** criar `packages/studio/src/runtime/python/turtle/moduleSources.ts` e teste colocalizado; modificar `packages/studio/src/runtime/python/interpreter.ts`. Consumir `TURTLE_MODULE_FILES` de contract.ts e `fetchPythonWebBytes` de webFiles.ts. Em `webFiles.ts`, envolver fetch/leitura com o awaitWithSignal público já usado no host: a promessa owned termina mesmo com transporte/cancelamento não cooperativo; resposta tardia é cancelada. Cobrir leitura com cancel ACK pendente em `webFiles.test.ts`, usando stream highWaterMark0 para esperar causalmente a primeira leitura, sem antecipação automática do producer.

**Interface:** `loadTurtleModuleSources(base: URL, signal?: AbortSignal): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>>`. Base capturada do próprio módulo confiável, quatro nomes fechados. Um controlador owned para irmãos, timeout30s, máximo1MiB por fonte/4MiB total; nenhum byte parcial é devolvido. Usar leitura limitada existente e abortar irmãos no primeiro erro. Não alterar rede/cotas de projeto.

- [x] Escrever regressão com gates causais: os quatro GETs começam antes de liberar qualquer resposta; respostas em ordem inversa preservam nomes/bytes; falha/ownerabort encerra irmãos, não devolve mapa parcial; nenhuma URL fora dos quatro nomes.
- [x] Rodar vermelho antes de criar helper; salvar exit/output. Implementar helper com Promise.all e controlador owned. Log `l8-parallel-turtle-unit-red-1.log` EXIT1 módulo ausente; primeira bateria10/113green. Bateria ampliada2 teve falha de gate (stream pull antecipado), preservada; corrigir gate HWM0 antes de novo verde, não modificar produção para a prova.
- [x] No prepare Turtle iniciar import do protocolo e helper juntos, aguardar ambos antes de instalar a extensão; escrever arquivos no FS novo usando nomes existentes. Projeto/atividade permanecem validados antes dessa etapa. Falha do protocolo também aborta fontes; dispose invalida downloads e escrita tardia.
- [x] Rodar testes do helper/webFiles e regressão gráfica real; Biome/TSC pertinentes; revisão independente. 39/292 unidades/probe após red122404/overflow; Biome5clean; TSC2freshEXIT0; runtime-smoke1real8/8ChromeEdge. Review122corrigida/fechada1/1/0. Distribution0645e50edc7ead6692434443d07ee8f1e6b8dbafedbbc3edcec7a59b7a368c96, releasepine74c2ff47a8fe516e4902426dc8368e00c36c632746a5670a64b36117241ddfb. F1ChromeClassic92463EXIT0funcional,amostra10145,1/2773,1/2078,9ms; frio17.609.028B/quente825.460B. Editado segueFAIL1500ms; comparação anterior2597,2 é só duas amostras, não série/causalidade estatística nem aprovação. Nenhuma heavy ativa ao iniciar B.

## Lote B — startup explícito e antecipação durante CPython

**Files:** modificar worker.ts, protectedWorker.ts, interpreter.ts, frame.ts; criar helper de loader público somente se necessário para manter responsabilidade clara. Analisador worker.ts não precisa mudar: seu ramo de bootstrap continua configurando reader antes do import com TLA.

**Interfaces:** worker de execução exporta `startPythonWorker({ turtle?: boolean }): Promise<void>`, one-shot, sem iniciar CPython na avaliação do módulo. Protected factory recebe hint Turtle opcional para execução; frame do produto SEMPRE passa booleano do snapshot validado. Ausência representa explicitamente o caminho lazy interno legado usado pelo probe, não equivale a false; analysis só aceita ausência. Init privado inclui exatamente type/protocol/turtle, valida booleano ou ausência e purpose fixo. No prepare, qualquer hint booleano divergente da extensão real falha antes de aluno/ready. O ramo execution importa reader e worker em paralelo, configura reader e só depois chama startPythonWorker. O ramo analysis mantém sequência/capacidades atuais, sem fontes Turtle.

**Provas nativas:** criar `packages/studio/e2e-runtime/python-bootstrap.spec.ts` e incluir no config runtime. Context.route segura boot-reader e espera request worker antes de liberá-lo; nenhuma das três URLs de dados pode ser pedida enquanto reader não foi configurado. Outro gate segura loader e exige request asm antes de liberação. Gate no WASM exige protocolo e quatro fontes Turtle antes de liberá-lo. Todos liberam gates/consomem prepare em finally e validam execução/pixels após liberação. Importar entry real de execução no mesmo worker já inicializado e tentar start novamente precisa rejeitar, sem segunda VM. As demais provas reais de input/REPL/Stop/CSP/analyzer/reuso continuam necessárias após o lote.

O intérprete recebe o hint explícito. Quando true, inicia protocolo/fontes confiáveis em paralelo com o loader/CPython, consumindo todas as rejeições imediatamente via composição de promises. Loader e asm.mjs podem ser importados ESM em paralelo: a fábrica asm não é chamada antecipadamente nem substituída; loadPyodide continua sendo a única API de inicialização. Antes de implementar, conferir no vendor fixado que avaliação do módulo asm não inicia VM/fetch ou altera estado global. Conferir URLs idênticas às que o loader importará para não duplicar módulos.

- [ ] Escrever gates para bootstrap one-shot/forma inválida/hinttipo/purpose/reader antes de start; preservar as provas de descendant worker bloqueado/TT/CSP e exceções encerrando ports/URL/worker.
- [ ] Refatorar TLA de execução para factory one-shot. Hint e snapshots de prepare divergentes falham antes de aluno/ready. Sem hint Turtle, manter caminho lazy necessário para chamadas internas/legadas explicitamente suportadas, sem download gráfico no analisador.
- [ ] Reusar bundle de fontes/protocolo capturado no init em prepare, preservando instalação no FS novo. Compor Pyodide e recursos opcionais para não haver unhandled rejection nem booted após falha.
- [ ] Confirmar ESM asm fixado e sobrepor import do loader/asm com APIs públicas; sem campos privados/wasm cache de engine ou pré-instanciação.
- [ ] Rodar unit/DOM + actualChromeEdge syntax/Unicode/Turtle/input/REPL/Stop/cancelamento/mismatch e três novas gerações sem globals/FS; validar analyzer ainda funciona. Revisão antes de avançar.

## Lote C — renderer paralelo com barreira única de ready

**Files:** frame.ts e testes de lifetime/integração pertinentes. Manter metadata do parent após autenticação; antecipação especulativa em frames legados não integra este lote.

Iniciar import do renderer Turtle e bootstrap/supervisor independentemente após snapshot/identity validados. Registrar promise owned do renderer, observando erro imediatamente. Graphics espera renderer válido, e nenhum run é admitido antes da barreira. `state:ready` e mensagem prepared só são publicados juntos depois que worker preparado e renderer terminarem; não anunciar ready antecipado. Falha de qualquer lado fecha geração e outro recurso. Fechamento anterior ao import tardio impede criação de canvas/playerBridge; callbacks tardios não reabrem geração.

- [ ] Escrever gates de workerprimeiro/rendererprimeiro/erro de cada lado/Stop/pagehide antes de resolver import; verificar zero ready/aluno/canvas tardios e cleanup único.
- [ ] Implementar barreira sem mudar o supervisor do programa nem suas quotas/ACKs; callbacks gráficos continuam validados pelo mesmo supervisor/renderer.
- [ ] Rodar DOM/port tests e nativeChromeEdge carregamento/Stop/input/capture/publicplayer; revisão e correções.

## Qualificação do lote coeso

- [ ] Build determinístico + diffs/hashes de fonte/vendor/Turtle; novo perfil de validação, check e nova imagem SDK. Preservar d8/baseline e artefatos negativos.
- [ ] SDK Linux real com Turtle stdin/tecla/click/capture/preview/cleanup; export web real ClassicPro×ChromeEdge e fonte nativa, sem inventar compatibilidade por testes inertes.
- [ ] F1 smoke frio/cache/editado com profiler desligado; investigar contador separado, metas e transporte inalterados. Só iniciar série30 após causas/falhas atuais tratadas; novos tempos instrumentados não substituem série.
- [ ] Retomar restantes Pinta/Zappy/Mural/allgames/fullQA/fullreview/correções. O checkpoint compartilhado de conciliação segue a autorização de commit/merge/PUSH em staging; os lotes Python posteriores continuam sujeitos à revisão final e merge local originalmente pedidos.
