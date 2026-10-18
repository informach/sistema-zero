---
status: resolved
file: packages/studio/src/runtime/python/interpreter.py
line: 116
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Resultado chega antes do flush dos streams Python

## Review Comment

execute/evaluate devolvem o resultado sem descarregar stdout/stderr do Python. O worker chama flush depois de aguardar o interpretador, mas essa função apenas drena o ring JavaScript: dados ainda retidos no TextIOWrapper não chegaram ao Writer.write e continuam invisíveis. Isso perde saída observável após o programa terminar, inclusive mensagens úteis antes de uma exceção.

Reprodução com o adaptador atual no Pyodide 314.0.7, Writer.write instalado e main.py contendo `print('partial', end='')`: execute retorna `ok: true`, mas o callback recebeu zero bytes. Somente um `sys.stdout.flush()` posterior entrega `partial`. Com `print('before-error', end='')` seguido de ValueError, ocorre a mesma retenção antes de devolver `ok: false`.

Descarregar os streams Python antes de devolver o resultado normal ou de erro e no caminho REPL, sem inserir LF. Tratar falhas de flush dentro do contrato de execução para não ocultar a exceção principal ou produzir sucesso indevido. Acrescentar regressões reais de sucesso, erro e REPL com saída parcial; testar também stdout substituído por um stream cujo flush falha.

## Triage

- Decision: `VALID`
- Notes: Corrigido por `_finish`, comum a execute/evaluate: descarrega stdout/stderr antes de serializar o resultado, sem inventar LF. Streams personalizados sem atributo `closed` são aceitos; falha de flush transforma sucesso em erro estruturado e preserva uma exceção principal já existente. A revisão não alterou fontes.
- Verification: Rodada real de 28 testes, 14 Chrome + 14 Edge, todos aprovados, sem retry/flaky/skipped; relatório `.cache/studio-python-runtime/playwright.json`, início `2026-10-16T22:13:10.701Z`, distribuição `e90b2e7f273fe07d50df0000ed76392d0890792b88a57dbbe4a2d51213a3c37a`. Os testes cobrem saída parcial no sucesso, erro e REPL, stream sem closed e falha de flush. Reprodução independente em Node/Pyodide confirmou os mesmos resultados e confirmou que uma falha adicional de flush não substitui a exceção principal.
