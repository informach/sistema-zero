# Governança pedagógica e piloto do Dia 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar as regras pedagógicas aprovadas a única orientação vigente e entregar o trio completo da aula-piloto no novo formato.

**Architecture:** O documento de design é a decisão-mãe. `BRIEFING`, especificações e documentação interna passam a apontar para a mesma gramática. O validador aplica as regras editoriais estritas apenas às aulas marcadas como migradas, começando por `desafio-dia-1`, para permitir a migração progressiva das outras 26 aulas regulares e a revisão própria do certificado.

**Tech Stack:** Markdown, JSON manifesto v5, TypeScript/Bun para validação.

**Spec:** `docs/plans/2026-09-21-redesenho-didatico-aulas-interativas-design.md`.

## Global Constraints

- Proposta, manifesto e roteiro da aula-piloto mudam juntos.
- No máximo um vídeo e uma fala do Zappy por seção.
- Conceito: vídeo + fala-ponte + experiência; conclusão exige vídeo e experiência.
- Construção: vídeo + fala-resumo/tarefa + ferramenta; conclusão exige vídeo e validação da ferramenta.
- Quiz: seção exclusiva com uma fala introdutória e o quiz, antes do teste/envio final.
- Não ampliar automaticamente essas regras para manifestos ainda não migrados.

---

## Task 1: Corrigir a governança contraditória

**Files:**

- Modify: `docs/aulas-interativas/BRIEFING.md`
- Modify: `docs/aulas-interativas/ESPEC-MANIFESTO.md`
- Modify: `docs/aulas-interativas/ESPEC-ROTEIRO.md`
- Modify: `docs/aulas-interativas/README.md`
- Modify: `docs/orientacao-cursos-jogos.md`
- Modify: `packages/admin/CLAUDE.md`
- Modify: `packages/member-shell/CLAUDE.md`
- Modify: `packages/core/CLAUDE.md`

- [x] Declarar o design de 21/09/2026 como vigente e os 27 manifestos anteriores como fila de migração.
- [x] Remover a proibição absoluta de “agora é sua vez”; permitir apenas a ponte guiada após demonstração.
- [x] Registrar vídeo não bloqueante, conclusão conjunta, um vídeo por seção, Zappy no máximo uma vez e quiz dedicado.
- [x] Registrar palpite seletivo, sem controles e sem veredito.
- [x] Corrigir qualquer documentação interna que diga que toda cena herda palpite ou que controles ficam visíveis.

---

## Task 2: Codificar a régua editorial progressiva

**Files:**

- Modify: `docs/aulas-interativas/qa/validar-manifestos.ts`
- Create: `docs/aulas-interativas/qa/novo-modelo.ts`

- [x] Criar um registro explícito das aulas migradas, inicialmente `desafio-dia-1.manifesto.json`.
- [x] Para essas aulas, reprovar seção com mais de um vídeo ou mais de um diálogo.
- [x] Reprovar quiz misturado com qualquer coisa além de uma fala introdutória.
- [x] Reprovar seção de conceito cuja conclusão não cobre o vídeo e a experiência.
- [x] Reprovar seção com palpite implícito não declarado e falas que ultrapassem seu papel estrutural quando detectável.
- [x] Rodar o validador completo sem transformar os outros 27 manifestos ainda não migrados em falhas novas.

---

## Task 3: Reescrever o trio da aula-piloto

**Files:**

- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md`

- [x] Consolidar a aula em vitórias de 3–5 minutos, sem microseções de um encaixe.
- [x] Manter somente palpites que satisfazem os seis critérios do design.
- [x] Inserir uma única fala-ponte abaixo de cada vídeo conceitual e uma única fala-tarefa abaixo de cada vídeo prático.
- [x] Criar seção exclusiva de quiz com 1–3 perguntas não duplicadas.
- [x] Colocar teste, envio e celebração depois do quiz.
- [x] Fazer cada seção conceitual/prática concluir vídeo e atividade/ferramenta.
- [x] Atualizar o roteiro para exatamente um trecho por vídeo do manifesto e estimar a aula completa em 15–25 minutos.

---

## Task 4: Verificar paridade e qualidade

**Files:**

- Verify: all files above

- [x] Rodar `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-1`.
- [x] Rodar o validador de roteiros e as verificações de paridade existentes.
- [x] Contar seções, vídeos, falas, quizzes e critérios do piloto por script.
- [x] Revisar linguagem infantil, repetição, ritmo, caminhos de ferramenta e continuidade com o Dia 2.
- [x] Executar testes/typechecks afetados e `git diff --check`.
