---
status: resolved
file: packages/member-shell/src/server/studio-python-runtime.ts
line: 217
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Promessas externas ignoram limite e cancelamento do job

## Review Comment

O cliente passa AbortSignal a read/authorize/fetchImpl, mas aguarda essas promessas diretamente. Um provider que não confirme cancelamento mantém inspectStudioPythonRevision pendente depois do abort do caller ou do limite próprio. No read após uma admissão, isso também impede entrar no finally e retirar o input. O cleanup sofre a mesma limitação: timeout5000 só aborta o sinal, sem encerrar um fetchImpl configurado que continue pendente. A garantia de lifetime depende inteiramente da cooperação das portas, embora o módulo declare prazo próprio e cleanup limitado/independente da lease.

Prova independente `.cache/review074-runtime-lifetime.test.ts` usa a fixture HTTP Bun e o handler/store/registry/coordenador reais, com portas controladas somente nos pontos de falha. Caso1: read entra em gate após a admissão; abort do caller deixa resultado pending e nenhum /inputs/remove até liberar o provider. Caso2: authorize preso no gate também ignora abort e impede settlement antes de qualquer HTTP. Caso3: fetchImpl do cleanup ignora o sinal; ao disparar seu timeout5000 controlado, a chamada permanece pending até a resposta manual. Resultado:0 pass,3 fail,3 verificações,exit1. Todos os gates foram liberados e o timeout spy restaurado; nenhum processo externo ficou pendente.

Fazer race das promessas externas com o sinal/lifetime pertencente ao cliente, sem depender apenas do argumento signal. Entrar no cleanup assim que a operação principal for cancelada; limitar também o await do transporte de cleanup por seu prazo independente. Uma resposta HTTP que chegue depois do abandono deve ter seu body cancelado, e nenhuma resposta tardia pode retomar uploads/inspeção/aceitação. Preservar a recusa de cleanup de referência estrangeira e a reautorização final após cleanup.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou Core awaitWithSignal com operação factory, rejeição pelo lifetime próprio e retirement não bloqueante de valores tardios. BFF usa o helper em read/authorize/fetch/cleanup fetch e protege/cancela os bodies recebidos. Os três reproduzidores originais passaram; cleanup independente aceita fallback com telemetria e cancela body tardio. Prova adicional confirma captura de snapshot/config/callbacks antes do primeiro await. Final independente BFF + wrapper negatives:9 pass,0 fail,23 verificações,exit0. Core helper/JSON/input + probes:11 pass,0 fail,37 verificações,exit0 (abort antes do dispatch, erro original preservado, retire que lança e rejeição upstream tardia). Permanente nativo preserva13 casos/42 assertions, incluindo prazo real de5s; combo DOM+wrapper3/28exit0. Biome9 fresh exit0. Não afirma falha do fetch nativo, que normalmente observa AbortSignal, nem qualifica Cloudflare/CPython real/consumidores. Nenhuma produção alterada pelo revisor e nenhum heavy executado.
