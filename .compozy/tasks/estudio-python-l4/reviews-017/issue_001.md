---
status: resolved
file: packages/studio/src/runtime/capture.ts
line: 39
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Invalidar capturas pendentes quando o cache for limpo

## Review Comment

`clear()` apagava somente a imagem já armazenada. Uma `capture()` iniciada antes da limpeza podia concluir depois, chamar `remember()` com o mesmo owner e repovoar o cache que acabara de ser invalidado. A captura pendente e uma consulta posterior, mesmo após desregistrar o owner, devolviam essa imagem antiga.

Reprodução independente: registrar um owner com captura controlada por Promise; iniciar `capture(project)`; aguardar a entrada na captura; chamar `clear()` sem trocar o owner; resolver a Promise com um PNG válido da mesma execução; desregistrar o owner e consultar novamente. Antes da correção, ambas as consultas devolviam o PNG. O teste anterior combinava limpeza e troca de owner e não cobria essa fronteira.

A invalidação deve incrementar uma geração, capturada antes da primeira suspensão e conferida depois da preparação do snapshot, antes de armazenar a resposta e antes de retornar uma imagem. Isso também impede que a operação antiga use uma imagem nova que tenha sido adicionada depois da limpeza.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com epoch capturado no início de `capture()`, checagens nas três fronteiras e incremento em `clear()`. Revalidação do caso exato passou; nenhuma fonte foi modificada pelo revisor.

## Verification

- A nova regressão permanente `clear alone revokes a capture in flight even when the owner has not changed` confirma retorno null da operação antiga e da consulta posterior após detach.
- `bun test src/runtime/capture.test.ts src/runtime/python/controller.test.ts src/runtime/registry.test.ts`: 16 pass, 0 fail, 71 verificações, exit 0. Inclui isolamento por instância/conteúdo, TTL, owner substituído, PNG inválido e política fresca de execução.
- `bunx biome check src/runtime/capture.ts src/runtime/capture.test.ts src/cover/thumbCapture.ts`: exit 0, três arquivos verificados sem alterações.
