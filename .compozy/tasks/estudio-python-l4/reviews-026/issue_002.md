---
status: resolved
file: packages/studio/src/python/language/statementMoves.ts
line: 36
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Evitar trabalho quadrático no planejador da thread principal

## Review Comment

statementLines chama source.lastIndexOf('\n', start-1) e source.lastIndexOf('\r', start-1) para cada comando. Em fonte somente LF, a busca por CR ausente percorre todo o prefixo para cada comando. O planejador é síncrono na thread principal e pode bloquear a interface por segundos antes de chamar o worker.

Entrada dentro dos limites reais: 10.000 repetições de `pass # ` + 88 caracteres `a` + LF. Analyzer CPython3.14.2 aceitou 960.000 bytes, 10.000 comandos e 30.001 tokens. Ensaio Bun local do planejador, três amostras por tamanho: 1.000 comandos/96.000 bytes → 44,5/28,9/27,3 ms; 5.000/480.000 → 621,4/648,6/644,5 ms; 10.000/960.000 → 2840,1/2843,4/2829,9 ms.

A primeira correção, somente índice de linhas, ainda levou 2089,3–2219,9 ms para 10.000 comandos. O loop também verificava `/[\r\n]$/.test(replacement)` no texto acumulado e concatenava esse acumulado a cada append. A resolução precisou remover ambos os grupos de trabalho crescente; não se deve atribuir o custo inteiro ou o ganho final apenas à busca de CR ausente.

Construir um índice de linhas em uma passada e reutilizá-lo nas consultas, ou outra busca cujo custo seja limitado pela linha corrente. Não ampliar cotas ou timeout para acomodar o custo. Esses números são uma reprodução local da causa, não um benchmark de produto/browser.

## Triage

- Decision: `VALID`
- Notes: Implementador adotou índice de linhas compartilhado, busca binária e montagem por fragmentos, comprimento UTF-16 acumulado, último caractere e join único. A mesma reprodução passou após a segunda correção. Nenhuma implementação alterada pelo revisor.

## Verification

- Mesma entrada e reversão, três amostras após a correção completa: 1.000 comandos → 6,9/2,7/2,1 ms; 5.000 → 14,4/10,3/13,4 ms; 10.000 → 15,3/24,1/19,2 ms. Cada tamanho também validou applyPythonSourceEdits, candidato literal e número de copies. São medidas diagnósticas locais, não p95 de produto.
- Suíte independente atual: sourceLines/sourceCopies/sourceEdits — 10 pass, 0 fail, 98 expect() calls.
- Fixture de transações executada com analyzer CPython3.14.2 exato: comentários e fonte inalterada preservados, cinco casos estruturais e cookie protegido passaram. Também passaram os cinco exemplos aninhados atuais como smoke; isso não substitui revisão completa da generalização posterior.
