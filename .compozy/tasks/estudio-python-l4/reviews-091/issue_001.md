---
status: resolved
file: packages/studio/src/activity/python.ts
line: 158
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Janela de observação termina antes dos controles da receita

## Review Comment

runPythonActivity aguarda recipe.observeMs e depois solicita checkActivity. É somente no comando activity-check do frame que keys/clicks são entregues ao renderer, junto com a flag de correção. O backend retoma o fluxo Python, despacha os controles e chama imediatamente checkpoint, sem dar ao programa a janela pedida para responder aos controles. Um callback que agenda uma mudança com ontimer reprova antes dessa mudança, embora ela ocorra muito antes do prazo observeMs autorizado. O produtor playtest existente observa depois de driveRecipe; este novo consumidor inverteu a ordem.

Prova independente leve `python.exe -I -B .cache/review091-recipe-order.py`, cwd Studio, CPython3.14.2 nativo REAL/Turtle+backend+grader do produto, transporte gráfico controlado semGUI/WASM. Programa onkey(space) agenda score=1 em20ms. Na ordem atual (250ms iniciais→flag+controles→wake/checkpoint), globalEquals score1 retornafalse; depois de30ms o programa realmente está em1, mas a correção já terminou. Controle com os mesmos módulos/programa (controles→250ms de observação→flag/checkpoint) retorna true. Exit1/1falha esperada,0.53s. A prova usa ordem de chamadas causal lida no runner/frame, não executa o runner browser nem qualifica WASM.

Separar entrega/ACK dos controles da solicitação de grading: aplicar receita, observar a janela requerida e só então corrigir em checkpoint seguro, mantendo identidade/lifetime/input/cancelamento e sem reentrada JS em Python suspenso. Cobrir controles com efeitos imediatos e efeitos de timers subsequentes, incluindo key e click; não sintetizar eventos fora da receita host-owned.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após revalidação independente. Runner real+controller/registry com portas controladas comprova run→controlsACK→timer-response→check após observe250ms (3/10 no cache conjunto). Browser8 56284241-2444-406d-9709-15a224a5b92e arquiva consumidor real Chrome/Edge com stdinLia+Space+click+ontimer20ms e todos seis critérios100; while/update também100. Readiness agora distingue update público de setup/tracer internos, e apresentação dedicada não depende de rAF offscreen. Probes independentes session1/6, renderer3/17 e CPython publicturn2casos cobrem retirada/stdin/limites cooperativos; detalhes em _verification. Consumidor não arquiva recibo separado de execução nem captura: snapshots/revisões reconstruídos não são recibos arquivados. Novo cliente C, sem autoridade Members/performance/global completion.
