---
status: resolved
file: packages/pinta/src/export/tiled/native.ts
line: 145
severity: high
author: claude-code
provider_ref:
---

# Issue 012: Importação desloca coordenadas negativas sem relatório

## Review Comment

Objeto Tiled(-12,-6) vira nativo(0,0) por saneamento, warnings vazio. Preservar a geometria dentro do contrato, ou recusar/reportar antes de inserir. Nunca apresentar conversão exata com deslocamento silencioso.

## Triage

- Decision: `VALID`
- Notes: VALID: objeto (-12,-6) é aceito e convertido para (0,0), sem warning. Recusar coordenadas negativas antes da conversão nativa; preservar a cena intermediária e informar o limite.

## Remediation and Verification

Implementado: sceneToNative recusa objeto com x/y negativos em mapas e definições de conjunto, com mensagem explicando o limite; nenhuma inserção ocorre com coordenada alterada. Cena intermediária continua representando coordenadas negativas do Tiled. Prova red→green: antes promise resolved; após rejeita com frase negativa. `bun test src/export/tiled`: 61 pass, 0 fail. Gate global delegado ao coordenador; status valid até esse gate.

## Fechamento da rodada

Coordenadas negativas são recusadas explicitamente; regressão incluída na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
