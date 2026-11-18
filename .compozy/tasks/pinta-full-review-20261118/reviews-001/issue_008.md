---
status: resolved
file: packages/pinta/src/components/editor/MapObjectArtwork.tsx
line: 18
severity: medium
author: claude-code
provider_ref:
---

# Issue 008: Miniatura de conjunto vivo ignora mudanças de suas dependências

## Review Comment

Cache depende só da identidade da definição; tileset/art atualizado continua com imagem antiga até reabrir. Invalidar pela identidade/revisão de dependências, incluindo resultados nulos e sem recriar a cada render.

## Triage

- Decision: `valid`
- Notes: Valid: a chave WeakMap inclui apenas a definição, mas a imagem depende de outras artes. Guardar snapshot transitivo de identidades de dependências (incluindo ausentes) e invalidar somente quando ele muda.

## Implementation

O cache guarda snapshot transitivo das identidades de dependências visuais usando pintaAssetDependencyIds. Uma folha ausente que chega, ou uma dependência atualizada, invalida a entrada. Closures find novas com dependências iguais continuam compartilhando a mesma Promise.

## Verification

- RED: regressões novas falharam antes da correção (balde, H/V/D, recorte, cache, nível e posição no palco).
- GREEN local: `bun test packages/pinta/src/tiles/terrain.test.ts packages/pinta/src/tiles/sets.test.ts packages/pinta/src/components/editor/MapObjectArtwork.test.ts packages/pinta/src/components/editor/mapTools/mapTools.test.ts`: **73 pass, 0 fail**, 307 assertions.
- UI happy-dom, cwd `packages/pinta`: `bun test src/components/editor/mapToolsUi.test.tsx --test-name-pattern 'inserção e colagem no espaço|biblioteca usa o tamanho'`: **6 pass, 0 fail**; regressões `--test-name-pattern 'biblioteca:|colar põe|níveis do editor'`: **6 pass, 0 fail**.
- Biome nos 13 arquivos de implementação/testes deste lote: **Checked 13 files; No fixes applied**. Nenhum navegador/motor externo/dispositivo físico foi usado neste lote.
- Status permanece `valid` até os gates globais coordenados pelo agente principal. Sem commit automático.

## Fechamento da rodada

Mudanças de dependências de conjuntos e miniaturas incluídas na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
