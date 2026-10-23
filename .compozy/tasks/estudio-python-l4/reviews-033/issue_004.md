---
status: resolved
file: packages/studio-language-service/runtime/pyright.ts
line: 224
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Limitar syncs retidos após cancelamento do caller

## Review Comment

A correção da espera abortável permite que `handle` retorne imediatamente e remova seu elemento de `pending`, mas a operação `this.tail.then(...)` ainda permanece encadeada e conserva a closure com o comando inteiro até a operação anterior terminar. A cota `pending.size` passa a limitar somente callers que ainda esperam, não os syncs físicos nem seus payloads retidos. Repetir envio e cancelamento contorna `maxPendingRequests` enquanto a fila está ocupada; o timeout do caller também não remove essas closures.

Reprodução independente após iniciar Pyright real, controlando somente o ponto de espera `tail`: despachar um sync, aguardar que ele seja realmente encadeado, cancelar e aguardar o retorno; repetir 40 vezes sem liberar a operação anterior. O resultado é `acceptedQueuedSyncs=40`, `quotaReplies=0`, `pendingMap=0` e `retainedCommands=40` após GC. Todos mantêm referências à fonte apesar de o limite publicado ser 16. O gate é liberado ao final da prova; nenhuma fonte de produto é alterada.

Manter uma cota independente para operações/payloads ainda retidos até seu término, ou usar fila removível que retire e libere o comando cancelado antes da execução. Preservar o retorno imediato ao caller e a inicialização compartilhada. A regressão deve segurar a fila, superar 16 envios/cancelamentos e demonstrar rejeição por quota ou liberação efetiva de payload, além da retomada normal depois de liberar a operação anterior.

## Triage

- Decision: `VALID`
- Notes: Novo efeito da correção da issue 002, confirmado e corrigido. Revalidação independente abaixo; não é uma medição de frequência de stalls no filesystem real.

## Verification

- `bun .cache/studio-python-l0/review033-queue-retention.ts`: `{"acceptedQueuedSyncs":40,"quotaReplies":0,"pendingMap":0,"retainedCommands":40}`; exit 0.
- Cada caller só é cancelado após a troca observável de `tail`, evitando confundir aborto antes de enfileirar com retenção de uma operação real.

## Revalidation

- O processo reserva `queuedSyncs` antes da espera pelo boot e só libera a reserva depois do término físico da operação, ou se ela nunca foi enfileirada. O limite separado é 2 syncs; o limite de callers permanece 16.
- Harness original `bun .cache/studio-python-l0/review033-queue-retention.ts`: `{"acceptedQueuedSyncs":2,"quotaReplies":38,"pendingMap":0,"retainedCommands":2}`; exit 0. A fila não volta a aceitar payloads apenas porque o caller cancelado já recebeu sua resposta.
- `bun test tests` no pacote do serviço: 9 passaram, 0 falharam, 68 verificações. A regressão permanente libera a fila e confirma a aceitação de um novo sync, além dos 40 envios/cancelamentos.
- Prova independente HTTP em Node nativo, compilada somente como harness local: `review033-http-admission.ts/.mjs`. Mantém um corpo parcial de 8,25 MiB e envia outro para superar o limite agregado de 16 MiB: recebe 429. Um corpo chunked individual de 10 MiB recebe 413. `content-encoding:gzip` é recusado, nenhuma dessas entradas chega a `session.handle`, e um comando válido posterior recebe ACK 200 (`calls=1`), confirmando liberação da reserva de bytes.
- Biome dos quatro arquivos da correção: `Checked 4 files in 18ms. No fixes applied.`. Sem navegador, TSC ou reconstrução Docker pelo revisor; a conclusão se limita ao processo/fila/admissão examinados.
