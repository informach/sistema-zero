# Aula Imersiva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o layout de aula aprovado nas comunidades Kids e adulta sem mudar o conteúdo das seções.

**Architecture:** `LessonSections` compartilha a estrutura de largura, cabeçalho acessível e rodapé entre os dois apps por meio de uma opção de player imersivo. Cada player fornece o botão de conclusão e seus estados; os temas locais vestem a estrutura compartilhada. O estado de menus fica nos respectivos shells e não altera conteúdo ou APIs da aula.

**Tech Stack:** React 19, Next.js 16, Tailwind 4, Bun test, TypeScript.

**Spec:** `docs/plans/2026-09-19-aula-imersiva-design.md`

## Global Constraints

- Manter intactos os blocos, textos, cenas, áudios, gates de conclusão e divisor de colunas.
- Usar tokens dos temas existentes; não inserir cores arbitrárias nem uma segunda paleta.
- Admin/ensaio, que usa `LessonSections` sem o modo imersivo, mantém o cabeçalho e o índice atuais.
- O deploy foi autorizado em seguida e é acompanhado após a revisão e o commit.

---

### Task 1: Estrutura comum da seção

**Files:** Modify `packages/member-shell/src/components/lesson-sections.tsx`; test `packages/community-kids/tests/lesson-sections.test.tsx`.

**Interfaces:** `immersive?: boolean` esconde só o chrome visual; `completionAction?: ReactNode` ocupa o avanço da última seção; `completionMessage?: ReactNode` mantém a explicação da trava. `onSectionChange` continua notificando a posição.

- [x] Adicionar teste que monta a seção com `immersive` e verifica cabeçalho acessível sem título/índice visíveis, nome da seção atual no rodapé e conclusão na última seção.
- [x] Rodar `bun test tests/lesson-sections.test.tsx` em `packages/community-kids` e confirmar falha por ausência das opções.
- [x] Implementar as opções, `data-layout` estável baseado em `podeDividir`, e rodapé fixo apenas no modo imersivo. Conservar o caminho padrão do admin.
- [x] Rodar o teste e revisar o diff.

### Task 2: Players e menus

**Files:** Modify `packages/community-kids/src/components/kids/focus-mode.tsx`, `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`, `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`, `packages/community-kids/src/components/kids/main-container.tsx`; test `packages/community-kids/tests/focus-mode.test.tsx`.

**Interfaces:** Kids mantém os dois `FocusModeToggle`; adulto oferece apenas o controle da lista de aulas. Ambos passam os estados de conclusão existentes a `completionAction` e `completionMessage`.

- [x] Testar que Kids inicia a aula com as duas barras escondidas em qualquer largura aplicável e que o controle reabre cada uma.
- [x] Rodar `bun test tests/focus-mode.test.tsx` e confirmar a falha da nova expectativa.
- [x] Aplicar estado inicial por visita, remover o cartão de conclusão/navegação entre aulas e ligar o rodapé compartilhado. No adulto, preservar `complete()` e o avanço após conclusão.
- [x] Rodar os testes de foco e revisar o diff.

### Task 3: Pele, responsividade e revisão

**Files:** Modify `packages/community-kids/src/app/globals.css`, `packages/community/src/app/globals.css`, e classes dos players conforme necessário; test `packages/community-kids/tests/lesson-sections.test.tsx`.

**Interfaces:** Classes `sz-lesson-immersive`, `sz-lesson-layout` e `sz-lesson-nav` são ganchos de layout. CSS local controla aparência, mantendo tokens próprios.

- [x] Aplicar topo sem cartão, largura 860 px em seção única, largura plena em duas colunas, rodapé contínuo e compensação da barra móvel Kids.
- [x] Rodar testes-alvo, `typecheck` dos três pacotes e `biome check` nos arquivos alterados.
- [x] Conferir os estados de largura móvel e desktop pelo CSS e executar `git diff --check`. Inspeção visual autenticada fica para a validação em staging.
- [x] Fazer review final requisito por requisito contra a especificação e registrar limitações da verificação.

### Task 4: Entrada nas ferramentas de criação

**Files:** Modify `packages/community-kids/src/components/kids/focus-mode.tsx`; test `packages/community-kids/tests/focus-mode.test.tsx`, `packages/community-kids/tests/host-chrome.test.tsx` e `packages/community-kids/tests/pensa-client.test.tsx`.

- [x] Testar a entrada recolhida em Pinta, Estúdio, Pensar, Molda e Estúdio Pro, o botão Mostrar/Esconder e o menu aberto na volta para Criar.
- [x] Confirmar a falha dos testes antes da implementação.
- [x] Centralizar o estado por visita no `FocusModeProvider`, sem persistência antiga, e passar os testes direcionados.
- [x] Repetir a suíte completa e verificar builds junto com as aulas.
