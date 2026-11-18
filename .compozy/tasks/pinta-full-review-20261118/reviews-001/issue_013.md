---
status: resolved
file: packages/pinta/src/export/pygameProject.ts
line: 70
severity: high
author: claude-code
provider_ref:
---

# Issue 013: Expansão de conjuntos altera geometria e quebra relações

## Review Comment

Conjunto16x16 flipX, filho x2/w4 aparece14..18 em vez de10..14. Ref b fica b enquanto ID vira copy/b. Também afeta runtime compartilhado e Tiled; Godot repete IDs entre instâncias. Aplicar transformação consistente e namespace só em referências internas; preservar externas.

## Triage

- Decision: `VALID`
- Notes: VALID: repro pygame-ce 2.5.8 e Tiled mostram retângulo refletido em 14..18 em vez de 10..14 e referência interna sem namespace. Centralizar transformação canônica, remapear somente IDs locais, corrigir adaptadores e recusar cisalhamento não representável.

## Remediation and Verification

Implementado: helper TS self-contained compartilhado com JavaScript, base afim exata, reflexão normalizada sem deslocar footprint, pontos para cisalhamento e elipse por eixos principais; namespaces apenas em referências locais (inclusive alvo escondido). Pygame espelha a transformação e usa SAT dos tiles girados; Godot conserva scenegraph afim e religa IDs/propriedades por instância. Tile art acompanha o relógio no compositor/Godot. Tiled recusa imagem com shear via TiledSceneCompatibilityError; pacotes Pygame/Godot conservam dados e omitem somente suplemento Tiled com COMPATIBILIDADE-TILED.txt. Provas locais: 240 combinações TS/Python real pygame-ce2.5.8, cantos independentes, 384 pontos da borda de elipses; render real SDLdummy do pacote com artchild45°/setscale2×3flipX e consultas/colisões reais. Comando `PYTHON=<pygame-ce python> bun test src/export/setAdapters.test.ts src/export/tiled/review-regressions.test.ts src/export/sceneDrawing.test.ts src/export/scenePackage.test.ts`: 28 pass, 0 fail, 5300 asserts. `bun test src/export/tiled`: 61 pass, 0 fail. Biome dos arquivos alterados e git diff --check sem erros. Godot real e gates globais delegados ao coordenador; status valid até esses ensaios. Zero commits neste lote.

## Fechamento da rodada

Geometria afim, relações e namespaces cobertos nas suítes Pinta/Estúdio e no Pygame real; Godot headless valida instâncias, origem e referências. Restrições externas continuam declaradas.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
