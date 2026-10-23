---
status: resolved
file: packages/studio-runtime/src/python-requests.ts
line: 181
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Input encerrado durante aprovação final recebe relatório

## Review Comment

A aceitação do relatório faz await store.resolve(reference) e depois await approve(snapshot). Essa segunda operação aguarda o HEAD do marcador de conclusão do runtime. Se o input é encerrado enquanto o marcador é consultado, o último check só confere sinal/configuração, sem conferir novamente a geração/closure do input. A rota devolve200 com report de um input já encerrado, contrariando o fence explícito de recusa de relatório tardio.

Prova independente `.cache/review073-request-races.test.ts`: abre e transfere input pelas rotas reais; o coordenador termina sua execução e teardown. No get de complete.json da aprovação final, a prova chama store.remove(reference), mantendo configuração/runtime válidos. Confirma que o input foi encerrado, que o container exclusivo foi destruído uma vez e que houve uma execução. A expectativa410 falha porque a resposta é200 com o relatório. `bun test ./.cache/review073-request-races.test.ts`:0 pass,1 fail,5 verificações,exit1. Nenhuma produção alterada pelo revisor; nenhum Docker/browser/build/TSC/Cloudflare real executado.

Fazer a aprovação assíncrona do runtime antes da última resolução do input. Depois dessa última fence assíncrona, conferir sinal/configuração e status/identidade aprovados de modo síncrono antes de formar a resposta, sem reabrir uma janela com outra leitura de storage/marker. Provar também revogação de runtime e configuração durante a última resolução do input.

## Triage

- Decision: `VALID`
- Notes: Implementador reproduziu e confirmou. Fix finalapprove → finalstore.resolve → check(signal/env) e registry.resolve síncrono não realiza outro await de marker/storage após a fence do input. Revalidação independente do original retorna410 sem report; revogação de runtime ou configuração durante a última resolução do input retorna409 sem report. Os três probes confirmam container exclusivo criado/executado/destruído uma vez. `bun test tests/python-requests.test.ts tests/python-input-maintenance.test.ts tests/runtime-handler.test.ts tests/python-distributions.test.ts ./.cache/review073-request-races.test.ts`: exit0, 39 pass, 0 fail, 240 verificações. CoreHTTP:3 pass,0 fail,6 verificações,exit0. Biome fresh dos13 arquivos exit0 após formatação do teste pelo implementador. Log negativo JS de imagem antiga esperado no teste correspondente. Nenhuma produção alterada pelo revisor; sem Docker/browser/build/TSC ou R2/Cloudflare SDK real. Revalidação não qualifica imagem antiga, consumidores ainda em desenvolvimento ou autorização BFF contextual.
