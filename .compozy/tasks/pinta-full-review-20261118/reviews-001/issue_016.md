---
status: resolved
file: packages/core/src/studio/pinta-scene-player.ts
line: 8
severity: high
author: codex
provider_ref:
---

# Issue 016: Composição portátil falha após minificação e pesa no bundle inicial

## Triage

- Decision: VALID, encontrada durante a remediação, sem atribuir a introdução ao remoto.
- RED: testes Bun da função compartilhada passavam, mas os dois exemplos reais em build de
  produção ficavam com iframe vazio. O bundler reescrevia concatenações de `Function.toString()`
  como templates recusados pelo compactador. Após essa correção, o gate de bundle detectou
  48.803 bytes gzip contra teto de 48.000: o fragmento era carregado eagerly.

## Implementation

`gen-pinta-scene-transform.ts` deriva texto estável da função canônica antes do bundler,
conferido em CI. `map-2d/bootstrap.ts` importa o cenário sob demanda. Bundle inicial e tetos
absolutos dos motores ficam iguais. A fonte gerada também compacta espaços antes do
bundler, mantendo sintaxe estável: o orçamento auxiliar final é 14.000 caracteres,
medido em 13.381/13.380 com geometria e colisão corrigidas. O teto anterior de 74.000
para o documento de cena continua igual, sem aumentar payload para acomodar a correção.

## Verification

Build de produção deixou de falhar na carga do motor; a suíte de navegador passou a acusar
somente a dependência externa prévia do Blockly (issue 018). Regressões de variantes,
ambos motores e bundle: 22 testes passaram. Gate completo posterior registrado no QA.

## Fechamento da rodada

Fonte gerada conferida; suítes completas, orçamentos preservados e builds de produção da Vila nos dois motores verificados no navegador.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
