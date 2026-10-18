---
status: resolved
file: packages/studio-runtime/src/python-distributions.ts
line: 283
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: HEAD/304 aceitam política revogada durante descarte do body

## Review Comment

A política é revalidada após bucket.get do objeto selecionado, mas o caminho HEAD/If-None-Match faz outro await cancelBody antes de retornar 200/304. Se a release é revogada enquanto o descarte aguarda ACK, a resposta positiva ainda é emitida. Isso contraria o requisito explícito do slice: revalidar revogação após IO, inclusive em HEAD/304. No GET condicional, 304 valida o uso da representação previamente armazenada apesar de a política corrente já negar a release.

Prova independente `.cache/review118-compression-final-policy.test.ts`: Core/schema/release, upload gzip verificado, registry/server e bucket fixture reais; somente o cancel da representação gzip fica em gate. Espera ingresso no cancel (após último status check), revoga a release e libera o ACK. `bun test ./.cache/review118-compression-final-policy.test.ts` no worktree raiz: exit1, 0 pass / 2 fail / 2 asserts; HEAD recebeu200 e GET com If-None-Match exato recebeu304, ambos esperavam404. Todos os gates foram liberados; nenhum processo/browser/R2 remoto foi usado.

Conferir status corrente depois do último await de cancelamento e imediatamente antes de emitir a resposta HEAD/304. A recusa deve permanecer404/no-store. Preservar seleção gzip/identity, ETag de representação, headers e encerramento de todos os bodies não devolvidos. A prova demonstra a fence operacional da rota, não uma concessão de autorização ou execução indevida completa.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium e corrigiu status depois do último cancelBody aguardado. Prova causal independente após patch2/4, regressões Runtime18/176 e receita2/16, todos exit0; permanente também preserva retired em HEAD/GET. Recibos frescos Runtimeprod/test TSC2 lidos: exit0 em2026-10-18T12:20:24.4783777-03:00 e12:20:28.6032218-03:00. Fonte atual relida confirma recheck antes de Response. Avaliação de request.signal é separada, sem alegar cobertura desse sinal. Não reabre073/116/117. Nenhuma produção/permanente alterada pelo revisor; não qualifica browser/SDK comprimido/F1 ou feature global.
