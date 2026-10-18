---
status: resolved
file: experiments/studio-python-runtime/fixtures.ts
line: 56
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Prova de parada confirma início antes de entrar no loop

## Review Comment

A fixture loop envia `loop-started` antes de executar `while True`. O teste em packages/studio/e2e-runtime/python-supervisor.spec.ts aguarda esse evento e passa a medir a parada como se ele confirmasse que o worker já está ocupado no loop. O sinal comprova apenas que a execução alcançou o postMessage anterior; o navegador pode agendar o host e processar Stop antes da entrada no loop. Nesse caso, ACK e remoção rápidos passam, mas a condição que o teste pretende qualificar não foi exercitada.

As duas amostras conferidas desta rodada tiveram remoção em aproximadamente 2 segundos e CPU compatível com um loop ocupado. Isso não invalida seus tempos observados; o problema é a regressão que o teste ainda permite aprovar. O padrão já havia sido corrigido na prova L0 e reapareceu nesta nova fixture de integração.

Emitir o marcador uma única vez de dentro do loop, após um número pequeno e conhecido de iterações reais, como 1.000, e só então permitir a medição no host. Preservar a fila e a CPU ocupadas depois do marcador, sem inserir espera cooperativa artificial. Reexecutar somente os dois testes de parada, Chrome e Edge, registrando os mesmos tempos e alvos nativos.

## Triage

- Decision: `VALID`
- Notes: Ordem da fixture e condição de espera do teste conferidas diretamente; evidências nativas atuais também lidas. A correção sugerida reforça a prova desta fatia, sem exigir integração futura ou repetir a matriz inteira. Nenhuma fonte foi alterada pela revisão.

- Resolution: A fixture agora emite o marcador de dentro de `while True`, após `count == 1000`, e continua ocupada sem espera cooperativa. A leitura confirmou a ordem corrigida em fixtures.ts:55–60.
- Verification: `.cache/studio-python-l0/l3-native-stop.log` registra os dois testes focados de Stop aprovados (Chrome e Edge), 2 passed em 12,3 s. Cada teste exige ACK≤250 ms e remoção nativa≤3 s. O relatório JSON temporário dessa rodada foi sobrescrito pela rodada seguinte; portanto não se atribuem novos valores exatos de latência a esta revalidação. Nenhuma fonte foi modificada pela revisão.
