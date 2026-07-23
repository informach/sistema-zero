VERIFICATION REPORT
-------------------
Claim: Todos os oito achados da revisão da categoria Canvas 3D foram corrigidos e receberam regressões automatizadas.
Executed: 2026-07-23, em rodadas frescas no mesmo worktree.
Output summary: regressões diretamente alteradas com 191 testes/0 falhas/842 expectativas; matriz ampliada Canvas 3D com 272 testes/0 falhas/1.194 expectativas; suíte total com 5.258 testes/0 falhas/48.469 expectativas em 317 arquivos; build com 1.526 módulos; Canvas 3D E2E com 3/3 em Chromium.
Warnings: `bun run check` registra apenas uma variável não usada em `official-extensions/game-3d/__tests__/playthrough.test.ts`; o build registra o aviso global de chunk acima de 500 kB.
Errors: `bun run typecheck` permanece bloqueado exclusivamente por diagnósticos em testes já alterados de `official-extensions/game-3d` (`playthrough.test.ts` e `runtime.test.ts`). Nenhum diagnóstico aponta para os arquivos Canvas 3D corrigidos.
Verdict: PASS no escopo Canvas 3D — todos os achados e fluxos da categoria passam; o gate TypeScript global tem um bloqueio externo documentado.

AUTOMATED COVERAGE
------------------
Support detected: yes
Harness: Bun test + Playwright 1.61.1
Required flows:
  - Canvas do núcleo → cena → renderizador → câmera → luz → render: covered-e2e
  - Terreno e personagem com física leve no preview: covered-e2e
  - Layout desktop de cidade e visão à frente: covered-e2e
  - Inventário/nível/socket/adapters dos blocos: covered-unit
  - Resource creator como `newExpr` dentro de loop: covered-unit
  - Namespace alheio a Three na Ponte: covered-unit
  - Variável genérica contendo `new THREE.X`: covered-unit
  - Grounding/centro exato de esfera: covered-unit
  - Sentinela e adulteração de payload de macro: covered-unit
  - IDs físicos contendo `|`: covered-unit
  - Capacidade de cor de `LineMaterial`: covered-unit
Specs added or updated:
  - `src/three/__tests__/canvas3dSafety.test.ts`
  - `src/three/__tests__/physicsLiteRuntime.test.ts`
  - `src/parsers/__tests__/canvas3dSelectors.test.ts`
  - `src/ir/__tests__/programmingSymbols.test.ts`
  - `src/blockly/fields/__tests__/FieldNamePicker.test.ts`
  - `src/three/__tests__/canvas3dMacroCodec.test.ts`
  - `src/blockly/__tests__/canvas3dAudit.test.ts`
Commands executed:
  - regressões diretamente alteradas | Exit code: 0 | 191 testes, 842 expectativas.
  - matriz ampliada Canvas 3D | Exit code: 0 | 272 testes, 1.194 expectativas.
  - `bun test src` | Exit code: 0 | 5.258 testes, 48.469 expectativas, 317 arquivos.
  - `bun run check` | Exit code: 0 | 798 arquivos, sem correções; 1 warning externo.
  - `bun run typecheck` | Exit code: 1 | somente erros externos em testes de Jogo 3D.
  - `bun run --bun vite build --config playground/vite.config.ts` | Exit code: 0 | 1.526 módulos.
  - `bunx playwright test e2e/canvas3d.spec.ts` | Exit code: 0 | 3 testes em Chromium, 20,9 s.
  - `git diff --check` | Exit code: 0 | sem whitespace errors.
Manual-only or blocked:
  - Compreensão infantil de nomes, tooltips e ordem dos grupos exige teste observacional com crianças.
  - GPU/dispositivos variados e uso offline não foram executados; limites de rede estão documentados.
  - Typecheck global bloqueado por testes de Jogo 3D fora deste escopo.

BROWSER EVIDENCE
----------------
Dev server: Vite do playground gerenciado pelo Playwright em `http://127.0.0.1:5195`.
Flows tested: 3
  - Cena real sobre Canvas do núcleo: PASS.
  - Terreno e personagem com física leve: PASS.
  - Cidade e visão à frente no desktop: PASS.
Viewports tested: desktop; largura mobile não é prioridade deste produto para programação.
Authentication: not required
Blocked flows: none.

ISSUES FILED
------------
Total: 8
By status:
  - Fixed: 8
  - Open: 0
By severity:
  - High: 2 fixed
  - Medium: 3 fixed
  - Low: 3 fixed
Details:
  - BUG-001: `newExpr` contorna lifecycle de recursos | High/P1 | Fixed
  - BUG-002: esfera não aterrissa e não resolve centro exato | High/P1 | Fixed
  - BUG-003: qualquer namespace vira Canvas 3D | Medium/P2 | Fixed
  - BUG-004: variável genérica perde capacidade 3D | Medium/P2 | Fixed
  - BUG-005: sentinela em texto quebra macro | Medium/P2 | Fixed
  - BUG-006: checksum ignora payload semântico | Low/P3 | Fixed
  - BUG-007: `|` em ID físico corrompe contatos | Low/P3 | Fixed
  - BUG-008: LineMaterial ausente do seletor de cor | Low/P3 | Fixed
