---
status: resolved
file: packages/studio-runtime/src/python-distributions.ts
line: 291
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Workers comprime novamente a representação gzip armazenada

## Review Comment

A rota seleciona um artefato já comprimido, declara Content-Encoding:gzip e retorna new Response(object.body,{headers}) sem encodeBody:'manual'. No runtime Workers, o padrão automatic aplica novamente a codificação indicada no header. O cliente que descomprime uma vez recebe outro gzip em vez do módulo JavaScript, impedindo carregar os módulos negociados; os bytes transmitidos também divergem do SHA/ETag da representação registrada. A documentação oficial exige manual ao servir conteúdo pré-comprimido: [Response/encodeBody](https://developers.cloudflare.com/workers/runtime-apis/response/#the-encodebody-option).

Prova nativa preservada pela raiz: `.cache/studio-python-l0/probe-cloudflare-precompressed-response.mjs` e `cloudflare-precompressed-response-2.{json,log}`. Miniflare instalado via Wrangler4.120.1, Windows workerd5.20260804.0-alpha, compatibilityDate2026-07-01 igual à produção, HTTP Node cru sem decodificação automática. Automatic transmitiu70B/SHA d2ad9b73c7ef1b17022d8da48f91294777bbf75aac5396b4e54e6f4e4659c235; um gunzip resultou no gzip original66B/SHA340d352b8734330d47242f9018da890a5b36255814fa83dea46173bea0abfb03. Manual transmitiu66B exatos e um gunzip correspondeu ao módulo lógico SHA8643aac16714b2468906d0a56a3a9020a59d08b30097ab682ce535581b5ba342. O log registra dispose do Miniflare/workerd próprio.

O revisor leu o script/artefatos/fonte/documentação, conferiu a opção nos tipos instalados (index.d.ts2106), e recalculou independentemente os SHA/tamanho do fixture lógico+gzip e as relações arquivadas (Bun puro, exit0). Não repetiu workerd. Essa prova usa Response nativa com Uint8Array, ainda não o corpo R2 da rota real; a raiz está preparando permanente registry+R2 real antes do patch. Não alegar deploy remoto falho, Content-Length de R2 já comprovado ou qualificação de browser/SDK.

Definir encodeBody manual ao devolver bytes pré-comprimidos na fronteira Workers, preservando identity e respostas sem corpo. Confirmar a rota real com R2/workerd/HTTP cru: wireSHA e tamanho iguais ao artefato, um gunzip igual ao módulo lógico; verificar HEAD/304 e integridade sem depender apenas de Response Bun ou headers sintéticos.

## Triage

- Decision: `VALID`
- Notes: A reprodução permanente da rota real com upload/registry de produção e R2 nativo confirmou a falha antes do patch (`l8-http-compression-cloudflare-before-6.log`). HTTP cru na entrada direta workerd: gzip transmitiu70B em vez dos66B declarados e um gunzip ainda devolveu gzip. Identity2500B/SHA/ETag, HEADgzip66B sem corpo,304 e406 passaram; políticas retired200/revoked404 e dispose próprio confirmados. Fix: `encodeBody:'manual'` ao devolver representação gzip, inclusive respostas sem corpo, sem alterar identity ou aprovação. Nenhum wrapper do handler real recria a Response nessa rota.
- Harness: before1..3 falharam na inicialização usando `scriptPath` de temporário Windows. A API pública `script` recebe os mesmos bytes compilados e iniciou corretamente; trocar Bun por esbuild não resolveu e foi revertido. Before4 usou o proxy público Miniflare, que negocia/transforma encoding independentemente; não é prova de wire da origem. Before5 registrou acesso direto não habilitado. Before6 usa opções públicas tipadas `unsafeDirectSockets` apenas em localhost/porta efêmera e `unsafeGetDirectURL` para medir a origem real. A integração do proxy permanece uma superfície separada a verificar; não afirmar que essas diferenças são defeitos do produto.
- Resolution: Revisor conferiu fonte com manual somente gzip em GET/HEAD/304, fixture e artefatos completos antes6/depois1; probe puro `.cache/review119-platform-evidence.ts` exit0 recalculou SHA/tamanho e validou controles/cleanup. Recibos frescos Runtimeprod/testTSC3 lidos (2026-10-18T12:31:02/05-03:00), ambos exit0, incluindo patch e três permanentes wire. Fecha somente dupla compressão na origem workerd/R2 local; não declara integração do proxy/cf.clientAcceptEncoding, browser, SDK comprimido ou desempenho qualificados. Falha de orçamento do harness é separada119002, ainda aberta.
