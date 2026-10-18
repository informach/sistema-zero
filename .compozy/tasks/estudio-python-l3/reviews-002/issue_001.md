---
status: resolved
file: packages/studio/src/runtime/python/workerSupervisor.ts
line: 105
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Callbacks podem revogar a sessão antes de novas emissões

## Review Comment

O supervisor revoga a autoridade em stop, mas continua o processamento já iniciado depois que callbacks externos retornam. options.emit é síncrono e pode chamar stop. No loop de console, parar no primeiro item ainda permite emitir os próximos itens após o evento stopped, contrariando o contrato de não haver efeitos depois da revogação.

Reprodução independente: criar o supervisor com `emit(event)` que chama `supervisor.stop()` no primeiro console; inicializar, executar e entregar uma mensagem console com dois batches. Resultado observado: `console:first`, `state:stopped`, `console:second`; fase final stopped e terminate chamado uma vez. O payload foi passado por structuredClone, portanto o caso não depende de getters executáveis ou de mensagens impossíveis no navegador.

A mesma causa aparece após state('ready'), que ainda chama onReady se emit interromper a sessão (linhas 124–125), e após state('running') em start/provideInput, que ainda tenta postar o comando após a interrupção (linhas 173–179 e 208–215). O ramo de REPL também emite seu resultado depois do callback de completed (linhas 138–144). Não foi observado que um worker já terminado execute esse comando; o defeito confirmado é a continuação das emissões/callbacks e tentativas de envio após revogação.

Rever os pontos de chamada externa para interromper o fluxo quando a sessão tiver sido revogada durante o callback, incluindo entre itens do console. Acrescentar regressões com interrupção síncrona durante console, ready e completed/REPL, além de confirmar que start/provideInput não enviam comandos depois de stop. A correção deve manter o evento terminal único e a liberação idempotente.

## Triage

- Decision: `VALID`
- Notes: Corrigido: o loop de console reconfere revogação entre itens e os pontos posteriores aos callbacks abortam emissões/envios quando a geração termina. A primeira correção confundia progresso de estado com revogação e suprimia um resultado REPL anterior se o callback iniciasse o próximo comando; a revalidação reproduziu o caso e o guard final passou a conferir somente a condição terminal. Nenhuma fonte foi modificada pela revisão.
- Verification: `bun test src/runtime/python`: 20 testes, 108 verificações, nenhuma falha. Regressões cobrem Stop durante console/readiness/start/input/REPL e supressão do resultado após revogação. Reprodução independente também confirmou que um callback pode iniciar evaluate:next no completed de evaluate:first sem perder o resultado first. Biome da alteração e metadados da rodada conferidos.
