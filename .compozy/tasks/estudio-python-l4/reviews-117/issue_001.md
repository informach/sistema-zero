---
status: resolved
file: packages/studio/src/runtime/python/bootResourceHost.ts
line: 54
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Preparação do host depende do ACK externo para cancelar

## Review Comment

O helper passa signal ao request, mas aguarda sua promessa diretamente. Se a porta demorar ou ignorar abort, a preparação continua pendente depois da retirada do owner. Quando a resposta chega após o abort, a linha 61 também aguarda body.cancel antes de rejeitar: um ACK de retirement que nunca conclui mantém essa mesma espera viva. Esta preparação acontece antes de existir o broker e seu prazo de 30s, portanto esse prazo não encerra a operação.

Prova independente `packages/studio/.cache/review117-boot-host-cancel.test.ts`, executada com `bun test ./.cache/review117-boot-host-cancel.test.ts` em packages/studio: exit1, 0 pass / 2 fail / 4 asserts. No primeiro caso, request fica em gate; abortamos o owner e a preparação só rejeita quando liberamos a resposta. No segundo, request retorna uma Response após abortar o owner e cancel() retorna outro gate; a preparação só rejeita quando liberamos esse ACK. Ambos verificam settled=false antes da liberação e cancel solicitado uma vez. Todos os gates foram drenados; não houve leitura de manifesto ou cache IO.

Fazer a espera do request pertencer ao signal do helper, com rejeição independente da cooperação do produtor e retirement não bloqueante das Responses tardias. Na retirada já observada, solicitar cancelamento do body sem aguardar ACK indefinido, preservando o motivo original. O Core awaitWithSignal já oferece esse contrato para outras fronteiras. Não se afirma que o fetch nativo ignore AbortSignal; a prova usa a porta request suportada pelo próprio helper. Nenhum consumidor desse helper está ativado ainda, e não se demonstra leak permanente de worker/browser.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium: preparo deve encerrar no ownerabort mesmo com IO/ACK não cooperativo. Fix planejado usa awaitWithSignal Core no preparo público e no request, retirement tardio solicita cancelamento sem aguardar ACK após revogação, preserva signal.reason e impede novos passos. Incluir permanente bodyread com ACK pendente. Novo consumidor anterior ao broker, sem reabrir 116 (vínculo Store/manifest) ou 074 (cliente BFF); não alterar Core helper/Store para este achado. Revalidação pendente, nenhuma produção/permanente alterada pelo revisor.

### Independent fix verification — resolved

Patch revisto: awaitWithSignal externo cerca toda preparação; o interno cerca request e retira a Response tardia sem aguardar cancel ACK. Os guards preservam signal.reason e impedem criar Store após retirada. Core helper/Store não foram alterados para esta correção. Prova própria adaptada para aguardar ingresso real do request (o novo helper corretamente impede dispatch se abortado antes dessa microtask): dois casos causais passam antes de liberar produtor/ACK. Com permanentes Store/channel/payload/webZIP: execução independente exit0, 39 pass / 0 fail / 239 asserts. O permanente adicional cobre producer, late-cancel e body-cancel, verifica mesmo objeto de erro, cancel1 e cache0 antes/depois da liberação. Recibo fresh de TSC após correção/import ordering lido, exec chunk503e63 coletado pela raiz exit0, stdout/stderr vazios; sem TSC executado pelo revisor. Resolvido no helper, sem qualificar consumidores, CPython/SDK, browser ou desempenho.
