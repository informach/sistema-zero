# Pontes narrativas da seção 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a navegação, a analogia da campainha e a atividade da seção 3 da Aula 1 formarem uma sequência falada contínua.

**Architecture:** O roteiro falado é a referência da gravação; `gerar-cade-todo-mundo.ts` é a fonte do resumo `plannedVideo` no manifesto. Alterar esses dois textos e sincronizar apenas o `plannedVideo` do manifesto gerado, sem mudar blocos, critérios de conclusão ou a experiência.

**Tech Stack:** Markdown, TypeScript, manifesto JSON v5, Bun.

**Spec:** `docs/plans/2026-09-26-cade-todo-mundo-secao-3-pontes-design.md`

## Global Constraints

- Preservar um vídeo conceitual e uma experiência na seção, ambos necessários para concluí-la.
- Não executar o teste ou revelar seu resultado no vídeo.
- Manter uma única fala curta do Zappy fora da experiência.
- Preservar alterações paralelas no repositório; não alterar a primeira seção nesta entrega.

---

### Task 1: Encadear a seção 3

**Files:**
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md`
- Modify: `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json`
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`

**Interfaces:** A chave do vídeo continua `video-a1-toque`; o texto `plannedVideo` no gerador e no manifesto deve ser idêntico. Nenhum campo estrutural muda.

- [x] **Step 1: Ler as versões atuais e separar alterações paralelas.** Conferir `git diff` dos três arquivos, sobretudo mudanças não relacionadas à seção 3.
- [x] **Step 2: Escrever a fala conectada.** Começar com a volta ao caderno pelo botão Anterior; conectar a futura montagem do jogo à analogia da campainha; após a pergunta sobre o jardim, inserir “É isso que você vai investigar na atividade desta seção” antes da explicação do layout. Ajustar indicações de tela para seguir essa ordem.
- [x] **Step 3: Sincronizar a orientação de gravação.** Em `video('video-a1-toque', ...)`, descrever a sequência `caderno/Anterior → missão no jardim → campainha → acontecimento e ação → convite à atividade → layout`. Replicar somente essa string no manifesto, sem regerar todos os projetos/arquivos do curso.
- [x] **Step 4: Verificar.** Rodar `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo` e `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`. Ler a seção 3 em voz alta para conferir as duas transições, a duração e que o resultado permanece na experiência. Rodar `git diff --check`.
- [x] **Step 5: Registrar.** Fazer commit apenas das alterações da seção 3, com staging parcial se qualquer arquivo também tiver alterações paralelas.
