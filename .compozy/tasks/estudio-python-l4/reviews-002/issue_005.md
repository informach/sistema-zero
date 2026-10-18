---
status: resolved
file: packages/studio/src/runtime/python/interpreter.ts
line: 8
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: Python sem Turtle inclui o parser gráfico no worker inicial

## Review Comment

O import estático de `readTurtleGraphicsRequest` e `TURTLE_GRAPHICS_LIMITS` incorpora a implementação do protocolo gráfico no worker carregado por todo projeto Python. O fetch posterior dos módulos Python e renderer é lazy, mas a implementação do adapter não é inteiramente opcional.

Build em memória do entrypoint worker, com target browser, formato esm e loader .py=text, confirmou `function readTurtleGraphicsRequest` no bundle de Python básico. A prova browser atual que apenas procura requests contendo `/turtle/` ou `turtle-renderer.mjs` não observa código incorporado em worker.mjs. O contrato de desempenho, linhas14/71, exige zero bytes de adapter gráfico para projetos sem Turtle e admite apenas descritores leves compartilhados.

Mover a implementação para uma dependência lazy carregada depois do gate da extensão, mantendo só metadados leves/tipos no caminho inicial. Qualificar tanto o grafo/bundle do worker inicial quanto os requests em Python sem Turtle; manter integridade/allowlist da distribuição para o módulo novo.

## Triage

- Decision: `VALID`
- Notes: Corrigido com módulo turtle-protocol.mjs importado após o gate da extensão. Novo Bun.build independente em memória: worker inicial de 1.147.252 bytes não minificados não contém definição do parser, renderer ou decoder; contém a referência dinâmica ao módulo. Prova real de requests plain Python aprovada em Chrome/Edge e manifesto observado inclui o arquivo separado com SHA. Nenhuma distribuição foi escrita pelo revisor.
