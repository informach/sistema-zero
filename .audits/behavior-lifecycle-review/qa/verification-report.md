# Relatório de verificação — áreas de comportamento

> **Relatório histórico:** este arquivo registra o estado encontrado durante a
> auditoria. Os achados foram corrigidos posteriormente; consulte
> [`../fixes-report.md`](../fixes-report.md) para o resultado da implementação e
> a verificação atual.

**Executado em:** 2026-07-19, America/Sao_Paulo  
**Superfície:** `packages/studio`  
**Harness de navegador:** Playwright + Chromium  
**URL do servidor:** `http://127.0.0.1:5195`

## Claim

A revisão verifica se a nova divisão Ao iniciar/Eventos/Loops funciona no núcleo, em todas as extensões oficiais, na migração, nos exemplos, no runtime e na documentação.

## Resultado geral

**Verdict: FAIL.** O código compila, os testes unitários passam e todos os 97 cenários E2E foram observados passando ao menos uma vez, mas:

1. há defeitos funcionais reproduzidos fora da cobertura existente;
2. `check`, typecheck e suíte completa falham no worktree concorrente atual;
3. o comando E2E canônico não concluiu verde e dois cenários oscilaram sob carga.

## Evidência por comando

| Claim | Command | Exit code | Output summary | Warnings | Errors | Verdict |
|---|---|---:|---|---|---|---|
| Tipos válidos | `bun run typecheck` | 1 | 3 erros em testes concorrentes de SVG/NamePicker | Nenhum | TS2339, TS2345 e TS2769 | FAIL |
| Unidade/integração | `bun test src` | 1 | 3.957 pass; 15 fail; 30.485 expects; 271 files | Warnings esperados dos runtimes nos testes | 15 falhas novas em SVG/FieldNamePicker | FAIL |
| Estado concorrente do G3D Advanced | `bun test .../runtime.test.ts .../model.test.ts` | 0 | 66 pass; 0 fail; 610 expects | Warnings esperados dos guardas | Nenhum | PASS |
| Conjunto focal lifecycle/galeria | `bun test` com 10 arquivos focais | 1 | 116 pass; todos os 67 contratos passaram | Nenhum | 1 falha paralela sobre `innerHTML` | PASS no escopo / FAIL no comando |
| Build do playground | `bunx vite build --config playground/vite.config.ts` | 0 | 1.407 módulos | Chunks >500 kB e tempos de plugins | Nenhum | PASS |
| Formatação/lint | `bun run check` | 1 | 612 arquivos; 8 erros e 1 warning | Import não usado | Formatação/imports em alterações concorrentes | FAIL |
| E2E canônico | `bun run e2e` | 1 | 52 cenários aprovados antes da interrupção | Servidor Vite encerrou | `dev` saiu com 255 | FAIL |
| E2E arquivo grande | `bunx playwright test --shard=1/3` | 1 | 74 pass; 2 fail | Execução longa | Defesa da Torre não navegou; Vila do Dragão voltou ao menu | FAIL/FLAKY |
| Defesa da Torre isolada | `bunx playwright test e2e/examples-gallery.spec.ts --grep "game-3d-advanced:Defesa da Torre"` | 0 | 1 pass | Nenhum | Nenhum | PASS |
| Vila do Dragão isolada | `bunx playwright test e2e/examples-gallery.spec.ts --grep "Vila do Dragão — fluxo visual completo"` | 0 | 1 pass | Nenhum | Nenhum | PASS |
| Demais arquivos E2E | `bunx playwright test --shard=3/3` | 0 | 21 pass | Nenhum | Nenhum | PASS |
| E2E focal final | `bunx playwright test e2e/smoke.spec.ts e2e/examples-gallery.spec.ts --grep ...` | 0 | 9 pass | Nenhum | Nenhum | PASS |

## Automated Coverage

**Support detected:** sim, Playwright/Chromium em `packages/studio/e2e`.

### Existing E2E

- 67 cartões da galeria;
- Vila do Dragão completa;
- um layout estreito por família;
- criação de projeto vazio e presença das cinco áreas;
- reopen, Bridge, formatação, preview e smoke geral.

### Needs E2E

- criação e unicidade de cada área;
- conexão direta e aninhada recusada;
- `return`/`super`/`break`/`continue` fora de contexto;
- exclusão de área preservando filhos e undo;
- aviso/foco de rascunho;
- migração parcialmente framada;
- blocos de lifecycle antigos ausentes da paleta;
- custom event `eventHandler` aceito em Eventos;
- World Composer com a nova área;
- duas linhas, layout estreito e teclado nas áreas.

Nenhum spec foi adicionado porque a solicitação foi uma auditoria, sem autorização para alterar o produto ou sua suíte.

## Browser Evidence

- **Flows tested count:** 97 cenários observados durante a auditoria, mais um rerun focal final de 9 cenários.
- **Viewports:** desktop padrão do projeto e 390×844 nos seis representantes de família.
- **Authentication:** perfil de teste privilegiado fornecido pelo harness da galeria.
- **Screenshots:** não foram produzidas capturas manuais; o Playwright produziu contextos de erro durante a execução instável, substituídos pelos reruns isolados posteriores.
- **Blocked:** nenhum fluxo por credencial. O gate completo foi bloqueado por instabilidade do servidor/processo e não por dependência externa.

## Reproduções estruturais fora da suíte

| Cenário | Resultado observado | Cobertura atual |
|---|---|---|
| Evento dentro de `if` | Blockly conecta; V2 aceita | Ausente |
| Loop dentro de evento | Blockly conecta; V2 aceita | Ausente |
| Evento dentro de loop | Blockly conecta; V2 aceita | Ausente |
| `sz_js_on_event_named` em Eventos | Blockly conecta; V2 rejeita `eventHandler` | Ausente |
| `break`/`continue` em Ao iniciar | UI atual recusa; V2 direto ainda aceita e JS não compila | Schema ausente; UI coberta em teste novo |
| `super` em Ao iniciar | UI atual recusa; V2 direto ainda aceita e JS não compila | Schema ausente; UI coberta em teste novo |
| Projeto parcialmente framado | Statements antigos viram rascunho e param de executar | Ausente |
| Excluir área com filho | Filho é removido junto | Ausente |
| World Composer com Ao iniciar novo | Retorna `null`; não cria bloco | Ausente |

## Observações de estado

Arquivos de Game 3D Advanced, Programação, SVG, parser e semântica do Blockly foram modificados concorrentemente durante a auditoria. A revisão não alterou esses arquivos. O typecheck, a suíte e o build foram repetidos depois da estabilização dos arquivos diretamente ligados ao lifecycle; mudanças de SVG/parser continuaram chegando durante o E2E focal. O gate global deve ser repetido quando esse outro trabalho terminar. As falhas globais registradas pertencem a esse diff concorrente; os defeitos F-01 a F-10 foram reproduzidos separadamente.
