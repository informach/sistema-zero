---
status: resolved
file: packages/studio/src/python/blocks/selection.ts
line: 118
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Curadoria vazia elimina a paleta em vez de aplicar o nível

## Review Comment

O teste de truthiness de `options.allowBlocks` trata `[]` como uma seleção explícita de zero blocos. Isso contraria a política documentada na proposta, seção 6, linha 293: `allowBlocks` vazio ou ausente continua usando a política por nível. A divergência está inclusive fixada pelo último teste de selection.test.ts, mas não corresponde a uma mudança autorizada de contrato.

Reprodução independente com o catálogo real, todos os IDs aprovados e nenhuma extensão: `selectPythonPalette({level: 1, installedExtensions, approvedBlockIds})` retorna 17 entradas; a mesma chamada com `allowBlocks: []` retorna zero. Uma atividade sem curadoria específica representada por array vazio perderia toda a paleta, mesmo com os mesmos nível e grants.

Usar a seleção explícita apenas quando a lista tem elementos. Cobrir equivalência entre ausência e array vazio em cada nível, preservando recusa de IDs desconhecidos e de dependências indisponíveis. Se futuramente for necessário representar uma paleta intencionalmente vazia, isso precisa de um campo/estado próprio, sem reutilizar o significado existente de `[]`.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com o ramo explícito condicionado a allowBlocks.length. Revalidação independente comparou integralmente ausência e array vazio nos três níveis: resultados idênticos, com 17, 70 e 75 entradas quando todo o catálogo está aprovado. Sem IDs aprovados, ambas as formas conservam zero entradas, sem ampliar autorização. Testes frescos de selection.test.ts: 5 pass, 0 fail, 161 verificações; Biome dos dois arquivos, exit 0.
