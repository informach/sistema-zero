# Layout adaptativo das experiências — implementação

**Goal:** reorganizar a experiência ao ganhar largura na aula, sem exigir ampliação ou perder estado.

**Architecture:** container query CSS no workspace existente; console com as mesmas regiões visual/ação no modo inline e ampliado. Uma árvore React, sem novo controlador ou observador de largura em JavaScript.

**Tech Stack:** CSS, React, react-resizable-panels 2.1.9, Playwright, Bun.

**Spec:** [design aprovado](../../plans/2026-09-23-experiencias-layout-adaptativo-design.md).

**Restrições:** preservar modo ampliado, a11y e estado; não alterar regras de avaliação, manifesto, narração, banco ou padrão/persistência da divisória. Aproveitar tokens e aparência existentes.

## 1. Testes de comportamento

- [ ] Em `packages/community-kids/e2e-scenes/fixtures/client.tsx`, acrescentar um modo com PanelGroup/PanelResizeHandle reais e os pisos de `resolveLessonSplit`.
- [ ] Em `packages/community-kids/e2e-scenes/scene-workspace.spec.ts`, testar estreito → largo → estreito por arrasto/teclado, seleção/progresso preservados, cena visível ao executar, expansão cobrindo a janela e palpite responsivo.
- [ ] Rodar `bun run --filter @sistemazero/community-kids e2e:scenes`; confirmar falha da expectativa de duas colunas inline antes da implementação.

## 2. Layout compartilhado

- [ ] Em `packages/member-shell/src/styles/scene.css`, definir `container: scene-workspace / inline-size` na seção do workspace.
- [ ] Usar `@container scene-workspace (min-width: 52rem)` com altura mínima de janela de 34rem. Compartilhar grid, divisória e rolagem das regiões entre inline/ampliado.
- [ ] Limitar altura inline pela janela; preservar o preenchimento da área útil ampliada e o ajuste pela proporção real dos palcos.
- [ ] Reexecutar a suíte e inspecionar capturas. Ajustar medidas somente com evidência de legibilidade ou acesso insuficiente.

## 3. Contrato, revisão e entrega

- [ ] Atualizar `docs/aulas-interativas/BRIEFING.md` e `packages/member-shell/CLAUDE.md` para distinguir adaptação automática e ampliação opcional.
- [ ] Rodar testes de member-shell, Kids e Community, typecheck dos três hosts e member-shell, Biome e `git diff --check`.
- [ ] Revisar o diff inteiro: estado, acessibilidade, containment/posição fixa, palpite, CSS nos três hosts, regressões em telas estreitas/baixas.
- [ ] Registrar evidências, commitar e integrar staging. Push/deploy apenas em staging conforme autorização vigente; verificar revisão implantada e saúde dos hosts.

## Revisão do plano

Escopo limitado ao layout e sua cobertura. Não há migração nem alteração de conteúdo. O risco principal é a interação entre contenção CSS, altura flexível e ampliação fixa; os testes de geometria e preservação de estado cobrem esse contrato.
