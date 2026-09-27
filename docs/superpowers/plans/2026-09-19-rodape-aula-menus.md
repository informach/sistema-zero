# Rodapé da Aula e Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar a ajuda dos controles e impedir que o rodapé fixo cubra os menus abertos nas aulas Kids e adulta.

**Architecture:** O formulário recebe espaçamento apenas no player imersivo. O rodapé usa os estados de visibilidade já expostos no DOM por `aria-hidden`, e a mesma largura declarada para cada painel, sem estado paralelo nem medições em JavaScript.

**Tech Stack:** React 19, Next.js 16, Tailwind 4, CSS, Bun Test.

**Spec:** `docs/plans/2026-09-19-rodape-aula-menus-design.md`

## Global Constraints

- Preservar o conteúdo, a ordem dos controles e os gates de conclusão da aula.
- Não alterar a prévia do Admin nem a gaveta de aulas no celular.
- Preservar as modificações simultâneas em `lesson-sections.tsx` e nos players.
- Não publicar em staging sem pedido específico neste lote.

---

### Task 1: Espaço da ajuda

**Files:** Modify `packages/member-shell/src/components/lesson-sections.tsx`; test `packages/community-kids/tests/lesson-sections.test.tsx`.

**Interfaces:** `immersive` já identifica o player real; `helpForm` já é renderizado antes de `.sz-lesson-nav-inner`.

- [ ] No teste imersivo existente, depois de abrir a ajuda, obter `container.querySelector('.sz-lesson-nav-immersive form')` e exigir `form?.classList.contains('mb-4') === true`. Em um caso não imersivo, abrir a ajuda e exigir que o formulário não tenha `mb-4`.
- [ ] Executar `bun test tests/lesson-sections.test.tsx` em `packages/community-kids` e confirmar a falha da nova expectativa.
- [ ] Trocar a classe do `<form>` por `cn('space-y-3 rounded-xl border border-border bg-card p-4', immersive && 'mb-4')`; não mover o formulário nem seus controles.
- [ ] Repetir o teste e revisar o diff desse componente.

### Task 2: Rodapé entre os painéis

**Files:** Modify `packages/community-kids/src/app/(app)/layout.tsx`, `packages/community-kids/src/components/kids/app-sidebar.tsx`, `packages/community-kids/src/components/kids/focus-mode.tsx`, `packages/community-kids/src/app/globals.css`, `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`, `packages/community/src/app/globals.css`, `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`; test `packages/community-kids/tests/focus-mode.test.tsx` e o contrato CSS existente de aula.

**Interfaces:** `aria-hidden` nas barras existentes informa abertura. A linha do shell Kids recebe `kids-shell-row`; a largura única do menu é `--kids-menu-width: 16.75rem`, e a da lista é `--lesson-outline-width: 18rem`.

- [ ] Adicionar ao contrato de fonte/CSS da aula as quatro expectativas: menu Kids aberto define `left: var(--kids-menu-width)` a partir de 768 px, lista Kids aberta define `right: calc(var(--lesson-outline-width) + 2rem)` a partir de 1024 px, lista adulta aberta define `right: calc(var(--lesson-outline-width) + 1.5rem)` a partir de 1024 px, e os três seletores deixam o celular com os insets padrão.
- [ ] Executar o teste dirigido para confirmar a falha.
- [ ] Dar à linha de layout Kids a classe `kids-shell-row` e a variável `--kids-menu-width: 16.75rem`; usar `w-(--kids-menu-width)` no menu real e no fallback (este também recebe `kids-menu`). Aplicar `left: var(--kids-menu-width)` sob `@media (min-width: 768px)` quando a linha contém `aside.kids-menu[aria-hidden='false']`.
- [ ] Definir `--lesson-outline-width: 18rem` no layout das aulas Kids e adulta, usar esta variável na largura desktop das listas e aplicar os dois recuos direitos aprovados sob `@media (min-width: 1024px)` apenas quando o `aside` correspondente tem `aria-hidden='false'`.
- [ ] Sincronizar a transição lateral com a do menu esquerdo e desligá-la em `prefers-reduced-motion: reduce`.
- [ ] Executar testes dirigidos, `typecheck` dos pacotes alterados e `biome ci` nos arquivos tocados. Revisar os estados: ambos fechados, só esquerdo, só direito e ambos abertos.

### Task 3: Revisão e entrega local

**Files:** Conferir os arquivos das Tasks 1 e 2 e o estado de Git; nenhum arquivo novo de produção.

- [ ] Conferir requisito por requisito contra a especificação e executar `git diff --check`.
- [ ] Rodar a suíte relevante completa e os builds Kids/adulto, conforme viável no ambiente.
- [ ] Registrar a limitação da inspeção visual autenticada e não misturar as mudanças de outra sessão no commit deste lote.
