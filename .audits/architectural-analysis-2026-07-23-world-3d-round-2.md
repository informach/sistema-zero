# Auditoria arquitetural: Mundo 3D, rodada 2

Data: 2026-07-23

## Escopo

- Extensão Mundo 3D, seus 137 blocos, manifest, runtime, exemplos, documentação e contexto da IA.
- Pipeline Blockly -> SZIR -> JavaScript -> Ponte -> Blockly.
- Integração atual do fragmento compartilhado de assets locais para GLB e HDR.
- Ciclo de vida do preview, descarte WebGL e execução real da galeria.

## Resultado

Nenhum achado novo foi identificado.

### Contratos confirmados

- Os 120 comandos `w3d:*` emitidos pelo gerador também são cobertos pelo coletor de identificadores. Não há regressão do achado corrigido na rodada anterior.
- A string publicada do runtime contém `dataUrlToBuffer`, não contém o marcador de injeção e continua desativando o loop e descartando o renderer no teardown.
- Os métodos documentados pelo contexto de IA existem no runtime. A API não documentada `disposeAll` é intencionalmente não enumerável e usada somente pelo ciclo de vida e pelos testes.
- Não há `eval`, `new Function`, `document.write`, `fetch`, XHR ou WebSocket no runtime publicado.
- O runtime usa importações ESM fixadas e assets locais, sem acesso a rede no preview.

## Evidências executadas

- `bun test src/official-extensions/world-3d`: 260 aprovados, 0 falhas.
- `bun run e2e -- e2e/examples-gallery.spec.ts --grep "world-3d:"`: 13 aprovados, 0 falhas no Chromium. Cobre os 12 exemplos e Fazendinha em 390 x 844.
- `bun run typecheck`: aprovado.
- `bun run check`: aprovado. Há uma informação preexistente fora do escopo em `game-3d-advanced/__gen_chefao.ts`.

## Integridade do worktree

Esta rodada não alterou código de produção ou testes. As mudanças locais já presentes foram preservadas.
