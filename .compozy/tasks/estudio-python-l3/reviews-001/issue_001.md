---
status: resolved
file: packages/studio/src/runtime/python/consoleBuffer.ts
line: 59
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Callback batched perdia fragmentos e acumulava linhas sem limite

## Review Comment

O contrato anterior de `appendLine` assumia que cada callback `batched` do Pyodide representava uma linha completa e acrescentava LF. Porém esse callback mistura linhas completas e fragmentos descarregados, sem distingui-los. Além disso, a implementação StringWriter do Pyodide acumula bytes até LF ou fsync antes de chamar o consumidor; portanto o ring posterior não limitava uma linha contínua. Na reprodução local, 819.200 caracteres sem LF ficaram acumulados antes de qualquer callback. Dois fragmentos descarregados por fsync geraram `['a', 'b']`, que o contrato anterior transformaria em `a\nb\n`, em vez de `ab`.

Usar Writer.write por bytes, decodificação UTF-8 incremental por stream e limite durante o consumo, antes de acumular uma linha completa. Preservar ausência de LF e retornar o número de bytes consumidos mesmo ao descartar saída. A documentação oficial distingue esses contratos: https://pyodide.org/en/314.0.7/usage/streams.html#standard-out-standard-error.

## Triage

- Decision: `VALID`
- Notes: Corrigido antes desta rodada: o buffer recebe Uint8Array em blocos limitados, mantém decoder por stream e não retém views da memória WASM. O interpretador instala setStdout/setStderr com Writer.write antes do código autoral. O callback por linha permanece apenas durante o boot confiável.
- Verification: Testes focados: 9 testes, 39 verificações, nenhuma falha. Reprodução real com Pyodide 314.0.7 e o buffer atual: 819.200 bytes sem LF, 61.440 caracteres retidos, 757.760 omitidos, nenhum LF inventado; fragmentos preservados como `ab`. A prova de fragmentação UTF-8 e mutação da view também passa.
