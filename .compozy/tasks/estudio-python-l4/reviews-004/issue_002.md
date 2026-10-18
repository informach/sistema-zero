---
status: resolved
file: packages/studio/src/python/language/analyzer.py
line: 64
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Tokens CRLF terminam dentro do par de quebra de linha

## Review Comment

O tokenizer recebe a fonte com quebras normalizadas para LF, mas suas colunas eram aplicadas diretamente à linha original com CRLF. Assim NEWLINE/NL de `x=1\r\n` tinha intervalo [3,4], cuja fatia é apenas CR, e terminava no meio do par. A transformação inversa em sourceEdits também aceitava esse intervalo impossível: pythonOffsetToPosition('a\r\nb',2) retornava linha 2, coluna 0. Isso conflita com os limites de edição, que corretamente recusam partir CRLF, e invalida intervalos que consumidores de tokens tratam como fonte original.

Mapear colunas da visão normalizada para as posições originais antes de formar o intervalo; conservar o texto exato do token na fonte. Compartilhar a validação de fronteiras no conversor offset→posição e nas edições. Testar CRLF, CR, LF, literais multilinha, astral e EOF, incluindo o texto e os limites de todos os tokens, não somente nós AST.

## Triage

- Decision: `VALID`
- Notes: Corrigido durante a revisão e revalidado independentemente. Tokens agora conservam a fatia original; o conversor recusa posições internas a CRLF e pares substitutos.

## Revalidation

Prova independente em CPython com quatro fontes, incluindo quebras mistas, literal multilinha com emoji e erro sintático: todos os textos de token coincidem com sua fatia UTF-16 e nenhuma fronteira divide CRLF. O primeiro caso passou a produzir [3,5], [10,12] e [15,17]. Teste sourceEdits atual executado: 3 pass, 0 fail, 18 verificações, exit 0, incluindo recusa das fronteiras inválidas. Nenhum Playwright executado pelo revisor.
