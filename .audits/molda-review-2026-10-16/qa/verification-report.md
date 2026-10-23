# Verificação do Molda — 16/10/2026

**Claim:** As alterações do Molda passaram nas verificações do pacote e em todos os 41 cenários Chromium, após corrigir os achados desta revisão.

**Command:** comandos na tabela abaixo, executados em `packages/molda`.

**Executed:** 16/10/2026, conclusão dos comandos registrada em UTC.

**Exit code:** 0 nas verificações finais.

**Output summary:** 3.243 testes do pacote; 41 E2E; cinco repetições do teste de memória; tipos, lint e build aprovados.

**Warnings:** avisos de conflito entre `NO_COLOR` e `FORCE_COLOR` no Node. PowerShell imprime `NativeCommandError` ao redirecionar stderr mesmo em comandos com saída 0; os resultados abaixo usam o código de saída e o resumo efetivo. Uma tentativa de iniciar o servidor pelo Playwright atingiu timeout; a execução final usou o servidor compilado pelo script do repositório, com disponibilidade confirmada.

**Errors:** nenhuma nas verificações finais. Falhas intermediárias e a comparação com HEAD estão descritas abaixo.

**Verdict:** PASS para o escopo verificado do Molda. Não certifica o restante do workspace nem resolve o incidente anterior de formatação dos 29 arquivos externos.

## Comandos finais e evidências

| Comando | Conclusão UTC | Saída | Resultado |
|---|---|---|---|
| `bun run test:1` | 23:14:50 | 0 | 1.094 testes, zero falhas |
| `bun run test:2` | 23:16:47 | 0 | 1.061 testes, zero falhas |
| `bun run test:3` | 23:15:48 | 0 | 1.088 testes, zero falhas |
| `bun run check` | 23:26:57 | 0 | 1.395 arquivos, sem correções |
| `bun run typecheck` | 23:31 | 0 | TypeScript sem erros |
| `bunx vite build --config playground/vite.config.ts --outDir ../.cache/review-build` | 23:31:20 | 0 | Build concluído em 662 ms |
| `bunx playwright test --project=chromium` | 23:29:57 | 0 | 41 cenários, zero falhas, 3,2 minutos |
| `bunx playwright test --project=chromium scene-workshop.spec.ts --grep 'vinte aberturas' --repeat-each=5 --output=.cache/review-memory-fixed-results` | 23:26:27 | 0 | Cinco execuções consecutivas aprovadas |
| `git diff --check -- packages/molda` | revisão final | 0 | Sem erros de whitespace |

E2E executado com `E2E_PORT=5199` e `PW_REUSE_SERVER=1`. Servidor iniciado por `bun run serve:e2e`, que compila e serve o playground em modo E2E.

Logs completos em `packages/molda/.cache/review-{test1,test2,test3,types,package-lint,build,final-chromium,memory-fixed}.log`. Inventário e grafo de dependências: `packages/molda/.cache/review-structure.json`.

## Automated Coverage

- Support detected: sim.
- Harness: Playwright.
- Canonical command: `bun run e2e`. Nesta revisão foi executado todo o projeto `chromium` com `bunx playwright test --project=chromium`.
- Faca → novas faces → extrusão → dois undo: existing-e2e, `knife.spec.ts`.
- Duplicação com deslocamento, conflito, cancelamento e manipulador real: existing-e2e, `component-operations.spec.ts`.
- Contorno normal e contorno misto com linha de construção: existing-e2e, `component-operations.spec.ts`.
- Exclusão de todas as faces, aviso e recuperação: existing-e2e, `component-operations.spec.ts`.
- Três cortes em volta com deslocamento e undo: existing-e2e, `component-operations.spec.ts`.
- Simetria salva, reabertura, seleção do lado gerado, extrusão, subdivisão e parar: existing-e2e, `component-operations.spec.ts`.
- Painel compacto, foco, navegação, temas e responsividade: existing-e2e, `component-panel.spec.ts` e `fidelity.spec.ts`.
- UV, pintura, animação, pivô, corte de volumes, exportação, recuperação e várias abas: existing-e2e, suítes anteriores completas do projeto Chromium.
- Revogação dinâmica de permissões: integração automatizada por provider do host em `SceneWorkshop.accessRevocation.test.tsx`; não existe controle público no playground para revogar famílias durante a sessão.

Specs novos: `component-operations.spec.ts`, `component-panel.spec.ts`, `knife.spec.ts`.

Specs atualizados: `fidelity.spec.ts`, `scene-authoring.spec.ts`, `workshop-journeys.spec.ts`, `scene-workshop.spec.ts`.

## Browser Evidence

- Dev server: `http://127.0.0.1:5199/`.
- Flows tested: 41 cenários automatizados, além da entrada manual automatizada por teclado de `-0.25` no campo de deslocamento da cópia.
- Authentication: playground local, sem autenticação.
- Viewports: 1440 × 900, 1024 × 600, 390 × 844 e demais tamanhos das suítes existentes, incluindo 683 × 384 e 512 × 300.
- Temas: padrão, rosa e escuro nas 15 composições de fidelidade; claro e escuro no painel de componentes.
- Evidências: `packages/molda/.cache/component-panel-{light,dark}.png`, `faces-{mirror,ring,duplicate,fill}.png`, `knife-preview.png`, `knife-extruded.png` e resultados em `.cache/playwright-results`.
- Entry URL: `/?nivel=god` para as novas operações; os fluxos anteriores também usam níveis básicos e intermediários. As edições permanecem no editor dessa URL e a saída retorna à galeria.
- Resultado: PASS em todos os cenários finais.
- Blocked flows: Firefox e WebKit não instalados. Não foram declarados aprovados.

## Falhas intermediárias e diagnóstico

1. Execução inicial: 33 de 39 cenários passaram. Falhas: teste de reabertura com corrida de salvamento; três referências visuais antigas; dois seletores de navegação desatualizados. Correções mantiveram as verificações funcionais e os limites existentes.
2. Uma execução ampliada apresentou uma falha intermitente no arraste de pivô; o cenário passou nas execuções completas anterior e final. Nenhuma asserção desse cenário foi enfraquecida.
3. A primeira execução de 41 cenários terminou com 40 aprovados e falha na contagem DOM do teste de memória. Repetição: duas falhas em três execuções.
4. Foi criado um checkout somente de leitura dos arquivos originais de HEAD via `git archive` dentro de `.cache`, compilado em porta separada. O mesmo teste falhou duas vezes em três execuções nessa versão, sem as alterações do Molda.
5. A medição esperava o título da galeria, que aparece antes da lista assíncrona. Esperar o cartão do projeto tornou comparáveis as amostras. Cinco repetições passaram, com 188 → 187 nós. Na execução completa final, 184 → 183 nós e crescimento do heap de aproximadamente 1,03 MiB entre as amostras dos ciclos 5 e 20, abaixo do limite original de 12 MiB. Todos os ciclos verificaram zero contextos WebGL ativos após sair.
6. As correções geométricas e de acesso têm reproduções anteriores à correção e testes posteriores. Os quatro achados funcionais estão nos arquivos `issues/BUG-001.md` a `BUG-004.md`.

## Issues Filed

- Total: quatro achados funcionais corrigidos; três Medium/P2 e um Low/P3.
- BUG-001: duplicação coincidente ou sem deslocamento efetivo — Fixed.
- BUG-002: orientação de contorno misto — Fixed.
- BUG-003: páginas avançadas após revogação — Fixed.
- BUG-004: recuperação da peça sem faces — Fixed.
- Pendência de escopo: os 29 arquivos externos formatados anteriormente estão documentados na [revisão completa](../../architectural-analysis-2026-10-16-molda.md). Não foram revertidos sem uma cópia confiável do estado anterior.

Não havia um plano prévio de casos `TC-*` específico desta revisão. O inventário, os cenários existentes e a spec local orientaram a execução.
