# Evidência independente inicial

Recorte: contrato de validação de duas fases, admissão DO, ingresso e cliente S2S compartilhado. Nenhuma fonte ou teste permanente alterado pelo revisor. Sem TSC/build/browser/Docker/workerd próprios.

- `bun test ./.cache/review084-phase-authority.test.ts`, cwd Studio Runtime: exit1, 0pass/2fail/6assertions. Retirada de configuração e revogação de release durante compile permitem segundo exec; response409 e destroy1 passam. Issue001 high/pending.
- `bun test ./.cache/review084-admission.test.ts`: exit0, 2pass/12assertions. Classe prod e SQLite real; portas de handler/SDK controladas em processo isolado. Captura de receita, equivalência normalizada, mudança de modalidade/receita, terminal e precancel.
- `bun test ./.cache/review084-client.test.ts`: exit0, 3pass/30assertions. Cliente Core real com portas controladas, bytes exatos, receita capturada antes dos awaits, resposta com receita trocada recusada e autorização retirada durante cleanup recusada na aceitação final.
- `bun test src/studio/python-playtest.test.ts src/studio/python-inspection-job.test.ts src/studio/python-validation-input.test.ts`, cwd Core: exit0, 12pass/112assertions.
- `bun test tests/python-requests.test.ts`, cwd Runtime: exit0, 13pass/83assertions. O log operation failed pertence à negativa esperada e a suite passou.
- Biome dos nove arquivos do recorte: exit0, Checked9files/No fixes applied.

As primeiras tentativas de criação do probe próprio foram corrigidas antes da reprodução válida: filtro Bun sem prefixo ./, conteúdo SHA com campos de metadata extras e omissão de AbortSignal no store. Não são achados do produto. O probe de SQLite também foi ajustado para executar SQL imediatamente, como a porta real.

Não há qualificação do SDK de duas fases, preview, consumidores ou desempenho neste recorte.

# Revalidação após correção

Issue001 VALID/resolved; metadata 1/1/0.

- Probe original de retirada configuração/release: exit0, 2pass/6assertions.
- Mesmo probe ampliado com input fechado, marker retirado e configuração retirada durante resolve do fence: exit0, 5pass/15assertions. Nenhum segundo exec; destroy1 em todos.
- Admission/DO+SQLite própria ampliada: exit0, 3pass/19assertions. Falha de host após createOwnedSandbox confirma cleanup, state failed e readmissão410. Portas controladas não qualificam SDK real.
- `bun test tests/python-requests.test.ts tests/python-inspection.test.ts`: exit0, 30pass/176assertions. Inclui regressão permanente de retirada config/release/input antes de executar, negativa de relatório delegado e legacy/duas fases/cancelamento/cleanup5s.
- Biome dos quatro arquivos de implementação/regressão tocados no fix: exit0, Checked4files/No fixes applied.

Leitura integral do common owner e coordenador de fases, mais integração do handler: callbacks capturados antes dos awaits, fence antes da fase autoral usando step/check e teardown preservado fora da autorização de execução. Nenhum outro achado novo confirmado. Nenhum processo próprio ou execução pesada em andamento.

# Conferência posterior da evidência SDK local de duas fases

`bun .cache/review084-sdk-validation-artifacts.ts 6084c90f-5bfd-486a-ab0f-004b4c3d3b94`, cwd Runtime: exit0/verifiedtrue. Somente leitura de artefatos; nenhum SDK/Docker/browser iniciado pelo revisor.

Core valida relatório composto, receita, inspeção estrutural completa e estado do job. Cinco fontes exatas (BOM, Latin1, vazio, helper e bindings), runtime com 24 arquivos e marker verificados por tamanho/SHA. Revisão `7b26b2a3f7697870014a85c5d7e9b8392c3f452cbae96c414c6871a825d92780`; runtime `caac9c503386da3b96a5cfb9afc40ec3f175550420be7c9b7a5ce92cdf873fe6`. stdout Unicode `sdk-validation-ação` e stoppedtrue.

Estado persistido succeeded/version4, operação validate/receita exata, propriedade SHA do input validada pelo Core; contadores created1/execStarted2/execFinished2/destroyStarted1/destroyFinished1. Log preservado comprova compile→exec→destroy no mesmo sandbox. Fixture estende DO de produção e usa super SDK0.10.3; ingresso/defaultfactory/namespace/R2 local conferidos, sem ProxyRequest.

Fingerprint recalculado diretamente dos arquivos staged, sem regenerar/build: `db59cf69ef1921c0e630ed5cd3a4d70f8b6959d3a964b2c970522cda1164d2ac`. Fontes críticas staged/current com SHA igual; Docker COPY/EXPOSE/USER/ENTRYPOINT e log da imagem `cloudflare-dev/probuildsandbox:b3ab59ff`, config `1509ceeb1156d10412d66ae45e385cf549cda9b756aafc3a19fde0a1003dbac9`, conferidos. Cleanup preservado contém somente proxy do namespace exato e termina em []. Não houve consulta global Docker pelo revisor.

Qualificação limitada a este cenário local real de console/duas fases/estrutura. Turtle, cancelamento na segunda fase, preview/consumidores, Cloudflare remoto e desempenho não são comprovados por este artefato. Rodada continua 1/1/0, sem novo achado.

## Evidência Turtle posterior

Mesmo probe adaptado para `3aef2304-aea9-415f-89ab-17a0080fde1a`: exit0/verifiedtrue. Core valida relatório composto/estrutura completa/estado succeeded/version4/receita gráfica exata; fontes5 e PNG de entrada hero.png (70 bytes, SHA/tamanho/header PNG) conferidos. stdout `Nome?ola Lia`, `key-fired`, `click-fired`; stdinRequests/submitted1, key1, click1, stoppedtrue. Os 24 runtimefiles, marker e fingerprint db59cf69 foram novamente verificados; fontes críticas staged/current iguais.

Revisão `1dd2b7e656fba55fda3aa1da3445f049f8637c8da20082b39553293360f19bc9`; runtime `8ec4dc81bf2e5ef3f6e50660f70ff01d356b4b2c216ebdcd33735acc07b719e5`. Log compile→exec→destroy no mesmo sandbox e contadores1/2/2/1/1; imagem e4ad3c01/config1509ceeb. Cleanup somente proxy do nome exato→[].

Capture metadata estrita: 320×240, frameSequence7, 2602 bytes, SHA `d41aa7876579fdfe087fe91fbcb23152e9bb7e69595945c339c53371466a1973`. Código staged/current do serviço confere readFile base64 e verifyStudioPythonPlaytestCapture antes de aceitar o resultado. **Os bytes do PNG de saída não foram arquivados e o SDK foi destruído: esta conferência independente não recalcula o SHA nem valida o header da imagem de saída.** O PNG de entrada é um arquivo diferente e não substitui essa evidência ausente. Sem rerun pesado e sem novo achado; cancelamento de segunda fase segue em prova separada.

## Cancelamento após admissão SDK da segunda fase

`bun .cache/review084-sdk-validation-cancel.ts 3d42277e-86c2-4fb3-b2d0-db61ba51ba00`: exit0/verifiedtrue, leitura dos artefatos preservados. Fixture nativa aguarda e exige execStarted2/execFinished1 antes da chamada autenticada inputs/remove; após remove200 exige resposta408/REQUEST_RETIRED/semreport. O resultado salvo e Core jobstate comprovam cancelled/version4, recipe validate exata, sandboxCreatedtrue/cleanupConfirmedtrue; contadores finais1/2/2/1/1.

Fontes/asset6, runtimefiles24, metadata/revisão, marker e fingerprint db59 recalculados; fontes críticas staged/current iguais, SDK0.10.3/namespace/R2local sem sinal injetado. Log demonstra compile bem-sucedido→inputs/remove→exec playtest retirado com RPCTransportError→destroyACK no mesmo sandbox. Imagem5345b6ba/config1509ceeb e cleanup somente proxy exato7034d1567c93→[] conferidos.

RPCTransportError permanece preservado; não se afirma stderr vazio nem se reclassifica o diagnóstico conhecido do boundary RPC como nova promise não observada. Limite: execStarted2 significa admissão da chamada SDK, **não comprova início interno do programa Python**. Não qualifica desconexão HTTP, reinicialização, Cloudflare remoto ou desempenho. Nenhum processo pesado foi iniciado e rodada permanece1/1/0.

## Recuperação após reinício durante a segunda chamada SDK

`bun .cache/review084-sdk-validation-cancel.ts c47884cc-c984-4115-af7f-1f383c604ad0 --restart`: exit0/verifiedtrue, somente leitura. Fixture exige execStarted2/execFinished1 antes de provocar ctx.abort no owner real; requer resposta409 do endpoint de reinício e remove autenticado200. A requisição original deve falhar com408/500/503 sem relatório, conforme a perda do owner. Resultado preservado cancelled/restartRecoveredtrue/semreport.

Core valida identidade SHA do input/ref e estado persistido cancelled/version4, sandboxCreatedtrue/cleanupConfirmedtrue, structuretrue e operação validate com receita gráfica exata. Contadores do **novo owner** lookup1/execStarted0/execFinished0/destroyStarted1/destroyFinished1: a recuperação endereça o SDK estável e confirma destruição; estes contadores **não provam conclusão da execução original**. Log preservado registra compile success→restart→remove→retirement RPC do exec playtest→destroyACK no mesmo sandbox. Diagnósticos EXPECTED_LOCAL_PYTHON_SDK_OWNER_RESTART e RPCTransportError permanecem preservados.

Fontes/asset6, runtimefiles24, revisão/runtime iguais ao cenário Turtle, marker e fingerprint db59 recalculados; fontes críticas staged/current iguais. Nome estável SDK63 caracteres via Core; namespace/SDK0.10.3/R2local sem ProxyRequest/AbortController injetado. Imagem conserva config1509ceeb. Cleanup contém somente proxy do namespace exato a8541e570980 e termina em []. Sem consulta global Docker, rerun pesado ou fontes de preview alteradas pelo revisor. Limites: admissão SDKexec2 não prova início interno Python; não qualifica desconexão HTTP, Cloudflare remoto, preview/consumidores ou desempenho. Sem novo achado, rodada1/1/0.
