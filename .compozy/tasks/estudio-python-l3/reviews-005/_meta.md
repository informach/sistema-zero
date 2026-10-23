---
provider: manual
pr:
round: 5
created_at: 2026-10-16T22:50:12Z
---

## Summary

- Total: 1
- Resolved: 1
- Unresolved: 0

## Scope

Troca do port de upload para R2Conditional com etagDoesNotMatch, leitura restrita a Pick<bucket, get>, fixtures do serviço, prova R2 local via API pública do Wrangler e nova prova de 30 ciclos do provider. Rodadas 001–004 resolvidas e sem repetição de achados. Esta revisão não qualifica UI, Turtle, edição completa, máquina de entrada ou implantação remota.

## Evidence

- `bun test tests/python-distributions.test.ts`: 8 testes, 60 verificações, nenhuma falha. Biome dos cinco arquivos e git diff --check passaram.
- Tipo oficial instalado R2Conditional contém etagDoesNotMatch opcional; a mudança preserva a gravação condicional e evita depender da serialização de Headers pelo proxy Node.
- Lido `.cache/studio-python-runtime/r2-60ddc26a-dd7e-41dc-b984-9d7c571e80f3/evidence.json`: 11 artefatos com bytes/SHA conferidos, respostas condicionais 304, checksum errado recusado, overwrite recusado, local-r2-distribution-passed sem falhas registradas. A prova usa binding local efêmero, não R2 remoto.
- Lido `.cache/studio-python-runtime/runs/2026-10-16T22-45-35.108Z/report.json`: 2 testes aprovados, zero falhas/flaky/skipped, 30 amostras por navegador. Chrome: warm prepare p95 2.186,2 ms, Stop máximo 1,2 ms, maior incremento de memória privada amostrada 221.712.384 bytes, crescimento retido -7,83%. Edge: 2.100,4 ms, 1,1 ms, 215.126.016 bytes e -9,48%. Distribuição f4ea4fa7ab4a2be08783da13f0b3ea775a14124a4681548837c584a072e5ad8f. Não houve GC forçado; o escopo explicita que a coleta não mede pico instantâneo.
- Reprodução independente do finally da nova spec: falha de detach conserva aprovação no anexo; falha de attach impede a tentativa de detach.

Nenhum outro defeito concreto confirmado na alteração do port R2 ou nas medições desse recorte. Somente registros de revisão foram escritos; nenhum navegador foi iniciado pela revisão.

## Revalidation

Finalização corrigida e revalidada sem navegador. O bloco atual foi extraído e executado com detach que rejeita, attach que rejeita, caminho de sucesso e erro anterior: uma tentativa de detach em todos os casos, aprovação removida quando o encerramento falha, cleanupFailure registrado e sucesso preservado quando não há erros. Biome da spec e git diff --check passaram. Rodada encerrada com 1 resolvido e 0 pendentes; as medições anteriores continuam válidas como resultados observados, sem extrapolar o recorte local.
