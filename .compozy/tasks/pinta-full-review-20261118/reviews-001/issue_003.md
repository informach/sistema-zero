---
status: resolved
file: packages/pinta/src/core/project.ts
line: 671
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Referências tipadas a recursos escapam da travessia e remapeamento

## Review Comment

type:asset em propriedades de objeto/camada/peça não inclui o recurso no backup, captura ou proteção de exclusão. tileProperties também não remapeia o ID na importação. Unificar dependências lógicas e visuais e remapear todos os contêineres, com limites e ciclos seguros.

## Triage

- Decision: `VALID`
- Root cause: a lista de dependências cobre só referências visuais; o bundle duplica a mesma regra incompleta. O import remapeia referências de mapas, mas ignora `tileProperties` de ambos os tipos de tileset.
- Fix: incluir propriedades `type:asset` de todas as camadas, objetos e peças na função canônica; usar essa fonte no bundle, captura, seleção e exclusão; remapear todos os contêineres. Bundle iterativo com ciclos seguros e orçamento explícito, sem recursão sem limite.
- Scope: ajuste mínimo também em `state/persistence.ts`, pois o ramo otimizado atual retorna tilesets sem capturar dependências; reusar limite já existente de captura (225 recursos).
- Implemented: função canônica inclui referências tipadas de peças de pixel/vetor, camadas, grupos, objetos e mapas internos de conjuntos. Bundle usa a mesma fonte, iterativamente, com ciclos seguros e limite explícito de 225 recursos (incluindo a raiz), sem corte. Importação religa os IDs dos dois tipos de tileset. Captura transacional promove também mapas cujas dependências transitivas vêm somente das peças; caminho simples legado mantém uma leitura conjunta. Referência ao próprio documento não o torna impossível de excluir. Seleção usa índice por ID, visita cada recurso uma vez e contabiliza só tilesets no aviso de peças adicionais.
- Verification: regressões iniciais reproduziram perdas em fechamento do pacote, remapeamento, captura e exclusão. Green estreito: 115 pass, 0 fail, 569 asserções, 8 arquivos, 1,71 s; inclui ciclos, limites 225/226, auto-referência e troca de referência durante descoberta. Biome nos oito arquivos próprios: exit 0.
- Gate amplo: pendente e coordenado pela sessão principal. Este fechamento se refere às fronteiras nativas no escopo; o adaptador `export/scene.ts` mantém sua descoberta visual própria e precisa de avaliação separada para transporte de recursos apenas lógicos ao Estúdio (comunicado ao root e ao revisor de exportação, sem alterar seu ownership).
- Automatic commits disabled; nenhum commit criado.

## Verification

`bun test src/core/mapFormat3.test.ts src/core/mapFormat4.test.ts src/core/assetDependencies.test.ts src/core/gallerySelection.test.ts src/core/sceneDocument.test.ts src/export/assetJson.test.ts src/export/portableImageCapture.test.ts src/tiles/sets.test.ts`

Saída: `115 pass`, `0 fail`, `569 expect() calls`, `Ran 115 tests across 8 files. [1.71s]` (exit 0).

## Fechamento da rodada

Fechamento nativo, ciclos, limite de 225 recursos, remapeamento e invalidação de cache incluídos na suíte completa do Pinta.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
