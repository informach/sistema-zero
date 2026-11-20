# Minimapa por teclado — execução

**Objetivo:** corrigir a navegação do painel existente sem modificar o visual.

**Arquitetura:** ações de navegação no `MapMinimapPanel`, usando o
`minimapViewRect` e `onJump` existentes. React/TypeScript, Bun, Playwright.

**Design:** `docs/plans/2026-11-20-pinta-minimapa-teclado-design.md`.
Executar com `executing-plans` diretamente, sem subagentes.

- [ ] Reproduzir ausência de setas e salto por ativação sem ponteiro em
  `packages/pinta/src/components/editor/mapToolsUi.test.tsx`.
- [ ] Corrigir `MapMinimapPanel.tsx`; acrescentar ajuda curta em `core/copy.ts`.
  Não duplicar cache/render/navegação nem mexer nas ferramentas do palco.
- [ ] Ensaiar o painel na oficina real em desktop, toque e CPU simulada,
  incluindo rolagem, janela visível, teclado e preservação das células.
- [ ] Executar os gates pertinentes, revisar, documentar e commitar.
- [ ] Integrar/push de staging preservando alterações concorrentes.
