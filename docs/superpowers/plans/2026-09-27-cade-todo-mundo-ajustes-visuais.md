# Cadê Todo Mundo? — Visual Adjustments Implementation Plan

> **For agentic workers:** Execute inline using the executing-plans skill. Steps use checkbox syntax for tracking.

**Goal:** Atualizar as posições de pedras/raposa, padronizar o badge do caderno e corrigir a cobertura do jogo ampliado.

**Architecture:** Centralizar as posições naturais dos sprites na arte compartilhada; conservar o posicionamento explícito por base das cenas com composição própria. Reutilizar `sz-lesson-chip` no caderno. Separar o espaçamento do bloco e a seção fixa do jogador com um wrapper estável.

**Tech Stack:** TypeScript, React, Tailwind, Bun e Playwright.

**Spec:** `docs/plans/2026-09-27-cade-todo-mundo-ajustes-visuais-design.md`

## Global Constraints

- `pedras.y = 185` e `raposa.y = 190`; os demais sprites mantêm suas posições.
- Preservar partida, conclusão, teclado e iframe ao ampliar/recolher.
- Manter apenas jogo e controles, sem instruções adicionais dentro do jogo.
- Preservar as alterações de outros trabalhos no workspace.
- Não usar travessão na copy voltada ao aluno.

## Task 1: Fonte das posições e projetos derivados

- [x] Definir as seis posições Y naturais em `packages/studio/src/arte/jardim-assets.ts`; usar essas posições quando `jardimSpriteRect` não recebe `baseY`.
- [x] Remover o uso das duas bases globais dos geradores do projeto, manifesto e caderno, da cena de contagem e do barrel de arte; manter as bases explícitas da cena de toque.
- [x] Regenerar os manifestos das aulas e o caderno; verificar os projetos e alvos.

## Task 2: Badge e cobertura da viewport

- [x] Em `materials-book-preview.tsx`, usar `sz-lesson-chip` com `data-chip="book"`, ícone e rótulo Leia, seguido do título do material. Aplicar a família cyan em `community-kids/src/app/globals.css`.
- [x] Reproduzir a margem do jogo com a geometria real da viewport em `e2e-scenes/project-play.spec.ts`: antes da correção, o teste recebe altura 780 em uma viewport de 800 pixels.
- [x] Envolver a seção de `ProjectPlayActivityView` em um wrapper estável, retirando a seção fixa do alcance direto de `space-y-5`.
- [x] Verificar os testes focados, tipos, formatação e capturas em 1280 × 800, 390 × 844 e 844 × 390.

## Verificação

- 70 testes de projeto, manifesto, jogador, caderno, chips e divisão passaram.
- 47 testes de interação das experiências passaram.
- Cinco testes E2E passaram, incluindo a reprodução que antes deixava 20 pixels descobertos. A sobreposição agora coincide com a viewport em 1280 × 800, 390 × 844 e 844 × 390.
- Manifestos conferidos: pedras em y 185 e raposa em y 190 no jogo pronto e nos projetos iniciais das duas aulas. Nenhum travessão nos títulos/instruções/diálogos voltados ao aluno.
- Caderno regenerado e as quatro páginas renderizadas e inspecionadas; nenhum travessão no PDF.
- Typechecks de member-shell e community-kids e Biome dos 14 arquivos de código/manifestos alterados passaram.
