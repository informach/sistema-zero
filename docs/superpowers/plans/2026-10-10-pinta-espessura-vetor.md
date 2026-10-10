# Espessura do Pinta — Implementation Plan

> **For agentic workers:** Use executing-plans para executar neste trabalho já autorizado, sem delegação.

**Goal:** Remover os botões de espessura do vetor e oferecer o ajuste de 0,5 a 10 em Aparência, com padrão 1.

**Architecture:** Usar o estado de estilo e o histórico existentes. Trocar o range indexado por valores reais e centralizar o valor inicial em `DEFAULT_STROKE_WIDTH`.

**Tech Stack:** React, TypeScript, Bun, Testing Library.

**Spec:** `docs/plans/2026-10-10-pinta-espessura-vetor-design.md`.

## Global Constraints

- Range 0,5–10, passo 0,5, padrão 1.
- Preservar os arquivos existentes e o editor de pixels.
- Validar edição, desfazer/refazer e escolha mantida entre ferramentas.

## Task 1: Controle e padrão vetorial

Arquivos: `packages/pinta/src/vector/shapes.ts`, `src/components/editor/vector/VectorEditorScope.tsx`, `VectorToolbox.tsx`, `vectorTools.ts`, `vectorTools.test.ts`, `src/components/editor/VectorPropertiesPanel.tsx`, `vectorUi.test.tsx` e `packages/pinta/CLAUDE.md`.

- [x] Atualizar os testes existentes da interface: desenhar um retângulo e verificar `rect[stroke-width="1"]`; mudar o range para 0,5 e 10; desfazer/refazer; trocar de ferramenta e desenhar outra forma; selecionar arquivos com traços 8 e 64 sem alterações no histórico.
- [x] Executar esses testes antes da implementação e confirmar a falha esperada.
- [x] Exportar `DEFAULT_STROKE_WIDTH = 1` em `shapes.ts` e usar no estilo inicial, no fallback de linhas e ao restaurar contorno em `VectorEditorScope.tsx`.
- [x] Remover os presets das duas orientações de `VectorToolbox`, incluindo os helpers sem consumidores.
- [x] Em `VectorPropertiesPanel`, usar `min={0.5}`, `max={10}`, `step={0.5}`, `Number(event.target.value)` e rótulo com `formatStrokeWidth(style.stroke?.width ?? DEFAULT_STROKE_WIDTH)`. Limitar somente a posição do range, preservando o valor armazenado.
- [x] Atualizar a documentação local para descrever o único controle de espessura.
- [x] Executar `bun test src` e `bun run typecheck` em `packages/pinta`; verificar Biome nos arquivos alterados e a interface no navegador.
- [x] Revisar o diff e fazer commit.

Validação: 1.549 testes passaram, typecheck e Biome passaram. Chromium local conferiu range com teclado, rótulo e ausência dos presets nas duas orientações. Nenhum erro de página.

## Task 2: Entrega já autorizada

- [ ] Push de staging e CI com deploy explícito de `members,admin,community,community-kids`.
- [ ] Confirmar checks e deployments de staging com o SHA final.
- [ ] Atualizar e fazer merge da PR 197, verificar deploys de produção e sincronização de staging.
