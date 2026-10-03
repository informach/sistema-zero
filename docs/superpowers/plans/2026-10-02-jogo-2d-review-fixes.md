# Correção dos achados de Jogo 2D — plano de execução

**Goal:** corrigir R1–R7 e os ajustes pedagógicos do full review aprovado pelo usuário.
**Architecture:** projeção, desenho e identidade de cópias compartilhados; vocabulários públicos distintos. O básico oferece comportamentos prontos. O Avançado combina operações de perspectiva com vida, telas, estados, moldes e HUD nativos. Nenhum bloco legado será restaurado.
**Tech Stack:** TypeScript, strings de runtime JavaScript, Blockly, IR/Zod, Bun e Playwright.
**Spec:** `.audits/full-review-2026-10-02-jogo-2d.md`; autorização: “Corrija todos os achados”. Execução direta nesta sessão, sem commits ou deploy.

O design segue a recomendação aprovada: manter um motor de geometria comum e separar suas interfaces pedagógicas. Apenas renomear os comandos preservaria o acoplamento; duplicar os motores criaria duas implementações da mesma projeção. A separação dos contratos mantém a simplicidade com personalização real.

- [x] R3/R6/R7: promover as reproduções a testes; identidade da família independente do original; isolar cada evento com diagnóstico; aceitar escalas automáticas válidas e atualizar avisos. Arquivos: `scene-2d/spriteRuntime*`, `spriteHosts.ts`, `runtime*`.
- [x] R4/R5: integrar limpeza/fundos e estado da partida ao driver básico. Cobrir início, vitória, derrota, pausa, reinício e desenho comum. Arquivos: `game-2d/runtime/stage.ts`, `lifecycle.ts`, testes do runtime real.
- [x] R1/R2: separar catálogo e API por extensão, substituir os atalhos acoplados do Avançado por seguir personagem, velocidade, chegada, entrada, limite, câmera e leitura de posição. Posicionar/repetir em eventos; mover sem jogador; permitir agir em cada cópia com blocos nativos. Propagar pelo codec, schema, escopo, seletores e documentação.
- [x] Exemplos: básico com escolhas prontas e progressão documentada; avançado com vida, estado, telas e HUD nativos e regra de chegada; Canvas preserva implementação manual. Testar uma composição de nave/ondas e cenários num jogo comum. Regenerar IRs e catálogo.
- [x] Verificar testes de regressão, suíte do Studio, TypeScript, Biome, sincronização dos exemplos, navegador desktop/celular e ausência dos blocos/APIs substituídos. Atualizar o relatório com evidências e a documentação final.

Comandos no pacote `packages/studio`: `bun test src/official-extensions/scene-2d src/examples/snowDescentRuntime.test.ts`; `bun run gen:snow-descent`; `bun run gen:server-examples`; `bun test src`; `bunx tsc --noEmit`; `bun run check:snow-descent`; Playwright nos exemplos e seletores afetados.

Verificação concluída: 8.692 testes em 550 arquivos, oito casos Chromium, TypeScript sem diagnósticos, Biome limpo em 90 arquivos e as três IRs da neve sincronizadas. Relatório atualizado em `.audits/full-review-2026-10-02-jogo-2d.md`.
