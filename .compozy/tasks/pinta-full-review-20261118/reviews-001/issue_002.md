---
status: resolved
file: packages/pinta/src/core/project.ts
line: 744
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Propriedades tipadas de camada ainda são gravadas no formato 3

## Review Comment

tilemapNeedsV4 só considera objetos. Propriedade tipada de camada/grupo recebe schema/envelope3, que o leitor histórico lê e corta. Considerar todos os contêineres tipados e testar contra contrato histórico.

## Triage

- Decision: `VALID`
- Root cause: `tilemapNeedsV4` verifica propriedades tipadas apenas em objetos. Propriedades de camadas e grupos passam por sanitização, mas recebem schema/envelope 3, aceitos pelo leitor histórico que as remove.
- Fix: propriedades tipadas em todas as camadas/grupos exigem formato 4; propriedades primitivas continuam no 3. Registro, wire, envelope e migração do carimbo 3 cobertos.
- Additional authorized correction: preservados deslocamentos fracionários finitos, com os mesmos clamps e omissão apenas de zero. Frações exigem schema/envelope 4 porque o leitor histórico de 3 as arredondava. O teste legado de valor padrão agora usa zero real, e um teste novo conserva frações positivas/negativas em peças, grupos e objetos.
- Verification: red inicial com três falhas de carimbo (3 em vez de 4); regressão adicional de frações também falhou antes da correção. Green estreito: 115 pass, 0 fail, 569 asserções, 8 arquivos, 1,71 s. Biome nos oito arquivos próprios: exit 0.
- Gate amplo: pendente, coordenado pela sessão principal; o status registra a correção e sua prova estreita, não aprovação integral do repositório. Automatic commits disabled; nenhum commit criado.

## Verification

`bun test src/core/mapFormat3.test.ts src/core/mapFormat4.test.ts src/core/assetDependencies.test.ts src/core/gallerySelection.test.ts src/core/sceneDocument.test.ts src/export/assetJson.test.ts src/export/portableImageCapture.test.ts src/tiles/sets.test.ts`

Saída: `115 pass`, `0 fail`, `569 expect() calls`, `Ran 115 tests across 8 files. [1.71s]` (exit 0).

## Fechamento da rodada

Carimbo de propriedades tipadas e regressões 3/4/5 incluídos nos 2.024 testes do Pinta e na checagem de tipos.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
