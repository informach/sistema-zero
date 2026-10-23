---
status: resolved
file: packages/studio/src/runtime/python/turtle/renderer.ts
line: 242
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Texto com quebra de linha perde layout e medidas do Turtle

## Review Comment

`paint()` envia toda a string a um único `fillText`; `measure()` também chama `measureText` na string inteira. Canvas não realiza o layout multiline de um item de texto Tk. `write('A\nB')` portanto não mantém as linhas, e consultas de bounds usadas por `write(move=True)` não representam a largura da linha mais longa.

Na referência Tk real, Arial12 com anchor sw produziu bbox de 18 px de altura para `AB` e 36 px para `A\nB`, com larguras diferentes. A execução isolada do renderer confirmou exatamente uma chamada de desenho e uma de medição com `A\nB` ainda inteiro. O problema é estrutural de layout, distinto da diferença tolerada de rasterização/fontes entre plataformas.

Implementar layout por linhas compartilhado por desenho, medição e seleção; preservar anchor/align e espaçamento com tolerâncias explícitas. Qualificar newline, linha vazia, tabs e `move=True` contra Tk, sem exigir igualdade byte a byte de pixels ou métricas específicas do sistema operacional.

## Triage

- Decision: `VALID`
- Notes: Corrigido com layout compartilhado por linhas/chunks/tab stops em text.ts, medição do bloco e desenho por linha. Provas reais Chrome/Edge conferidas em runs/2026-10-16T23-33-04.863Z/report.json: duas faixas de pixels de texto e write(move=True, align='right') aprovado. Diferenças de métricas/rasterização por plataforma permanecem explicitamente toleradas, sem declarar conformance de todas as fontes.
