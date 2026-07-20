VERIFICATION REPORT
-------------------
Claim: A categoria Programação foi auditada de ponta a ponta sem alterar código de produção; o estado final do worktree foi verificado novamente após mudanças concorrentes.
Command: `cd packages/studio && bun run check`; `bun run typecheck`; `bun run --bun vite build --config playground/vite.config.ts`; `bun test src`
Executed: 2026-07-19; snapshot dos gates finais às 21:31 BRT. O worktree continuou recebendo alterações externas depois desse horário, portanto os números de integração são evidência daquele snapshot, não uma promessa sobre edições concorrentes posteriores.
Exit code: check 1; typecheck 1; build 0; unit tests 1; E2E Invasores 1 no run final.
Output summary: snapshot inicial: check em 637 arquivos, typecheck aprovado, build aprovado e 4.124 testes aprovados/0 falhas. Estado final após mudanças concorrentes: check em 638 arquivos com 16 erros e 1 warning; typecheck com 3 erros; build aprovado; 4.018 testes aprovados, 59 falhas e 2 erros em 282 arquivos.
Warnings: Vite sinalizou chunks maiores que 500 kB; maior chunk de aplicação com 5.389,37 kB (gzip 1.360,78 kB). O aviso é global e não foi atribuído especificamente à categoria Programação.
Errors: Formatter/import order em arquivos centrais/extensões; 3 incompatibilidades de `BlockPlacement` em `blockContracts.ts`; 59 falhas e 2 erros unitários após a nova validação de lifecycle; a galeria não renderiza porque manifests oficiais falham no Zod. Além disso, falhas funcionais da categoria estão documentadas em BUG-001 a BUG-011.
Verdict: FAIL — dois defeitos críticos de Programação e gates finais de check, tipagem, testes e E2E vermelhos.

AUTOMATED COVERAGE
------------------
Support detected: yes
Harness: Playwright + Bun test
Canonical command: `bunx playwright test`
Required flows:
  - Inicialização da IDE e categorias da toolbox: existing-e2e
  - Expansão da categoria Programação: existing-e2e
  - Troca imediata código/blocos pela Ponte: existing-e2e
  - Pesquisa e abertura de bloco legado oculto: existing-e2e
  - Reabertura de bloco simples: existing-e2e
  - Reabertura integral de projeto com parâmetros: needs-e2e
  - Bloqueio de script dinâmico não instrumentado: needs-e2e
  - Exatidão de allowBlocks para todo tipo ofertável: needs-e2e
Specs added or updated:
  - none: revisão sem correções; lacunas registradas para remediação.
Commands executed:
  - `bun run check` | Exit code: 1 | Estado final: 16 erros de formatação/organização de imports e 1 warning de imports não usados.
  - `bun run typecheck` | Exit code: 1 | Estado final: 3 erros TS2322 em constantes de `BlockPlacement`.
  - `bun run --bun vite build --config playground/vite.config.ts` | Exit code: 0 | Build concluído; aviso de chunks grandes.
  - `bun test src` | Exit code: 1 | Estado final: 4.018 aprovados, 59 falharam, 2 erros, 25.446 asserts em 282 arquivos.
  - `bunx playwright test e2e/smoke.spec.ts e2e/behavior-lifecycle.spec.ts e2e/reopen-blocks.spec.ts --grep "IDE carrega|toolbox:|Código digitado|a pesquisa|núcleo:"` | Exit code: 0 | 5 testes aprovados.
  - `bunx playwright test e2e/core-example-invaders.spec.ts` | Primeiro run: exit 0 com warning de restauração de `sz_val_arg`, um falso positivo. Run final após mudanças concorrentes: exit 1 por timeout; a galeria não renderizou devido a `ZodError` em manifests oficiais.
Manual-only or blocked:
  - Inspeção visual exploratória via navegador conectado: bloqueada porque nenhuma instância do navegador do aplicativo estava disponível.
  - Validação visual responsiva e acessibilidade por viewport: não executada; o escopo funcional foi exercitado pelo Chromium do Playwright.

BROWSER EVIDENCE (when Web UI flows were tested)
-------------------------------------------------
Dev server: `bun run dev --host 127.0.0.1 --port 5195 --strictPort`, gerenciado pelo Playwright em `http://127.0.0.1:5195`.
Flows tested: 6
Flow details:
  - Inicialização/categorias: `/` -> `/` | Verdict: PASS
    Evidence: `e2e/smoke.spec.ts`, execução Chromium.
  - Expansão da toolbox: `/` -> `/` | Verdict: PASS
    Evidence: `e2e/smoke.spec.ts`, execução Chromium.
  - Ponte código/blocos: `/` -> `/` | Verdict: PASS
    Evidence: `e2e/behavior-lifecycle.spec.ts`, execução Chromium.
  - Pesquisa de legado oculto: `/` -> `/` | Verdict: PASS
    Evidence: `e2e/reopen-blocks.spec.ts`, execução Chromium.
  - Reabertura de bloco simples: `/` -> `/` | Verdict: PASS
    Evidence: `e2e/reopen-blocks.spec.ts`, execução Chromium.
  - Exemplo Invasores: `/` -> `/` | Verdict: FAIL
    Evidence: antes da regressão concorrente, o assert passou, mas stderr registrou `The block "sz_val_arg" ... could not connect`; reprodução isolada carregou somente 15 de aproximadamente 481 nós. No run final, a galeria nem renderizou por falha de validação dos manifests.
Viewports tested: Desktop Chrome padrão do Playwright
Authentication: not required
Blocked flows: inspeção manual pelo navegador conectado, porque `agent.browsers.list()` retornou lista vazia.

CURRENT WORKTREE GATE REGRESSIONS
---------------------------------
Essas regressões surgiram depois do baseline inicial verde, enquanto arquivos de produção eram alterados concorrentemente; a revisão preservou as mudanças e não aplicou correções.
  - Check: 16 erros de formatter/import order e 1 warning, incluindo `blockContracts.ts`, extensões oficiais e `parsers/js.ts`.
  - Typecheck: 3 TS2322 errors because frozen placement objects widen `root`/`nested` to `string[]` instead of `BehaviorArea[]`/`StatementContext[]`.
  - Unit tests: 59 falhas e 2 erros; a validação nova de lifecycle invalida manifests e se propaga por contratos, migração, UI, export, preview e exemplos.
  - E2E: a galeria falha ao iniciar com `ZodError`; vários statements `gk:*` usados em eventos são agora rejeitados como exclusivos de “Ao iniciar”.
  - Build: PASS.

TEST CASE COVERAGE (when qa-report artifacts exist)
----------------------------------------------------------
Test cases found: 0
Executed: 0
Results: none
Not executed: não havia artefatos TC-*.md preexistentes para esta revisão.

ISSUES FILED
-------------
Total: 11
By severity:
  - Critical: 2
  - High: 3
  - Medium: 4
  - Low: 2
Details:
  - BUG-001: Restauração com parâmetros perde blocos | Severity: Critical | Priority: P0 | Status: Open
  - BUG-002: Script dinâmico contorna guard de loops | Severity: Critical | Priority: P0 | Status: Open
  - BUG-003: Eventos e this têm contratos divergentes | Severity: High | Priority: P1 | Status: Open
  - BUG-004: Fetch JSON aceita erro HTTP como sucesso | Severity: High | Priority: P1 | Status: Open
  - BUG-005: allowBlocks produz categorias fantasma/duplicadas | Severity: High | Priority: P1 | Status: Open
  - BUG-006: Filter omite variável local no picker | Severity: Medium | Priority: P2 | Status: Open
  - BUG-007: Laços reavaliam limites e falham ao decrescer | Severity: Medium | Priority: P2 | Status: Open
  - BUG-008: Shuffle é enviesado e mutável | Severity: Medium | Priority: P2 | Status: Open
  - BUG-009: Consumidores aceitam nomes livres | Severity: Medium | Priority: P2 | Status: Open
  - BUG-010: Níveis e copy escondem dependências | Severity: Low | Priority: P3 | Status: Open
  - BUG-011: Pipeline monolítico sem contrato exaustivo | Severity: Low | Priority: P3 | Status: Open
