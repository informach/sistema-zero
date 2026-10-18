# VERIFICATION REPORT

- Claim: status HEAD/304 permanece positivo após revogação durante último cancelBody aguardado.
- Command: `bun test ./.cache/review118-compression-final-policy.test.ts`, cwd raiz.
- Executed: sim; gzip/Core/real upload/registry/server/fixture bucket, gate só no retirement da representação selecionada.
- Exit code: 1.
- Output summary: 0 pass / 2 fail / 2 asserts, HEAD200 e conditional GET304 após status=revoked; esperados404. Gate entrou depois do último check, ambos ACKs drenados antes das assertions.
- Scope: plano compressão e nove arquivos priorizados lidos; auditoria restante continua. Nenhum heavy/browser/TSC/build/Docker/SQL, produção ou permanente editado pelo revisor.
- Verdict: 1 VALID medium, 0 resolved / 1 unresolved, fresh patch verification pending. Não prova execução/grant remoto nem qualifica desempenho/F1.

## Revalidação independente do patch

- Mesmo reproduzidor causal, sem enfraquecer gates: `bun test ./.cache/review118-compression-final-policy.test.ts`, cwd raiz; exit0, 2 pass / 0 fail / 4 asserts. HEAD e GET condicional agora recusam revogação durante cancelamento, com404/no-store. Não foi acrescentada alegação de cobertura de request.signal.
- Regressão Runtime: `bun test ./packages/studio-runtime/tests/python-http-negotiation.test.ts ./packages/studio-runtime/tests/python-http-representations.test.ts ./packages/studio-runtime/tests/python-distributions.test.ts`; exit0, 18 pass / 0 fail / 176 asserts. Inclui permanente HEAD/GET × revoked/retired, seleção/headers/ETag, fechamento referencial/captura, gzip corrompido/expansão e marker-last.
- Receita: `bun test ./packages/studio/scripts/python/http-representations.test.ts`; exit0, 2 pass / 0 fail / 16 asserts. Gzip repetível, roundtrip exato, execução de ESM inerte descomprimido, sem expansão de artefato incompressível ou uso prévio do namespace reservado.
- Nove arquivos priorizados foram lidos integralmente. Não houve outro achado novo confirmado. Descritores gzip são fechados sobre arquivos declarados, compartilhamento exige SHA/tamanho lógico idênticos, marker vincula distribuição, bytes de upload são copiados antes de SHA e descompressão compara incrementalmente contra bytes lógicos verificados. Seleção respeita exclusões e preferência explícita identity; headers identificam a representação armazenada.
- YAML de issue/meta relido via Bun.YAML.parse: issue VALID medium, round118, um arquivo issue; contagens1/0/1. Mantém unresolved até gates frescos Runtimeprod/testTSC informados pela raiz. Nenhum tipo, navegador, build, Docker, SQL ou execução CPython novo pelo revisor. Não aprova distribuição ativada, SDK comprimido, F1 ou desempenho global; timeout Pro/network permanece aberto.

## Fechamento118001

- Fonte relida confirma status após await cancelBody e antes de construir HEAD/304.
- Recibos reais lidos: `.cache/studio-python-l0/l8-http-compression-runtime-typecheck-2.receipt.txt` (`runtime TSC exit=0 2026-10-18T12:20:24.4783777-03:00`) e `l8-http-compression-runtime-test-typecheck-2.receipt.txt` (`runtime-test TSC exit=0 2026-10-18T12:20:28.6032218-03:00`). Execuções da raiz, não do revisor. Studio TSC agregado ainda em andamento não é alegado como concluído aqui.
- Evidência independente anterior2/4+18/176+2/16 suficiente para a fence corrigida. Status resolved, decisão VALID preservada; metadata1/1/0. Escopo operacional estrito, sem aprovação de distribuição/browser/SDK comprimido ou desempenho.

## Delta QA posterior (leitura somente)

- Lidos integralmente `e2e-runtime/python-http-compression.spec.ts` e `playwright.python-runtime.config.ts`. Prova usa seis módulos efetivamente observados no navegador, Content-Encoding/Length/ETag/Vary, corpo descomprimido com SHA lógico, e HTTP Node separado sem descompressão automática para SHA comprimido/roundtrip. Turtle stdout/bitmap/Stop reais são exigidos; dispose fica no finally; cada request Node tem deadline10s e limite da representação. Config mantém dois canais/workers1/retries padrão0 e não troca o contador de desempenho.
- Sem novo achado causal confirmado nessa leitura. Browser/build desse delta ainda não executados; não inferir que a captura de Responses de worker ou o resultado funcional já estejam qualificados. Não se confunde agente HTTP funcional separado com correção do timeout Pro/network.
