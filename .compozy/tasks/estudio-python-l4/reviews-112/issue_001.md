---
status: resolved
file: packages/studio/e2e-python-editor/layout-diagnostic.ts
line: 10
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Falha ao iniciar tracing não retira a sessão CDP criada

## Review Comment

tracePythonFrameLayout cria uma sessão CDP e aguarda Tracing.start antes de instalar o caminho de cleanup. Se start rejeita (por exemplo, tracing indisponível/já iniciado), o helper nunca retorna finishTrace; o finally com session.detach só existe dentro desse callback e fica inalcançável. A tentativa de diagnóstico deixa sua sessão anexada até a retirada externa do browser/contexto, em vez de encerrar o recurso que acabou de adquirir. O ramo CPU opcional e o diagnóstico layout legado compartilham essa setup path.

Reprodução independente leve `.cache/review112-trace-start.test.js`, executada em Bun isolado, usando a implementação real com porta CDP controlada: newCDPSession retorna a sessão; Tracing.start rejeita a razão original; starts=1 e detach=0, esperado1. Teste exit1,0pass/1fail/4asserts. O erro inicial já é preservado; o defeito é a ausência de retirada nessa fronteira. Não foi executado browser/CDP real nem se afirma leak permanente após Playwright encerrar o browser próprio.

Envolver Tracing.start em try/catch depois da aquisição e solicitar detach em falha, preservando o erro original mesmo se detach também rejeitar. O cleanup depois de tracing iniciado deve continuar fechando o stream IO e a sessão. Não alterar runtime, pixel/timing/threshold nem ampliar esse achado para deadline genérico sem prova.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após revalidação independente. Tracing.start está em try/catch; falha solicita detach e preserva erro inicial. Se detach rejeita, attach trace-setup-cleanup-error é best-effort e observável, sem substituir a causa. `bun test ./.cache/review112-trace-start.test.js ./packages/studio/e2e-python-editor/layout-diagnostic.test.ts` passou4testes/10asserts exit0: probe original e três permanentes sem mock.module cobrem legacy/CPU e retirada rejeitada. Escopo continua medium de harness/QA e recurso dentro do browser próprio; não é prova CDP/browser real nem sessão persistente depois do teardown externo. Nenhum threshold, deadline ou código do runtime foi alterado pelo revisor. Nova medição temporal/performance continua sem qualificação por esta revisão.
