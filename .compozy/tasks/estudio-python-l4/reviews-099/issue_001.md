---
status: resolved
file: packages/core/src/learning/gallery-studio-source.ts
line: 105
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Parte decodificada pode divergir dos bytes verificados

## Review Comment

O restaurador portátil aguardava crypto.subtle.digest sobre uma view do Uint8Array devolvido por readPart e depois decodificava esse mesmo buffer emprestado. WebCrypto captura os bytes ao despachar o digest, mas o produtor ainda pode modificar o buffer antes de o await terminar; o hash confere os bytesA e o parser aceita os bytesB. Isso rompe o contrato de restaurar exatamente os bytes cujo SHA foi aprovado.

Reprodução independente `.cache/review099-borrowed-bytes.test.ts`, cwd Core: antes0pass1fail/2asserts exit1, hash original image-A mas resultado assets.name=image-B. Spy só controla agendamento e delega o digest nativo REAL, mutando o buffer emprestado após dispatch. A versão final da prova muta sempre, sem condicionar à identidade do argumento, para não mascarar o fix por cópia. O leitor Members atual retorna buffer exclusivo; não se afirma exploração via HTTP/R2 nem hash fabricado.

Depois de admitir o tamanho e recusar bytes compartilhados, copiar para armazenamento próprio; usar essa exata cópia tanto no digest quanto no decode apósawait. Preservar verificação dos bytes antes de JSON.parse e limites agregados/cancelamento.

## Triage

- Decision: `VALID`
- Notes: Resolvido após confirmação do implementador e revalidação independente. captured=bytes.slice(), digest(captured), decode(captured); próprio teste adaptado apenas para remover o predicado de identidade e manter mutação do borrowed buffer. Próprio+permanentes Core11pass0fail/25asserts exit0, incluindo teste permanente com WebCrypto real. Catch interno também retira lifetime na primeira falha de parte, sem outro achado separado. Escopo é invariante do Core portátil/ports; leitores TCP atuais não foram classificados como exploit.
