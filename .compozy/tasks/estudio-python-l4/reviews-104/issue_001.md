---
status: resolved
file: packages/core/src/studio/python-builder-validation.ts
line: 125
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Pipeline recusa preview recebido sem retirar sua capacidade

## Review Comment

O novo validateStudioPythonBuilderCandidate aguarda buildStudioPythonRevision e então chama signal.throwIfAborted fora do owner interno daquele cliente. Se a retirada ocorre entre o settlement do cliente e a continuação do pipeline, a operação externa rejeita com AbortError, mas o preview já aceito pelo serviço não é descartado. inputs/remove normal já foi executado e, por contrato, preserva previews succeeded; portanto essa limpeza não retira a capacidade recusada pelo novo consumidor.

Reprodução independente packages/members/.cache/review104-pipeline-retirement.test.ts, TCP Bun nativo e dois clientes Core reais, com relatórios de serviço controlados. A autorização final depois de inputs/remove agenda a retirada em microtasks. Controle antecipado (profundidade1) faz o cliente chamar previews/remove; fronteira externa (profundidade4) rejeita com AbortError, mas termina só em inputs/remove, sem previews/remove, mesmo após aguardar20ms. Resultado reduzido:1pass/1fail/116asserts, exit1. O sweep inicial encontrou a mesma falta nas profundidades4/5/6. Esta prova demonstra ausência de descarte no transporte, sem afirmar que executou SDK/DO/R2 reais ou acessou um preview real.

O wrapper deve possuir o preview enquanto valida seu resultado, descartá-lo por uma capacidade privada e idempotente em qualquer recusa após retorno, e transferir essa capacidade ao futuro consumidor até a persistência confirmada. Não expor identidade privada de input no JSON nem retirar preview de outro job. Preservar o caso aprovado e o cleanup normal independente do input.

É um novo consumidor B2.4 introduzido depois da086001. O catch do cliente/handler corrigido naquela rodada continua funcionando no controle antecipado; ele não cerca a continuação externa deste pipeline. Não reabre086 nem aponta ausência da futura composição, persistência ou UI como defeito deste recorte. O pipeline ainda não está habilitado na produção.

## Triage

- Decision: `VALID`
- Notes: VALID confirmado pelo implementador. Resolvido com discardPreview idempotente no retorno interno run/build, fechado sobre input próprio e cleanup independente do sinal; build e pipeline descartam em suas recusas pós-retorno. Outcome aprovado transfere a capacidade ao consumidor até persistência, sem serializar o input. Cache original adaptado às mesmas quatro fronteiras1/4/5/6:4pass/0fail/232asserts exit0. A pedido explícito do implementador, quatro regressões foram portadas para Members tests/unit/python-builder-validation.test.ts, exigindo AbortError, sinal retirado, exatamente1 previews/remove e telemetry vazia. Preview/pipeline22/512; combo tipos/preview/pipeline47pass/0fail/574asserts exit0, incluindo dois Pyright reais locais via TCP. Caso aprovado cobre duas chamadas concorrentes e só um discard. Nenhuma fonte de produção alterada pelo revisor. Relatórios CPython/playtest/preview do pipeline continuam CONTROLADOS; não qualifica SDK/DO/R2/browser nem futura persistência/UI/produção.
