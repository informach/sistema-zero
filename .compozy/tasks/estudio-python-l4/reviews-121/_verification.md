# VERIFICATION REPORT

- Claim: coletores completos pedem gzipinterno pela rota lógica proibida, impedindo exportação da nova distribuição.
- Command: `bun test ./.cache/review121-compressed-consumers.test.ts`, cwd raiz.
- Executed: sim, exporthelper/Core/project/catalog/snapshot/store/registry reais; transporte fetch encaminha ao registry, runtimebytes inertes.
- Exit code:1; output0pass/1fail/1assert. Arquivos lógicos200, primeiro `_http/gzip/340d...gz`404, erro real do loader. Sem interpreter/browser/build/SDK/workerd/SQL/Docker.
- SDK impact: cadeia de fontes lida `withIsolatedPythonProject → distribution.files → readRuntime → registry.serve`; não alegada execução SDK nova. Mesma raiz agrupada, não duplicar issue.
- Verdict:121001high pending triage, meta1/0/1. Preservar contratos de namespace/pin/completude; sem fix implementado pelo revisor.

## Integridade do build (escopo anterior, sem aprovação funcional)

- Independente `bun run ./.cache/review-http-compression-build.ts`, exit0: antigos26/novos39 arquivos tamanho+SHA, canonicaldistributionhash4a/f67a,12gzip recriados pela receita atual byteiguais e roundtrip descomprimido igual a cada arquivo lógico, timestampszero; receita arquivada igual.
-22/26 lógicos byteiguais, diferenças SOURCES+inspect/playtest/standalone. Cada bundle +951B contém novas propriedades/mensagens CorehttpRep; minifier renomeia identificadores globalmente, portanto não alegar equivalência semântica completa com esse diff. Seis módulos somam2953347→648494B de artefatos; não é tempo/throughput observado.
- Relatório independente `.cache/studio-python-l0/review-http-compression-build.json`; nenhum build novo ou navegador pelo revisor. Prova browser/SDK/export com nova distribuição continua gate próprio, e o defeito acima impede assumir compatibilidade dos coletores.

## Revalidação121 após conjunto lógico explícito

- Fonte revista: Core `studioPythonLogicalFiles` exclui somente artifactPaths declarados no deployment verificado; export, staging SDK e preparedPythonBrowserOptions usam esse conjunto. Metadata integral/pin permanecem preservados. Mapa Node importa helper do contrato gerado, compara cardinalidade/caminhos/SHA/tamanho com conjunto lógico do deployment integral verificado e mantém routes fechadas. Namespace `_http/gzip/` público continua404.
- Original reproduzidor sem enfraquecimento: `bun test ./.cache/review121-compressed-consumers.test.ts`, exit0,1/2. Depois fortalecido com fullmetadata/pin reverify, todos bytes lógicos, ausência de HTTPinternal e404 direto; executado com `./packages/studio/src/export/__tests__/pythonCompressed.test.ts`: exit0,3/61 (Classic+Pro permanentes +cache).
- Staging independente `bun test ./tests/python-inspection.test.ts --test-name-pattern 'compressed deployments'`, cwd Runtime, exit0,1/6,15 casos filtrados explicitamente. Registry e coletor reais; SDK port controlada, executado0, created/destroyed1; não CPython/SDK qualificado.
- Mapa Node/FS independente `bun test ./tests/python-browser-resources.test.js`, cwd Runtime, exit0,6/29. Inclui metadatafull/pin/logicalexact, missing/duplicates/hash/size, junctionescape e rotas externas/escritas negadas. Sem browser/workerd/Docker/build/TSC.
- Total independente10/96. Root red permanente before1 lido:20pass/2fail/100assert (SDKregistry404 e logicalmap mismatch); after1 lido22/110. Mantém121VALID/unresolved/meta1/0/1 até freshTSC/regenprofilecheck da raiz. Nenhum novo achado confirmado; qualificação runtime/SDK/browser com imagem/distribuição nova continua gate separado.

## Fechamento121001

- Fonte atual relida: helper Core130, export82, staging116/preparedoptions212 e mapa Node89 continuam usando somente artifactPaths declarados para derivar conjunto lógico, sem alterar deployment/pin integral.
- Recibos reais lidos: `l8-http-compression-runtime-typecheck-8.receipt.txt` exit0 time12:45:21.1269710-03:00; `runtime-test-typecheck-8` exit0 time12:45:24.6310574-03:00; `studio-typecheck-8` exit0 time12:49:28.3422988-03:00. Execuções da raiz, não do revisor.
- Raiz reportou genvalidationprofile+--check exit0 após coleta dos TSCs. Revisor leu JSON atual `packages/studio-runtime/runtime/validation-profile.json`: profileVersion1/runtimeFingerprintbd560c69d4419d3a119136ca2b0104d8d22f4ff790b0908f68a9c3f322cc67f0; não executou geração/build. Contrato Node gerado foi importado e exercitado nos6testes FS independentes já documentados.
-121001 resolved, decisãoVALID preservada; meta1/1/0, YAML/counts readback. Independente10/96 e gates frescos suportam somente compatibilidade/captura/fechamento dos coletores. Build3, imagemSDK, browser/exportE2E e desempenho novos continuam pendentes próprios; nenhuma aprovação global.
