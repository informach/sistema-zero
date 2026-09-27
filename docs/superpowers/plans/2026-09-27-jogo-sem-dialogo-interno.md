# Jogo sem diálogo interno — Implementation Plan

> **For agentic workers:** Execute inline using the executing-plans skill. Steps use checkbox syntax for tracking.

**Goal:** Subir os controles e o palco dos jogos, com a ponte do Zap abaixo do vídeo e o jogo normal sem orientações adicionais.

**Architecture:** Condicionar a instrução do cabeçalho de `InteractiveLessonBlock` ao tipo da atividade. Acrescentar um diálogo ao manifesto gerado. Preservar o projeto demonstrativo, com a explicação de como jogar no vídeo.

**Tech Stack:** React, TypeScript, Bun, manifesto v5 e Jogo 2D.

**Spec:** `docs/plans/2026-09-27-jogo-sem-dialogo-interno-design.md`

## Global Constraints

- Preservar a conclusão por vídeo e três achados, os controles do jogador e o projeto inicial.
- Manter as instruções dos tipos HTML e experimentação.
- Trabalhar localmente, sem publicar conteúdo ou fazer deploy.

## Task 1: Apresentação compacta e conteúdo da abertura

- [x] Em `packages/member-shell/src/components/learning-activity.tsx`, renderizar o trecho de `content.instructions` somente quando `a.type !== 'project-play'`.
- [x] Em `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, inserir `dialogue('ponte-a1-jogo', 'Experimente o jogo pronto! Quando terminar, avance para a próxima seção.')` após `video-a1-abertura` e incluir sua chave em `blockKeys`, sem mudar `completion.blockIds`.
- [x] Preservar o jogo normal, sem orientação adicional no palco; os botões continuam sendo Jogar de novo e Ampliar jogo.
- [x] Regenerar os manifestos com `bun docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` e atualizar a direção e o roteiro da primeira seção.
- [x] Ajustar a expectativa existente de `blockKeys` em `cade-todo-mundo-manifestos.test.ts` para vídeo, ponte e jogo.
- [x] Rodar os testes existentes de manifesto, projeto, jogador, chip e divisão; checar tipos do member-shell e formatação dos arquivos alterados; conferir a interface e a partida real.

## Verificação

- 67 testes existentes passaram (manifesto, projeto, jogador, chip e divisão da seção).
- Quatro testes E2E passaram, com teclado, ponteiro, telas de 1280px e 390px, três achados, ampliar e reiniciar.
- Typecheck do member-shell e Biome nos arquivos alterados passaram.
- Capturas dos testes confirmam a ausência de orientação sobre o jogo e dentro do palco. A conexão interativa do Browser estava indisponível; a inspeção visual usou as capturas da suíte existente.
