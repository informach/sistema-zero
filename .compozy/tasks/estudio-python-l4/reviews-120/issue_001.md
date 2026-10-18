---
status: resolved
file: packages/studio-runtime/src/python-distributions.ts
line: 241
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Negociação ignora Accept-Encoding original do cliente

## Review Comment

O seletor recebia somente request.headers.get('Accept-Encoding'). Cloudflare pode normalizar esse header para br,gzip e guardar o valor original em request.cf.clientAcceptEncoding. Usar o header normalizado perde a preferência identity e exclusões q=0 do cliente, escolhendo representação/ETag incorretos antes do proxy eventualmente transcodificar a resposta. A [documentação oficial Request](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties) descreve clientAcceptEncoding como o valor original quando Cloudflare substitui o header.

Evidência causal nativa local preservada em `.cache/studio-python-l0/l8-http-compression-cloudflare-proxy-observation-1.log`: o fixture chama store/registry reais com R2/workerd nativos, conserva a própria Response e apenas acrescenta headers QA observando os dois valores. Na requisição identity pelo proxy público, X-QA-Request-Encoding=br,gzip e X-QA-Client-Encoding=identity; a origem selecionou ETag gzip SHA340d352b8734330d47242f9018da890a5b36255814fa83dea46173bea0abfb03 (66B), mas a resposta entregue foi identity2500B/SHA8643aac16714b2468906d0a56a3a9020a59d08b30097ab682ce535581b5ba342. Isso contradiz o contrato de preferência explícita identity e ETag da representação. Os cinco casos da origem direta permanecem positivos, e cleanupConfirmed=true.

Revisor conferiu fonte, docs, fixture e JSON completo; parse + zlib/crypto reais recalcularam os hashes/tamanhos e relações acima (Bun puro exit0, sem workerd novo). O cache independente `.cache/review120-original-encoding.test.ts` foi executado depois que a raiz já aplicara o patch:6 pass/17 asserts exit0, cobrindo identity, gzipq=0, *q=0, campo vazio e fallback null/ausente. Não é alegada uma execução vermelha independente desse cache. Provas antes/after permanentes e gates frescos da raiz pendentes.

Usar o valor original string fornecido pelo runtime quando disponível, preservando string vazia e exclusões; usar header como fallback quando metadata original é null/ausente. Não aceitar outro header QA/browser como autoridade. Verificar escolhas/ETag/HEAD/304 e teste real do proxy sem confundir transcodificação da camada intermediária com bytes da origem.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou causa com permanente red `l8-http-compression-edge-encoding-before-1.log`: identity + If-None-Match gzip retornava304 em vez200. Correção usa somente cf.clientAcceptEncoding string fornecido pelo runtime, preservando vazia; null/ausente continua header. Permanentes após patch21/211 EXIT0 em quatro arquivos (`l8-http-compression-edge-encoding-after-1.log`). Native proxyafter1 EXIT0: origem5casos e proxy6casos, incluindo identity com validatorgzip retornando200/ETaglogical/wire2500/hashcorreto; gzip/HEAD/304 continuam corretos. Extensão mínima QA em fixture/runner necessária para observar metadata real sem clonar Response nem perder encodeBody. Distinto119001 encodeBody e119002 ownership. Proxy415préhandler não atribuído ao app; QA agora não gunzip HEAD/304 sem corpo. FreshTSC5 produção/testes ainda em curso; aguardar recibos e revisão antes resolved.
- Resolution: Revisor executou cache atualizado7/20 exit0, incluindo originalidentity com validatorgzip e corpo/ETag lógicos; parsed o JSON completo proxyafter1 e confirmou origem5/proxy6/cleanuptrue e hashes. Recibos reais RuntimeprodTSC5 (12:39:37.3152941-03:00) e RuntimeTestTSC6 (12:40:09.9363947-03:00) lidos, ambos exit0. TSCtest5 encontrou somente narrowing de observaçãoQA; tipo string explícito corrigido e fonte relida. Resolve negociação originalcf, sem afirmar deploy remoto/performance ou atribuir415préhandler ao app. Nenhuma produção/permanente alterada pelo revisor.
