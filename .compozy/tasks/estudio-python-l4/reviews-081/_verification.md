# Evidência adicional: controlador com SDK real local

Comando independente leve: `bun .cache/review081-sdk-owned-artifacts.ts f304b06c-e865-46e0-a2f4-852611b52185`, cwd packages/studio-runtime, exit0.

Artefato preservado do implementador: `.cache/studio-python-l0/inspection-sdk/f304b06c-e865-46e0-a2f4-852611b52185/`. Execução original result.exit0, um único envelope verifiedtrue. A verificação independente aplicou Core verifyStudioPythonStructureEvidence ao relatório e ao snapshot exato; conferiu SHA dos bytes dos4arquivos, facts completos (BOM/import/raise sem execução, vazio, generic[T]/comprehensions/alvos sintáticos, PEP263Latin1), revision `eea67b8ff7b059ded4ac2692a48238602aca22806ab1f761fa96351d383e904c`, runtime `0dc9d3b450a13930be19755d7cb33d187dc13c84d1eae1e4b2eb197c134e0783`, CPython3.14.2.

Deployment/marker verificados pelo Core; SHA e tamanho de todos23arquivos da distribuição staged conferidos. Fontes staged index/DOcontroller/requests/Corejob têm SHA idênticos às fontes atuais deste recorte. Fixture staged estende a classe de produção e chama super.createOwnedSandbox/getSandbox real, sem ProxyRequest/abort injetado. Configuração confirma SDK0.10.3, namespace DO com migrations, R2local remote:false e handler de produção. Perfil `d01557e2b836b764597d98dc7725603a1ad611fb654cf0d04e8808b53a5ad17a`; Dockerfile preserva EXPOSE3000, USERnode e ENTRYPOINT/sandbox.

Cleanup before contém somente proxy do nonce owned db8889561f604d348a2578e3fadb0b9e; after está vazio. Esta conferência lê evidência de execução real local do implementador, sem repetir SDK/Docker/workerd. Não qualifica cancelamento novo (ainda separado/pendente), Cloudflare remoto, consumidores ou desempenho. Duração funcional18.867s não é amostra de performance controlada.

## Cancelamento explícito no SDK real local — conferência posterior

`bun .cache/review081-sdk-cancel-artifacts.ts b750560c-0c98-4e62-a9be-c906812f5f66`, cwd packages/studio-runtime, exit0. Artefato original result.exit0/verifiedtrue/cancelledtrue; native runner só confirma depois de assert408/REQUEST_RETIRED/semreport, remove200 e created/execStarted/execFinished/destroyStarted/destroyFinished todos1. Também verifica execFinished0 antes de enviar o cancelamento, portanto não cancela uma execução já concluída nesse cenário.

Fixture staged realmente passa por HTTP autenticado inputs/remove → index de produção → namespace/job DO proprietário → destroy do SDK0.10.3. Não contém ProxyRequest, newAbortController ou leitura env.PROOF_CANCEL; o sinal não é injetado no request do Worker. Foram conferidos marker/deployment, bytes/hash dos arquivos fonte e todos23arquivos da distribuição, SHA das fontes críticas staged contra as atuais, perfil d01557 e cleanupbefore somente proxy owned b76eb9ac778343c4bf0400ec6d067803/after vazio.

Stderr conserva RPCTransportError/Uncaught após dispose, igual ao controle de fronteira DO previamente preservado, no qual o caller captura a rejeição e retorna200. A mensagem isolada não demonstra rejeição não tratada no coordenador; não se afirma stderr vazio nem se suprime o diagnóstico. Qualificação estreita: cancelamento explícito desse cenário local real, sem depender da propagação de socket/disconnect. Não qualifica recuperação SDK após reset, Cloudflare remoto ou consumidores ainda não ligados. Perfil/imagem d01557 são a baseline antes do novo módulo Core python-activity-structure, sem alegar imagem atual após essa adição.

## Avaliador estrutural Core — revisão limpa

Novo módulo python-activity-structure.ts e additions em python-inspection.test.ts lidos integralmente. `bun test ./.cache/review-python-structure-evaluation.test.ts src/studio/python-inspection.test.ts`, cwd Core: exit0/8pass/64assertions. Prova independente prepara o avaliador com relatório/snapshot reais de4arquivos da SDKownedstructure; confere escopo por arquivo, nomes Unicode/typeparams, funções, alvos exatos t.forward/factory e recusa inferir turtle.forward ou factory().method. Evidência ausente, compilação falha, arquivos omitidos e revisão/runtime/versão trocados recusam a preparação, sem fornecer false que possa virar aprovação negativa. Report e metadata permanecem detached durante await e chamadas repetidas; verifiedBy, regra JS e caminhos inválidos são recusados. Biome2arquivos exit0.

Nenhum achado novo confirmado neste módulo; não foi criada rodada082 vazia. A função continua uma avaliação pura de fatos sintáticos, sem conceder autoridade. Ligação UI/Members/consumidores e nova imagem permanecem fora dessa aprovação.

## Reset do proprietário e recuperação do cleanup SDK — conferência posterior

`bun .cache/review081-sdk-restart-artifacts.ts eec4a300-8c6a-4741-af6e-f8e80049abf4`, cwd Runtime, exit0. Artefato original exit0/verifiedtrue/restartRecoveredtrue. Native runner observa execStarted1/execFinished0 antes de invocar ctx.abort real por endpoint local da fixture; depois exige falha408/500/503 sem report e remove autenticado200. O owner novo recompõe o mesmo endereço SDK e confirma cleanup.

Verificação independente aplicou verifyStudioPythonInspectionJobState/verifyStudioPythonExecutionMetadata: jobId recalculado, ref/nonce/owner/execution/project/revision exatos; stateVersion4/statuscancelled/sandboxCreatedtrue/cleanupConfirmedtrue. Nome estável SDK `py-inspect-sf3u4mckahgivtrl5ryfdfvis74h7ulplqxoy4salzmogk4et4hq` (63). Contadores da NOVA geração: created1 corresponde ao lookup; execStarted0/execFinished0 não comprovam término do exec original perdido; destroyStarted1/destroyFinished1 comprovam o ACK observado de recuperação. Não confundir gerações.

Todos23arquivos de runtime/hash/tamanho, fontes originais, marker/deployment, SHA das fontes críticas staged contra atuais e cleanupownproxy274bf8324596487498b3f3f7cc4b4aeb→empty conferidos. Perfil baseline `b4006bff667f07357931d9e906dff8ef7b5883ee8008e4ed656f244c685cb319`, anterior ao helper Core de player. Diagnostics EXPECTED_LOCAL_PYTHON_SDK_OWNER_RESTART e RPCTransportError permanecem preservados. Prova é local SDK/R2/DO/Docker, não recuperação Cloudflare remota nem benchmark.

## Helper Core de página do player — revisão limpa

python-player-page.ts/test e pythonWebTemplates.ts lidos integralmente. `bun test ./.cache/review-python-player-page.test.ts src/studio/python-player-page.test.ts`, cwd Core: exit0/4pass/38assertions. Prova independente compara HTML/CSS atuais byte-a-byte com o pacote real anterior preservado em web-export-browser-3-final/...chrome/exported-package e confirma identidade. Opção remota modifica somente src do módulo, aceita HTTPS ou HTTP loopback canônico e rejeita identidades/caminhos/protocolos/credenciais/query/hash inseguros. Aprovação da origem continua responsabilidade do caller servidor; URLs do projeto não entram no helper.

`bun test src/export/__tests__/pythonWeb.test.ts`, cwd Studio: exit0/8pass/64assertions, com ZIP Classic/Pro, nomes200, fontes preservadas, hashes/limites e revogação/cancelamento. Biome3arquivos exit0. Nenhum achado novo, nenhuma rodada082 criada; teste browser de regressão do novo compartilhamento pertence ao implementador e ainda estava em andamento nesta conferência. Não qualifica preview remoto nem feature global.
