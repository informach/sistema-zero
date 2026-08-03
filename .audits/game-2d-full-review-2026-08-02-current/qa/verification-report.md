VERIFICATION REPORT
-------------------
Claim: A extensão Jogo 2D v0.57.1 corrige o gargalo de tilemap e os pontos de manutenção aprovados, preservando a saída funcional. Os riscos de compatibilidade ficaram aceitos sem exposição no inventário de produção; a progressão pedagógica permanece como decisão de produto.
Command: benchmark 512×512 + `bun run check` + `bun run typecheck` + `bun test src` + Playwright da galeria `game-2d:`
Executed: 2026-08-02, follow-up da v0.57.1
Exit code: 0 em todos os gates finais
Output summary: 1.002 testes básicos do game-2d passaram; Biome verificou 1.043 arquivos; typecheck passou; a suíte global teve 6.468 pass e 0 fail; 41 cenários Playwright passaram no Chromium.
Warnings: o worktree continuou recebendo alterações externas fora do escopo; elas foram preservadas. AA-01, AA-02 e AA-05 permanecem documentados como decisões aceitas.
Errors: nenhum nos gates finais da v0.57.1.
Verdict: PASS WITH ACCEPTED RISKS

AUTOMATED COVERAGE
------------------
Support detected: yes
Harness: Bun test + Playwright
Canonical command: `bun run e2e`
Required flows:
  - abrir os 31 exemplos, obter primeiro frame real e enviar controles: existing-e2e
  - preservar geometria lógica em DPR 1/2/3: existing-e2e
  - preservar layout game-2d em 390x844: existing-e2e
  - tremor não criar barras/scroll: existing-e2e
  - reabrir projeto v0.25-v0.56 com `sz_g2d_update_group_no_gravity`: accepted-risk (sem projeto afetado em produção)
  - atualizar projeto v0.56 com física implícita sem mudar o comportamento: accepted-risk (sem projeto afetado em produção)
  - limitar custo de `collideTileMap` em grade máxima: covered (teste determinístico + benchmark)
Specs added or updated:
  - `runtime.test.ts`: guarda de complexidade, mutação das listas públicas e caches não enumeráveis
  - `templateGuard.test.ts`: inventário dos três novos fragmentos de kits casuais
Commands executed:
  - `bun install --frozen-lockfile` | Exit code: 0 | Summary: dependências coerentes com lockfile
  - benchmark 512×512, 512 sólidos, 3 warmups, 30 runs | Exit code: 0 | Summary: baseline p95 75,39 ms; pior lote final p95 7,68 ms (−89,8%); golden SHA-256 idêntico
  - `bunx biome check` focado | Exit code: 0 | Summary: sem fixes
  - `bun run check` | Exit code: 0 | Summary: 1.043 arquivos verificados
  - `bun run typecheck` | Exit code: 0 | Summary: `tsc --noEmit` aprovado
  - testes exatos de `game-2d/__tests__` | Exit code: 0 | Summary: 1.002 pass, 0 fail, 5.802 expects, 42 arquivos
  - testes focados de runtime e contrato tipado | Exit code: 0 | Summary: 140 pass, 0 fail
  - níveis/toolbox/sanitizer/compatibilidade | Exit code: 0 | Summary: 49 pass, 0 fail
  - `bun test src` | Exit code: 0 | Summary: 6.468 pass, 0 fail, 70.647 expects, 426 arquivos
  - `bun test src/official-extensions/examplesLoading.test.ts` | Exit code: 0 final | Summary: 2 pass; a primeira execução havia reproduzido o hash divergente antes de uma atualização paralela
  - `bun run e2e -- e2e/examples-gallery.spec.ts --grep "game-2d:"` | Exit code: 0 | Summary: 41 pass em 2,4 min no follow-up
  - `bun run e2e -- e2e/examples-gallery.spec.ts --grep "Jogo 2D mantém o viewport"` | Exit code: 0 | Summary: 1 pass
Manual-only or blocked:
  - exploração manual via `agent-browser`: blocked — `Get-Command agent-browser` retornou `NOT_INSTALLED`; o Playwright oficial cobriu os fluxos públicos previstos
  - migração histórica v0.25-v0.56: accepted-risk — o inventário de produção não contém o bloco removido

BROWSER EVIDENCE
-------------------------------------------------
Dev server: `bun run dev --host 127.0.0.1 --port 5195 --strictPort`, confirmado em `http://127.0.0.1:5195` pelo webServer do Playwright
Flows tested: 42
Flow details:
  - 31 cartões Jogo 2D: `/` -> `/editor/<project>` | Verdict: PASS
    Evidence: cada spec confirmou `srcdoc`, pixels/conteúdo real no iframe, controle previsto e ausência de warning/error
  - 3 exemplos em DPR 1, 2 e 3 (9 casos): `/` -> `/editor/<project>` | Verdict: PASS
    Evidence: dimensões lógicas e backing store conferidos pelo spec
  - Herói que anda em layout estreito: `/` -> `/editor/<project>` | Verdict: PASS
    Evidence: primeiro frame em 390x844
  - Nave contra Asteroides com tremor: `/` -> `/editor/<project>` | Verdict: PASS
    Evidence: transform aplicado; overflow hidden; barras, scrollX e scrollY iguais a zero
Viewports tested: Desktop Chrome padrão; DPR 1/2/3; 390x844
Authentication: not required
Blocked flows: sessão exploratória com screenshots via agent-browser indisponível; nenhum fluxo Playwright bloqueado

TEST CASE COVERAGE
----------------------------------------------------------
Test cases found: 0
Executed: 0
Results: none
Not executed: none

ISSUES FILED
-------------
Total: 5
Status: 0 open; 2 fixed; 2 accepted risks; 1 accepted product decision
By severity:
  - Critical: 1
  - High: 2
  - Medium: 2
  - Low: 0
Details:
  - BUG-001: remoção de bloco legado descarta workspace | Severity: Critical | Priority: P0 | Status: Accepted risk
  - BUG-002: física de blocos publicados muda sem migração | Severity: High | Priority: P1 | Status: Accepted risk
  - BUG-003: snapshot dos exemplos quebrou a suíte global | Severity: High | Priority: P1 | Status: Fixed during review
  - BUG-004: colisão máxima custa cerca de 100 ms | Severity: Medium | Priority: P2 | Status: Fixed in 0.57.1
  - BUG-005: 179 blocos 2D liberados de uma vez no tier 3D | Severity: Medium | Priority: P2 | Status: Accepted product decision
