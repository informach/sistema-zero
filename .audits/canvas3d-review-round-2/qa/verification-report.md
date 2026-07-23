VERIFICATION REPORT
-------------------
Claim: Os três achados da revisão Canvas 3D foram corrigidos na origem e possuem regressões automatizadas.
Executed: 2026-07-23, evidência fresca no worktree atual.
Verdict: PASS para a categoria Canvas 3D e para os três achados. O gate global do package permanece vermelho somente por alterações paralelas de Jogo 3D Avançado, detalhadas abaixo.

AUTOMATED COVERAGE
------------------
Support detected: yes
Harness: Bun test + Playwright 1.60.0
Required flows:
  - Canvas do núcleo → cena → renderizador → câmera → luz → render: PASS
  - Terreno e personagem com física leve no preview: PASS
  - Cidade e visão à frente em desktop: PASS
  - Inventário, níveis, sockets e seletores: PASS
  - Round-trip, macros, addons conhecidos e imports core: PASS
  - Three.js misturado com `Set.add`/objeto `.visible`: PASS, regressão BUG-001
  - Sinais Canvas 3D somente dentro de evento e shadowing local: PASS, regressão BUG-001
  - Classe local homônima a addon versus binding importado: PASS, regressão BUG-002
  - Vários/custom addons no modo automático: PASS, regressão BUG-003
Specs added or updated:
  - `src/parsers/__tests__/canvas3dFacilitators.test.ts`
  - `src/three/__tests__/canvas3dSafety.test.ts`
  - `src/blockly/__tests__/canvas3dAudit.test.ts`
Commands executed:
  - `bun run typecheck` | Exit code: 0 | sem diagnósticos
  - Biome nos 11 arquivos alterados | Exit code: 0 | sem diagnósticos
  - `bun run --bun vite build --config playground/vite.config.ts` | Exit code: 0 | 1.526 módulos
  - regressões dos três achados | Exit code: 0 | 32 testes, 392 expectativas, 3 arquivos
  - matriz focada Canvas 3D | Exit code: 0 | 169 testes, 1.012 expectativas, 24 arquivos
  - `bun test src/ir/__tests__/programmingSymbols.test.ts` | Exit code: 0 | 32 testes, 67 expectativas
  - `bunx playwright test e2e/canvas3d.spec.ts` | Exit code: 0 | 3 testes em Chromium
  - `bun test src` | Exit code: 1 | 5.297 PASS e 4 FAIL, todos externos ao Canvas 3D
  - `bun run check` | Exit code: 1 | arquivos desta correção limpos; 2 arquivos externos com drift
Global worktree blockers outside this fix:
  - `src/examples/qaContracts.test.ts`: o exemplo novo `game-3d-advanced:O Chefão das Sombras` não possui contrato QA.
  - `src/blockly/__tests__/blockContracts.test.ts`: `sz_g3k_on_hurt` não está classificado como callback adiado.
  - `src/blockly/__tests__/restoreShadowLiterals.test.ts`: faltam presets de `sz_g3k_heal` e `sz_g3k_spawn_ring`.
  - Biome: `src/official-extensions/game-3d-advanced/__gen_chefao.ts` e `src/official-extensions/game-3d/__tests__/blockAudit.test.ts`.
Warnings: build registra chunks globais acima de 500 kB; maior chunk JavaScript com aproximadamente 4,9 MB (1,28 MB gzip). Não foi correlacionado a uma regressão de Canvas 3D.

BROWSER EVIDENCE
----------------
Dev server: Vite do playground em `http://127.0.0.1:5195`, iniciado pelo Playwright.
Flows tested: 3
Flow details:
  - Cena manual sobre Canvas do núcleo | Verdict: PASS | Evidence: `e2e/canvas3d.spec.ts:335`
  - Física leve com terreno e personagem | Verdict: PASS | Evidence: `e2e/canvas3d.spec.ts:360`
  - Cidade e visão à frente no desktop | Verdict: PASS | Evidence: `e2e/canvas3d.spec.ts:375`
Viewports tested: desktop; mobile não é prioridade para programação neste produto.
Authentication: not required
Blocked flows: none.

ISSUES FILED
------------
Total: 3
By severity:
  - Critical: 0
  - High: 0
  - Medium: 2 fixed
  - Low: 1 fixed
Details:
  - BUG-001: Ponte classifica métodos homônimos pelo projeto inteiro | Severity: Medium | Priority: P2 | Status: Fixed
  - BUG-002: Lifecycle confunde classe local com addon Canvas 3D | Severity: Medium | Priority: P2 | Status: Fixed
  - BUG-003: Modo livre de addon gera import inválido | Severity: Low | Priority: P3 | Status: Fixed
