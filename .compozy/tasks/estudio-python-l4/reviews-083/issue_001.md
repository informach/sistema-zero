---
status: resolved
file: packages/studio-runtime/src/python-inspection.ts
line: 167
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Callback de fase não participa do cancelamento do owner

## Review Comment

A extração withIsolatedPythonProject aguarda task(project) diretamente, enquanto as demais portas assíncronas usam step para competir com o cancelamento. Um callback de fase que não coopera mantém a operação pendente mesmo após o signal abortar e a destruição do sandbox ser solicitada. O finally e sua janela limitada de cleanup só são alcançados quando o callback finalmente resolve/rejeita, permitindo que o novo lifecycle genérico ignore o prazo de settlement.

Reprodução independente com API/validação/hash/streams reais e callback controlado: `bun test ./.cache/review083-phase-abort.test.ts`, cwd Runtime, antes exit1/0pass1fail. Após entrar na fase, aborta o owner; esperado retired, resultado still pending após40ms. O callback é liberado somente no finally da prova para não deixar recursos/processos próprios pendentes. Este é o novo await da fase extraída, distinto do antigo problema069 no await de destruição.

Conferir o signal antes de despachar e competir task com o mesmo cancelled/step, observando sua rejeição tardia e preservando teardown único e limite de cleanup.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou check antes do dispatch +await step(task(...)). Mesma prova independente após patch: exit0/1pass/2assertions; abort retira o callback não cooperativo e destroy ocorre uma única vez. `bun test tests/python-inspection.test.ts`, cwd Runtime:exit0/15pass/75assertions, incluindo permanente noncooperative trustedphase, cancelamento na segunda fase, destruição única após as duas fases, legacyinspection e cleanup5s. Não há claim SDK/container dessa prova de scheduling.
