# VERIFICATION REPORT

- Claim: duas novas falhas QA reproduzidas no smoke2 e confirmadas por leitura causal.
- Commands: Get-Content report/analysis/error-context de .cache/studio-python-l0/stdlib-live-f1-smoke-2; leitura completa dos quatro arquivos F1 e dependências Console/parser/network/clocks.
- Executed: sim, somente leitura/probes puros, nenhum browser/heavy reexecutado pelo revisor.
- Output: smoke2 0expected/4unexpected, sem skips; três Count0stdout e um ChromePro timedOut no networkAfterGET com samples[]. ClassicChrome cold18518.5ms/37685383B, ClassicEdge18168.2998046875ms/37688904B, ProEdge10564.399658203125ms/19613552B preservados com respectivos flags false/false/true; nenhum elapsed ChromePro inventado.
- Limits: parserClassic controla aria-label Editor de blocos Python com inert até ready/saving, separado do botão Executar; leitura mostra possível corrida de preparação, mas bytes~37MB não provam causa exclusiva nem falha de produto. Contador agregado não é prova por recurso/NIC/upload/video; F1 e resposta de rede continuam sem homologação/30amostras.
- Errors: causa do APIcounterhang ainda desconhecida. `analysis.json.limits` contém frase estática dizendo Tests passed e no shapednetwork apesar0/4+rede ativa; esse resumo não é evidência de aprovação, dados brutos prevalecem e raiz foi avisada.
- Verdict:2issuesVALID/0resolved/2unresolved; nenhuma fonte de produção/permanente editada pelo revisor. Probes puros de fixture anteriores continuam sem qualificar browser/performance.

- Independent DOM confirmation114001: bun test ./src/components/layout/BottomPanel.test.tsx --test-name-pattern 'começa sem a aba Console' em packages/studio EXIT0,2pass/2asserts,6filteredout; UI real começa sem abaConsole em blocks/bridge, sembrowser/interpreter.


## Independent fixed-spec causal probe

- Commands: `bun ./.cache/review114-counter-runner.ts f1` e `bun ./.cache/review114-counter-runner.ts drawing`, raizfeature, ambosEXIT0.
- Actual `live-performance.spec.ts` importado em processo Bun próprio; somente runner/ports Playwright substituídos, sem copiar a implementação de registro de métricas nem editar produto/permanentes/setupglobal. Import registra os dois callbacks reais Classic/Pro; invocados com porta request que rejeita apenas segundo GET/network depois do timestamp/pixels.
- Four controlled cases: mesma Error CONTROLLED_SECONDARY_NETWORK_FAILURE propagada, live-startup-diagnostic contém1sample cold/elapsed>=0/networkError original; ambosgets timeout5000; close1. F1 também exercita UI-console gates controlados e CDPdetach1; defaultdrawing não adquireCDP. Não é browserreal nem proof físico de cache/parser.
- Scope: prova causal114002 passa no patch. 114001 gates novos lidos e controlados, aguardando browserreal para confirmar montagem/UI. AmbasissuespermanecemVALID/meta2/0/2 atéfreshbrowser/TSC por pedido da raiz.

## Read-only smoke3 follow-up

- Read stdlib-live-f1-smoke-3/analysis.json: ChromeClassic functionalpassed3phases/stdout+blueendpoint; ChromePro failedboundednetworkGET but preservedcold sample10825.2001953125ms with networkError timeout5000. This confirms114002repair in actualbrowser failure; Consolegates had completed beforeinterval, supporting114001preconditionfix.
- ChromeClassic sampled10331.39990234375/10639.800048828125/10729.199951171875ms and19,613,552B each; warm/editedtargetsFAIL preserved, not dismissed. Samples are not30/p95approval. Source does not prove cachepartition as exclusivecause.
- Pure code /network and conditional documentreuse review stored .cache/studio-python-l0/review-f1-cache-design.md. No confirmednewbug beyond114; no browser/heavy rerun. PendingfreshTSC/remainingbrowserconditions remain by rootrequest.

## VERIFICATION REPORT final114

- Claim:114001/002 resolved somente sliceQA;2total/2resolved/0unresolved.
- Commands: Get-Content .cache/studio-python-l0/l8-live-f1-typecheck-1.log; rerun bun ./.cache/review114-counter-runner.ts f1 e drawing; Bun.YAML issue/meta readback.
- Executed: sim, apósrootcolher68865 e declarar sliceestável; semheavy/browserreexecution.
- Exit codes: logStudioTSCfresh0; amboscontrolledactualspecrunners0.
- Output summary: quatrocasos Classic/Pro preservam1coldsample/networkErrororiginal, getters5000, ownerclose1 eF1CDPdetach1. Console realpreconditions confirmadas noChrome smoke3; Classic3phasesstdout+blueendpointpass, Progatepass antescounterfailurepreservada.
- Warnings: browser executado pela raiz e artefatos lidos; controlledrunner não éexecuçãoWASM/browser. Não éaceiteF1/performance/30samples/rede/vídeo; warmmetas negativas e causaGETunknown continuam. O cacheopaque mínimo posterior invalida hipótese deretençãodoc suficientesozinha; somente designreview separado, nenhumaotimizaçãoprodaprovada aqui.
- Errors: nenhum nofechamento scoped; negativos smoke2/3preservados e causadesconhecida não declaradaresolvida.
- Verdict:PASS somente duasissuesQA114; YAMLreadback2/2/0.
