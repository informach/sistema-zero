---
status: resolved
file: packages/studio/e2e-python-editor/live-performance.spec.ts
line: 174
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Prova de stdout F1 exige um Console ainda não montado

## Review Comment

A confirmação F1 procura f1-ready 60.0 60.0 diretamente no DOM, sem preparar o painel Console pela interface. Em Classic/Ponte, useVisibleBottomTabs oculta Console por padrão; em Pro, o painel inicialmente seleciona Problemas e só monta Console quando active/visited. A execução pode produzir pixels corretos e emitir stdout para o store, mas essa saída ainda não existe no DOM. O teste falha no critério de completude antes de medir cached/edited, sem demonstrar uma falha do programa.

Evidência real arquivada `.cache/studio-python-l0/stdlib-live-f1-smoke-2/report.json`, analysis.json e artifacts/*/error-context.md: Chrome Classic, Edge Classic e Edge Pro falham em getByText(...).toHaveCount(1), recebido0. As três evidências contêm sample cold com cálculo de pixel concluído; não se infere sucesso de stdout apenas dos pixels. Leitura causal de bottomTabs.tsx (bridge não mostra Console) e ProBottomPanel.tsx (visited/active controla renderBottomPanel) confirma a precondição de UI ausente. Nenhum browser foi reexecutado pelo revisor.

Abrir o Console por controles reais antes do intervalo medido, ativando-o apenas se necessário; no Pro selecionar/montar a saída. Preservar o critério de stdout e o pixel azul final, sem substituir por um flag artificial de prontidão. Preparação do painel não deve entrar no tempo clique→bitmap. Qualificação de runtime frio deve também observar a prontidão real do parser antes da limpeza HTTP; duplicação de bytes observada ainda não tem causa exclusiva comprovada.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou a montagem condicional do Console e autorizou formalização antes do patch. Medium de harness/QA, não falha de execução CPython comprovada; smoke2 negativo permanece preservado. Aguarda fix e revalidação.


### Final independent revalidation

Resolved apenas precondição Console: actualmenu Mais opções/Console é ativado condicionalmente por aria-current e ProConsole montado condicionalmente por aria-expanded, com Limpar visível antes do intervalo. Smoke3 realChrome: Classic trêsfases com stdout e endpointazul passaram; Pro passougate de Console antes de falhar no contador secundário. DOM independente confirmou intenção de Console oculto no bridge (2/2), e runnerreal isolado exercitou novos gatesClassic/Pro. FreshStudioTSC68865 log l8-live-f1-typecheck-1 registra Exit code0, lido independentemente. Não se declara F1/performance aprovada, nem resolve GETtimeout/cache/rede.
