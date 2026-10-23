# Revisão e revalidação independente 085

Escopo completo lido: Core python-preview.ts e split python-preview-input.ts, Runtime python-previews.ts, servidor python-distributions.ts (delta frame-ancestors self), testes/fixtures do recorte e plano preview/CSP. Sem wiring endpoints/client/UI (em execução separada), browser/SDKpreview ou fontes de produção/testes permanentes alterados pelo revisor.

Três achados novos VALID, corrigidos pelo implementador e revalidados; metadata3/3/0. Severidades high1/medium2.

Antes: `.cache/review085-previews.test.ts`, fixture port sintética copiada/adaptada para cache, módulosprod/Core reais e sem mock.module: exit1/0pass3fail. Troca de signal permite publish após owner abortado; ACK perdido mantém store pendente; schema inválido bloqueia coleta posterior. Extensão da issue002 server-markerbodycancel: exit1/1fail, requestabort não encerrava handler sem ACK.

Após correções:

- `bun test ./.cache/review085-previews.test.ts`, cwd Runtime: exit0/9pass/24assertions. Originais+servercancel, arquivos/marker realmente gravados após cancel/cleanup inicial são retirados por late-ACK cleanup e record permanece; get/body/delete GC operacional preservam checkpoint/record para retry.
- `bun test tests/python-previews.test.ts tests/python-distributions.test.ts`: exit0/18pass/138assertions. Permanentes novos preservam captura de opções, cancelamento missingACK, cancel body ACK e progressão com record inválido, além de markerlast/CSP/authoreddata/path/expiry/legacydistribution.
- `bun test src/studio/python-preview.test.ts`, cwd Core: exit0/4pass/37assertions.
- Biome7 do Core preview/input/test, Runtime previews/distributions/tests: exit0, Checked7files/No fixes applied.

Aspectos conferidos: launcher/CSS fixos gerados, fontes/assets inert binary com attachment/nosniff/sandbox; CSP restrita ao runtime versionado/prefixo do preview, sem wildcard/eval/inline; self explícito na cadeia runtime e ancestrais host aprovados; budgets separados dos JS; paths portáteis e roles estritos; metadata/report/source/capture vinculação; recordfirst/markerlast; GC somenteprefixowned e cursor após exclusão. Nenhum outro achado confirmado.

Limites: testes de portas e headers não comprovam enforcement CSP no navegador, R2 real, SDKpreview, integração de endpoints/UI, remoteCloudflare ou desempenho. Nenhuma execução pesada/processo próprio em andamento.
