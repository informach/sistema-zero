# Retirada de frames e helper Admin Python — revisão scoped encerrada

098001 medium VALID/resolved: frame anexado no retorno do owner abortado, comprovado pelo browser2 preservado0c0625d4-58d2-470d-85be-44bea2fb253a/chrome-classic-cancel.json e log browser2. Não é prova de leak permanente; no caminho original a remoção podia acontecer nas microtasks seguintes. Separar da asserção QA sobre about:blank do histórico1. Nenhuma fonte/permanente alterada pelo revisor.

Patch runPythonActivity lido inteiro: signal combinado request/environment/90s retira frames sincronamente, finally remove listener/inicia dispose/libera frames antes de awaitdisposed. Late session permanece aposentada via awaitWithSignal retire. O editor/player comum não foi mudado. Own cache .cache/review098-frame-retirement.test.ts usa snapshot/inspection/Core reais e somente porta de bootstrap gateada, no processo isolado; abort após frame anexado observa0 imediatamente e late session dispose=1.

## Provas independentes leves

- `bun test src/activity/python.lifecycle.test.ts`, cwd Studio:2pass0fail/8expect calls exit0. Permanente real runner e analysis-session bootstrap, request/environment signals; observa frames antes=1/depois=0 SINCRONAMENTE dentro da callback MutationObserver. Sem intérprete servido pela fixtureDOM.
- `bun test ./.cache/review098-frame-retirement.test.ts`, cwd Studio, processo separado para mock.module não contaminar o permanente:1pass0fail/6expect calls exit0. Retirada síncrona/ownerAbortError/late disposal/frame0 final.
- Ambas execuçõesDOM emitem dois diagnósticos NotSupportedError HappyDOM de iframe loadingdisabled. Esperados na fixture, exit0 e0fail; setup global não foi alterado, diagnósticos não escondidos. Não são qualificação CPython.
- Biome6fresh (runner/permanente/fixturesAuthority+Browser+driver/orchestrator):exit0, Checked6/no fixes/no warnings.

## Artefatos reais browser3

`bun ./.cache/review098-section-artifacts.ts`, cwd Studio:exit0, verified=true,24scenarios/20compileReceipts/40authoringRequests/24runtimefiles. Evidência `.cache/studio-python-l0/section-browser/7aa39df7-8735-41e0-9337-7d416f20c9de`, log l6-python-section-browser-3.log EXIT0 root. Arquivos JSON individuais iguais ao browser-results e diagnósticos; Chrome/Edge ×Classic/Pro ×valid/wrong-file/invalid/profile/captured/cancel.

Core recalcula release/distribution, lê bytes de todos24arquivos e confere tamanho/SHA. Release4b1286a81831ef43a475d2686e74ef5109110451220fa038fcb73068e7c916ed, distributionef14a09fa7bfa9daf906c279914b82c29ff8453b083bbd65e8bd7fd93595f558. Fontes/projetos arquivados refinados e snapshots reconstruídos conferem revisão/config/file-set/bytesSHA. QA arquivou subset de metadata: version1 constante e projectId são reconstruídos do contrato/projeto arquivado, não se inventa receipt independente. Grade estrutural passa schemaCore de resultados/client e conjunto/ordem de IDs/kinds/labels conferidos contra atividade canônica; NFKC K→K, Unicode ação, arquivo opcional e syntaxfailed preservados. Estrutura completa/AST raw não arquivados; não se alega reexecução independente do compilador a partir dos JSON.

As40decisões passam StudioRuntimeDecisionSchema, exactcontext/actor/projectId remapeado para reference.id/runtime/subjectSHA/revision/lifetime30s. Vinte autorizações de compilação correspondem aos snapshots (demais são bootstrap por subjectSHA). Captured mantém fonte/checks/scope originais apesar de mutação posterior. Profile inválido recusa antes de montar frame; cancelAbortError sem results; todos24framesRemaining0. Frames nãoaboutblank apontam exclusivamente analysis.html na origem runtime distinta; sem execução do jogo/import turtle, só compilação estrutural. Nenhum erro de página/request externo inesperado.

Limite de qualificação: helper de produção refine/contextEnvironment/runPythonActivity + CPython3.14.2 WASM real em Chrome/Edge, HTTPBun com AuthorizeAuthoringRuntimeService/policy reais, ator staffQA fixo e draft port em memória. Não cobre autenticação BFF/session/gateway/SQL/SDK/UIAdmin integrada nem desempenho. Nenhum browser/build/TSC/Docker pesado reexecutado pelo revisor. 098meta1/1/0 conferida após readback; nenhuma segunda issue.
