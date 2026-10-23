# Evidência independente inicial 086

Recorte wiring completo lido: Core runtime-client/validation-input/validation responseBytes, Runtime requests/inspection-job/index, maintenance-cursor/preview-maintenance/input-maintenance e MemberShell reexport. Preview no mesmo job, parent capturado na operação, sandbox destruído antes de storage, config/originenv fences, delegatedref, cursor independente e contratos legados conferidos. Nova decisãoDO/discard/retention está sendo implementada para issue001, ainda não revalidada.

Achado high VALIDpending: `bun test ./.cache/review086-preview-final-fence.test.ts`, cwd Runtime, exit1/0pass2fail/14assertions. Handler real responde410/408 após inputclose/abort na última aprovação, mas preview jácommitado ainda serve200. Created1/destroy1/exec2 passam. Porta SDK, relatórios e bytes sintéticos; store/input/registry/serve/owner reais. Nenhum browser/SDK/R2 pesado.

Outras provas leves:

- `bun test ./.cache/review086-admission.test.ts`: exit0/4pass/24assertions; DOclasse+SQLite, portas controladas isoladas. Parent capturado antesawait, retry não pode retirar/substituir preview; receita/modalidade/terminal/pre-cancel preservados.
- `bun test ./.cache/review086-maintenance.test.ts`: exit0/1pass/5assertions. Coletas simultâneas usam prefixes/cursors/checkpoints independentes e checksums reais.
- `bun test tests/python-requests.test.ts tests/python-input-maintenance.test.ts`: exit0/19pass/135assertions. Preview apósdestroy, recusa config/origins, legacyrequests/fences e commoncursor.
- `bun test tests/studio-python-runtime.test.ts`, cwd MemberShell: exit0/1pass/3assertions; wrapper exige saída child positiva/0fail/exit0 em realm HTTP nativo isolado. Não qualifica runtime Cloudflare/CPython real.
- Biome10 arquivos do recorte: exit0, Checked10files/No fixes applied.

Nenhum outro achado confirmado. Fontes/testes permanentes não alterados pelo revisor; somente cache e reviews. SDK antigo db59 é baseline anterior ao novo wiring, não qualificação da imagem corrente. UI/browserpreview/SDKnovo/remoto/performance fora desta conclusão. Nenhum processo próprio ou execução pesada em andamento.

# Revalidação final

Rodada2/2/0: issue001 high e nova issue002 medium VALID/resolved. Issue002 foi introduzida pelo novo estado opcional previewRetired: undefined explícito removia true e previewAvailable voltava a true. Prova antes: filtered0pass1fail/2assertions. Guard agora rejeita campo explicitamente presente diferente de true quando flag játrue, preservando updates semcampo.

Provas independentes após correções, todas exit0:

- `.cache/review086-preview-final-fence.test.ts`: originais2/16 com authorize obrigatório controlado=true (não 404 por callback ausente). Suite ampliada3/28: marker retirado após closure/abort final; preview válido preservado após normalinputremove; decisão obrigatória consultada duas vezes, cópia de manifesto separada e retirada durante storage recusa resposta mesmo com marker existente.
- `.cache/review086-admission.test.ts`:7/55; classe prod/SQLite real com portas controladas isoladas. Parent imutável, terminal/precancel, normalcleanup preservaavailability, retention apósinputTTL, nova instância lê succeeded ou running/failed corretamente, foreigndiscard recusado, explicitdiscardpersistido, false/undefined não reabrem, purge sóapósretention. Nova instância não é qualificação de ctx.abort real/SDK.
- Permanente controlledcontroller wrapper filtrado:1/2, Bunchild isolado, sem workerd iniciado pelo revisor.
- Corepreview+inspectionjob:7/65; Runtime requests+previews:27/194; MemberShell nativeHTTPwrapper1/3 incluindo negativas antes/apóscleanup e refmissing/tampered. HTTP/BFF usa portas/relatórios sintéticos, não execução CPython real.
- Biome9 fontes de correção, mais fresh2 previews/jobstate: exit0.

Evidência real preservada do implementador: `.cache/studio-python-l0/job-controller/6dcabf2c-deca-4d23-83ca-1b7bd80bc276/result.json`. Conferência própria `.cache/review086-workerd-artifacts.ts`:exit0/verifiedtrue; result.exit0 e stdout verified/controller/sdkfalse/resetPreserved/previewDecision/previewRetention/previewDiscardReset. Log wrapper2pass/0fail/4assertions. Fixture terminal semeada com identidade Core, produção DO/SQLite/RPC reais, local forceLocal/containersdisabled, alarm após inputTTL não purga, normalcancel preserva, ctx.abort/restart conserva decisão, foreigndiscard recusa, discard+restart conserva retirada, purge24h qualificado com relógio passado via API de teste confiável (não espera real24h). Diagnósticos negativos foreignowner/schema/earlypurge preservados; sem claim stderr vazio. O baseline b3f7af48 anterior só contém resetPreserved, não qualifica extensão preview.

Revisão de código confirma descarte persistido também em falha outer/ingress, não apenas deleteR2 best-effort; cleanup normal após sucesso não descarta. A nova permissão allow-forms limita-se ao launcher fixo confiável e form-actionnone permanece; inner Python opaco continua com policy sem allow-same-origin. Enforcement navegador dessa composição segue qualificação separada do implementador.

Nenhum novo achado pendente. Sem SDKpreview atual, Cloudflare remoto, UI, performance ou featureglobal concluídos por esta revisão. Fontes/testes permanentes intactos pelo revisor, nenhum processo pesado/próprio ativo.

# Conferência posterior browserpreview3

Evidência `.cache/studio-python-l0/preview-browser/33579a8a-ea14-4f16-804d-0ce83cea2e91`, log l6-python-preview-browser-3, execução do implementador EXIT0. Probe próprio `.cache/review086-preview-browser-artifacts.ts <uuid>` exit0/verifiedtrue, somente leitura de arquivos/Core. Fontes dos dois harnesses atuais lidas: verify-python-preview-browser.ts e python-preview-browser.mjs. Delta posterior à execução: CORS Allow-Origin parent específico e tipos Promise<Response>; allow-forms já estava presente na prova3. Não se atribui enforcement browser ao novo delta CORS sem nova execução.

Core verifica snapshot, composedreport/estrutura, previewmanifest, referência/origens, canonicalrecord SHA, marker e bytes/hash dos9arquivos de preview,4arquivos de projeto e24artefatos runtime. Releasehash recomputado com createStudioRuntimeRelease usando descritores e contrato real do harness: runtime551ae876ffa9c1198c386ee80c625186c27c6237bd7913811165f35c8246699d, revisão079af132876f342ebfdf1db4c9a09eccbfd693df6fcbdafc1f969062bdbdce65. Launcher/CSS armazenados são byte-iguais ao helper fixo Core; payload/report e arquivos autorais pertencem ao mesmo snapshot. Fingerprint da validação e*64 é sentinela QA explícita, não fingerprint da imagem SDK.

NativeNodeinspect/playtest exit0, CPython3.14.2 com estrutura/Turtle/PNG/inputLia/Space/click/STOP. Captura nativa E cópia armazenada realmente arquivadas, byte-iguais e verificadas independentemente com Core:320×240/seq7/2602bytes/SHA d41aa7876579fdfe087fe91fbcb23152e9bb7e69595945c339c53371466a1973. A limitação da captura SDK anterior não é confundida com esta evidência nova. Downloads interativos Chrome/Edge são outra sessão/inputBia:2607bytes, PNG320×240, SHA f1c959c4597d665c265dc7374f746a47d4ef34f787a106fc7e486521e2798fb6, distintos do capture nativo.

Browserresults e observations concordam: Chrome+Edge passedtrue, errors[] e unexpectedRequests[]. Asserts do produtor conferem inputBia/stdout, Space/key-fired, click-fired, inneriframe sandbox exato allow-scripts allow-pointer-lock, download, stopframe0, restart novo input e width390/bodysemoverflow; screenshotsresponsive390×844 válidas e Chrome inspecionada visualmente com controles/input visíveis. Capturas de página inteira844px não estão sujeitas ao teto768px da captura do runtime; o probe próprio corrigiu essa distinção, sem mudar produto/limites.

Negativas: ancestor desconhecido e outer opaco não chegam ao input; console preserva bloqueio CSP frame-ancestors e CORS originnull de payload. Warnings TrustedScript/Function constructor também permanecem; não se afirma console vazio. Não há journal detalhado de cada assert: conclusão usa sourceasserts lidos após execução, resultados/fotos preservados e EXIT0 informado pelo implementador.

Disponibilidade é porta controlada availabletrue/false, storage é portfixture; não prova DO/SDK/R2preview. O inputref não foi arquivado neste recorte: jobId é validado no schema do manifesto, não rederivado independentemente; DOownership/retention/reset têm a prova separada6dcabf. Código finally encerra browsers/servers/children próprios; nenhum check independente de processos ativos/globalDocker foi feito pelo revisor. SDK21688/d22 em execução naquele momento não é declarado aprovado. Sem rerun pesado, novo achado ou rodada adicional;086permanece2/2/0.

# Conferência posterior SDKpreview21688 concluído

Após encerrar EXIT0, evidência `.cache/studio-python-l0/inspection-sdk/405789f3-ff59-4a21-9baa-526e1137beeb` e log l6-python-preview-sdk-1. Probe independente `.cache/review086-sdk-preview-artifacts.ts <uuid>` exit0/verifiedtrue; somente leitura, nenhum SDK/Docker/workerd/browser iniciado pelo revisor.

Core valida composedreport/estrutura5, jobstate pre-reset succeeded/version4/cleanupACK, identidade SHA derivada do inputref completo, operação validate/recipe/previewparenthttpskids.test. Contadores originais created1/execStarted2/execFinished2/destroyStarted1/destroyFinished1. Console/input/key/click/Turtle com CPython3.14.2; duração14890ms é amostra funcional, não medição de desempenho.

Manifesto realmente arquivado2141bytes, SHA d9f548fa5de72d3b76813f1bf2a740c9eaf392a871be5c7e30581fc5ff3ffc01, jobId igual ao Corejob, referência escopada/originenv/expiry dentro da retenção. Todos11arquivos arquivados conferidos por SHA/tamanho:6projeto e5gerados. Payload/report/CoreHTML/CSS exatos. Captura REAL em linux/preview-artifacts/files/python-playtest.png, Coreverified bytes/SHA/IHDR:2602B/320×240/seq7/d41aa7876579fdfe087fe91fbcb23152e9bb7e69595945c339c53371466a1973. Runtimes24 e marker da distribuição também conferidos.

Fingerprint d22bae6fb5eaea34c0f943b1da61f77a1adabb08d34b3872525dce14b9e64f35 recalculado diretamente dos arquivos staged e igual ao manifesto (não sentinelaQA). Quinze fontes críticas staged/current com SHA igual no momento desta conferência, incluindo produção index/DO/SQL/requests/owner/playtest/previews/Coreownership/contracts e scripts readonly da imagem. Log imagem cloudflare-dev/probuildsandbox:fa36825f, config ba5c338bae117d78e3effe758eed0403a0fda9d104a6b7009e40bcb85c7ce63e; COPY conferido por source/exec. Log compile→exec→destroy no mesmo sandbox antes da leitura pública.

Fixtures staged usam superclassDO/SandboxSDK0.10.3/defaultprodhandler, R2remote:false em buckets separados runtime/input/preview, sem ProxyRequest/AbortController injetado. PublicGET real via produção/RPCDO obtém e arquiva cada arquivo200 com hash exato; asserts/flags provam preview200 após ctx.abort/reset, preview200 após inputs/remove, preview404 após previews/remove e segundo reset404. O jobstate JSON salvo é ANTES dos resets/descarte; decisão posterior é comprovada pelos asserts HTTP/flags, não por um snapshot final de previewRetired que não foi arquivado. Prova não usa o availableboolean do browserharness.

Cleanup preservado contém somente proxy do namespace exato bd13dd0af2f8 e termina em []; nenhum globalDockerps independente. Diagnósticos de ownerrestart esperados preservados, sem claim stderr vazio. Qualificação local SDK/R2/DO/CPython/nativeHTTP desse cenário; Chrome/Edge são evidência separada33579, browser4 ampliado ainda pendente nesta conferência. Sem Cloudflare remoto, integração UI/consumidores, performance ou featureglobal concluídos. Sem novo achado;0862/2/0 preservado.

# Conferência posterior browserpreview4

Evidência real preservada `.cache/studio-python-l0/preview-browser/f8049f64-dd26-4595-b20f-6d6bc72e0440`, log l6-python-preview-browser-4 EXIT0 do implementador. Probe independente `packages/studio-runtime/.cache/review086-preview-browser-artifacts.ts f8049f64-dd26-4595-b20f-6d6bc72e0440` executado em cwd runtime, exit0/verifiedtrue; somente leitura dos arquivos, sem rerun browser/SDK/build/TSC. Os dois scripts QA atuais foram lidos integralmente. Produto não alterado pelo revisor.

Core verifica snapshot/revisão4ae1ca090edcb962e55146fd9070dad9f0cdbf788f6ce573cab922ab90e9e670, report composto/estrutura, referência, origens, payload e ambos manifestos canonicalJSON/markers; todos os arquivos dos dois previews conferidos SHA/tamanho. Preview primário10arquivos, projeto5, runtime24; releasehash551ae876ffa9c1198c386ee80c625186c27c6237bd7913811165f35c8246699d recomputado. Segundo preview é controle storage-only com mesmo input/job, não uma segunda admissão de execução do produto. Inputref não arquivado continua limitando rederivação própria de jobId neste recorte.

Seis downloads autorais preservados (HTML/JS/SVG em Chrome e Edge) são byte-iguais às fontes do snapshot e correspondem a seus SHA/tamanhos. Asserts source exigem evento download, ausência de globalThis.attacked e ausência de request externo inesperado. O recurso do segundo prefixo é obtido200 por APIrequest antes do fetch no browser; este fetch falha e não incrementa o contador de rotas. Console dos dois navegadores preserva connect-src recusando exatamente o segundo payload existente e script-src recusando project/injected.js. Portanto negativas não dependem de arquivo ausente.

Novas flags de ambos resultados/observations: directAuthoredDownloads3/crossPrefixBlocked/authoredScriptBlocked/ancestorChainBlocked/approvedCorsHead true. Dois diagnósticos frame-ancestors por navegador correspondem a ancestor desconhecido direto e cadeia desconhecido→app→preview. HEAD feito por fetch real da origem app exige200; outer opaco originnull registra erro CORS com Allow-Origin igual à origem app, distinto de null. Warnings TrustedScript permanecem; errors[]/unexpectedRequests[] não significam console vazio. Não existe journal individual de asserts/headers; evidência inclui sourceasserts lidos após execução, JSON/fotos/downloads/console preservados e EXIT0.

Controles anteriores continuam: native CPython3.14.2 compile/estrutura/Turtle/inputLia/Space/click/STOP; captura nativa arquivada320×240/seq7/2602B/d41aa7876579fdfe087fe91fbcb23152e9bb7e69595945c339c53371466a1973 verificada Core. Sessões Chrome/Edge usam inputBia, captura interativa2607B/f1c959c4597d665c265dc7374f746a47d4ef34f787a106fc7e486521e2798fb6, stopframe0/restart/input/inner sandbox opaco. Screenshots390×844 válidas, Chrome inspecionada visualmente com controles e entrada visíveis.

Disponibilidade continua controlada pelo port boolean e fingerprint e*64 sentinela QA; esta prova browser não substitui DO/SDK/R2real nem fingerprint d22 da evidência separada405789f3. Cleanup verificado por fonte finally, sem consulta independente de processos. Nenhum achado novo, nenhuma rodada adicional;086permanece2/2/0. Sem qualificação de desempenho, Cloudflare remoto, consumidores/UI ou featureglobal.
