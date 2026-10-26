# Revisão completa do Molda: pintura, transparência, animação e farol

**Escopo:** alterações do Molda desta conversa, capturas de referência correspondentes e arquivo do farol. As alterações pendentes no Studio e na jornada ficaram fora desta revisão, conforme escolha do responsável.

## Resultado

| Campo | Evidência |
| --- | --- |
| Claim | Os fluxos alterados de pintura e animação estão funcionais; quatro defeitos encontrados na revisão foram corrigidos. |
| Command | `bun run check`; `bun run typecheck`; `bun run test`; `bunx vite build --config playground/vite.config.ts`; `bun run e2e`; `bun test tests/copy-vocabulario.test.ts` no `community-kids`. |
| Executed timestamp | 2026-10-24, 19:30–20:31 BRT; E2E final encerrado às 20:30 BRT. |
| Exit code | Check 0; typecheck 0; testes 0; build 0; vocabulário 0; E2E final 0. |
| Output summary | 1.520 arquivos verificados pelo Biome; 3.555 testes de unidade aprovados (1.105 + 1.298 + 1.152); build do playground concluído; 7 testes de vocabulário aprovados; 218 testes E2E aprovados e 12 pulados conforme a configuração. |
| Warnings | Vite externaliza `node:module` usado por `manifold-3d` e avisa sobre chunk acima de 500 kB; Playwright informa conflito não bloqueante entre `NO_COLOR` e `FORCE_COLOR`. |
| Errors | Nenhum no estado final. A primeira execução E2E teve 10 falhas: 3 capturas antigas de pintura, 2 comparações de transformações após recarregar, 4 comparações com animação anterior à importação e 1 timeout inicial. A segunda teve 3 capturas antigas do pivô. Todas foram analisadas; as referências e expectativas foram corrigidas. |
| Verdict | **PASS** — gates finais concluídos com exit code 0. |

## Achados corrigidos

- [BUG-001](issues/BUG-001.md): **Textura e camadas** sumia para quem tinha acesso avançado.
- [BUG-002](issues/BUG-002.md): transparência de um material ocultava os versos auxiliares de materiais opacos na mesma peça.
- [BUG-003](issues/BUG-003.md): **Marcar pose** ficava cortado no cabeçalho da timeline.
- [BUG-004](issues/BUG-004.md): o painel de pivô tinha 8 px de rolagem horizontal indevida.
- O contrato de inventário da aba Pintar foi atualizado com a entrada adicional, mantendo um limite explícito de 86 controles montados e 60 visíveis.
- O E2E de grupos agora verifica identidade, geometria e matrizes de mundo após recarregar, permitindo a representação equivalente `affine`/`trs`. O E2E de pivô usa como referência a animação efetivamente importada, após a migração `local-delta` → `local`.
- As capturas de referência foram atualizadas nos temas claro, rosa e escuro para **Pintar**, **Animar** e **Pivô**. Arquivos de tokens regravados automaticamente foram restaurados: seus valores só haviam mudado de grafia.

## Cobertura automatizada

**Support detected:** sim. **Harness:** Bun Test e Playwright. **Canonical E2E command:** `bun run e2e` em `packages/molda`.

| Fluxo necessário | Classificação | Evidência |
| --- | --- | --- |
| Criar/importar textura, pintar no modelo e abrir camadas com acesso avançado | existing-e2e | `e2e/paint-simple.spec.ts` |
| Gradiente RGBA, ajuda e base transparente sem azul | existing-e2e | `e2e/paint-simple.spec.ts`; `paintTransparentBase.test.ts`; `sceneRenderResource.test.ts` |
| Repetir, duração, Marcar pose e desfazer na timeline | existing-e2e | `e2e/scene-authoring.spec.ts`; `SceneAnimationAuthoring.test.tsx` |
| Separar linha em duas peças e desfazer | existing-e2e | `e2e/separate-line.spec.ts` |
| Pivô, grupos, projeto salvo e recarregado | existing-e2e | `e2e/pivot-visual.spec.ts`; `e2e/hierarchy-groups.spec.ts` |
| Farol importável e luz com volta completa | manual-only | Leitor `readSceneDocument` aprovou o JSON; comparação automática com o original encontrou diferenças apenas nos valores e na interpolação das cinco chaves de rotação. |

**Specs adicionadas/atualizadas:** `e2e/paint-simple.spec.ts`, `e2e/scene-authoring.spec.ts`, `e2e/pivot-visual.spec.ts`, `e2e/hierarchy-groups.spec.ts`, além dos testes de integração, domínio e renderização citados nos achados.

**Commands executed:**

- `bun run check` → 0; 1.520 arquivos, sem erros.
- `bun run typecheck` → 0.
- `bun run test` → 0; 3.555 aprovados, 0 falhas.
- `bunx vite build --config playground/vite.config.ts` → 0.
- `bun test tests/copy-vocabulario.test.ts` no `packages/community-kids` → 0; 7 aprovados.
- `bunx playwright test e2e/fidelity.spec.ts --project=chromium --update-snapshots` → 0; 3 temas aprovados.
- `bunx playwright test e2e/paint-simple.spec.ts --project=chromium --grep 'gradient shows both opacity controls'` → 0; base transparente, projeto exportado e desfazer verificados.
- `bun run e2e` → 0; 218 aprovados, 12 pulados, 0 falhas; Chromium, Firefox e WebKit.

**Manual-only ou bloqueado:** nenhum fluxo alterado bloqueado. A observação visual da volta do farol no aplicativo não foi automatizada; o arquivo nativo e as cinco chaves foram validados.

## Evidência no navegador

**Dev server:** `bun run serve:e2e`, `http://127.0.0.1:5198/`. **Authentication:** playground local, sem login. **Viewports:** desktop de 1440 px, 1280 px e celular de 390 px em testes dedicados. **Blocked flows:** nenhum.

| Fluxo | Entrada → saída | Evidência | Veredito |
| --- | --- | --- | --- |
| Gradiente e ajuda | `/` → `/` | [Gradiente e controles de opacidade](screenshots/gradiente-opacidade.png) | PASS |
| Base transparente | `/` → `/` | [Sem azul e sem verso vermelho](screenshots/base-transparente-sem-azul.png) | PASS |
| Timeline | `/` → `/` | [Cabeçalho de animação](screenshots/timeline-1440.png) | PASS |
| Fidelidade visual nos três temas | `/` → `/` | `docs/plans/references/2026-10-15-molda-fidelidade/implemented/` | PASS após atualizar capturas intencionais |

**Flows tested:** 4 conjuntos acima, além das jornadas automatizadas de importação, UV, malha, grupo, pivô, salvamento e exportação. **Issues filed:** 4 (High: 1, Medium: 2, Low: 1), todos corrigidos.

## Artefato do farol

[farol-luzes-giro-completo.molda.json](../assets/farol-luzes-giro-completo.molda.json) foi validado pelo leitor nativo. O movimento dura 1 segundo, repete e gira a luz em torno de Y com quaternions de 0°, 90°, 180°, 270° e 360°, usando interpolação linear. A última orientação equivale à primeira sem interromper a direção do giro.
