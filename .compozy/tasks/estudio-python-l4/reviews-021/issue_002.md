---
status: resolved
file: packages/studio/src/python/language/controller.ts
line: 80
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Impedir publicação após reset reentrante antes do CAS

## Review Comment

A nova callback commit introduz efeitos síncronos após check(job). O check original verificava o dono antes de current()/environment.access(), mas não depois. Um access que chama reset e retorna active fazia run rejeitar AbortError e ainda chamar commit (commits=1 na reprodução). A resolução de uma Promise já rejeitada antes era inócua; executar commit depois do reset agora pode escrever no projeto.

O implementador acrescentou nova checagem de dono/active/pending depois dos callbacks, corrigindo essa primeira reprodução. Porém o mesmo intervalo persiste em commitWorkspace.ts: a callback commit chama currentProject(), que volta a executar options.current() depois da checagem final do controller. Se esse callback faz reset e retorna true, applyPythonSourceFiles ainda publica. Reprodução com helper/store/controller reais: reset antes do CAS, Promise=AbortError, source=print('old') e draft=null.

Manter a autoridade válida até o ponto síncrono de escrita: evitar callbacks de host adicionais entre a última checagem do controller e o CAS, ou fornecer uma lease/assertCurrent que possa ser revalidada depois deles. Isso é distinto de reset disparado por subscriber após uma escrita já autorizada: nesse segundo caso a fonte publicada permanece válida e a entrega à UI antiga pode ser cancelada, conforme decisão explícita do implementador.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador: controller reconfere a lease depois dos callbacks; currentProject do helper lê somente a store, sem executar callback do host durante commit. Revalidação independente confirmou commit zero nos resets pré-CAS e ausência de chamadas de host no trecho de publicação do helper. O comentário documenta que cancelamento pós-publicação pode invalidar a entrega à UI antiga sem desfazer a fonte já gravada. Nenhuma implementação alterada pelo revisor.

## Verification

- Provas independentes para reset reentrante em current e access na checagem final: ambas retornam AbortError com commits=0.
- Mesma instrumentação do helper que antes provocava reset dentro de commit: hostCallsInCommit=0; fonte gerada e publicada corretamente. A leitura final entre a checagem da lease e o CAS usa somente estado local.
- `bun test src/python/blocks/commitWorkspace.test.ts src/python/language/controller.test.ts`: 13 pass, 0 fail, 53 verificações. Inclui substituição síncrona de draft e reset nos dois callbacks.
- `bunx biome check src/python/blocks/commitWorkspace.ts src/python/blocks/commitWorkspace.test.ts src/python/language/controller.ts src/python/language/controller.test.ts`: quatro arquivos, sem erros ou alterações. Nenhum browser/TSC executado pelo revisor.
