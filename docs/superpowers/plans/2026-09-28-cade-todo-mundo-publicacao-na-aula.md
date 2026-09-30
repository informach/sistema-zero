# Publicação na Aula 2: Implementation Plan

> **For agentic workers:** usar a skill executing-plans para executar este plano na sessão já autorizada.

**Goal:** ensinar a primeira publicação no fechamento da Aula 2 e terminar em Concluir aula.

**Architecture:** revisão editorial da seção existente, com um bloco rich_text de ajuda direta.
O gerador permanece a fonte do manifesto; projeto e conclusão mantêm os mesmos contratos.

**Tech Stack:** Markdown, JSON, TypeScript, Bun e validadores existentes.

**Spec:** docs/plans/2026-09-28-cade-todo-mundo-publicacao-na-aula-design.md

## Global Constraints

- Preservar identificadores, projetos, experiências e critérios de conclusão.
- Publicar é a tarefa esperada; não criar bloqueio técnico de conclusão.
- Terminar a fala em Concluir aula, sem anunciar o certificado.
- Manter descrição pronta e capa gerada; alternativas ficam na biblioteca.
- Não substituir mídia publicada por plannedVideo.

### Task 1: Alinhar a aula, a ajuda e as diretrizes

**Files:**
- Modificar `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.md` e `.roteiro.md`.
- Modificar `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` e regenerar o manifesto da Aula 2.
- Modificar `docs/como-fazer/como-fazer.json`, tutorial `plataforma-publicar-no-mural`.
- Modificar `docs/aulas-interativas/BRIEFING.md`, `ESPEC-ROTEIRO.md` e `docs/orientacao-cursos-jogos.md`.
- Registrar o complemento em `docs/aulas-interativas/REVISAO-LINGUAGEM-CADE-TODO-MUNDO-2026-09-27.md`.
- Ajustar as expectativas estruturais existentes em `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`.

**Interfaces:** mantém `conclusao`, `video-a2-fecho`, `workspaceKey: projeto` e conclusão pelo vídeo.
Acrescenta `ajuda-a2-publicar`, rich_text sem requisito de leitura, com link
`/como-fazer/plataforma-publicar-no-mural`.

- [x] Aplicar a fala aprovada com o gesto Fechar da confirmação, conferido no componente MuralCelebration.
- [x] Inserir a ajuda escrita, alinhar o tutorial e as diretrizes, atualizar as expectativas do teste existente.
- [x] Executar `bun docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` e revisar o diff gerado.
- [x] Executar `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo`.
- [x] Executar `python docs/aulas-interativas/validar-roteiros.py cade-todo-mundo`.
- [x] Executar `bun docs/como-fazer/validar.ts`.
- [x] Executar `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts`.
- [x] Conferir formatação, diff, preservação dos projetos e conclusão; registrar resultados.

A revisão é editorial e usa os validadores e testes existentes, sem criar testes de cópia de fala.
Regravação e ensaio com crianças permanecem etapas de produção posteriores.

## Resultado da conferência

- 18 testes aprovados, zero falhas.
- Três manifestos válidos, sem avisos de convenção; nove seções de roteiro correspondentes.
- 42 tutoriais válidos; permanecem as sugestões editoriais de acrescentar imagens ou vídeos.
- Biome conferiu os quatro arquivos TypeScript/JSON alterados sem correções; diff sem erros de espaço.
- Comparação com HEAD confirmou projetos, experiências, chaves existentes e critérios de
  conclusão preservados. Aula 1 e certificado não mudaram. A ajuda aponta para um tutorial
  existente. A narração termina em Concluir aula, inclui Fechar e não menciona certificado.
- Os comandos Bun de geração e validação imprimiram EPERM ao ler o diretório do usuário,
  com código de saída zero. Os arquivos gerados, resultados de validação e testes foram
  conferidos; a comparação estrutural independente em Python também passou.
- Somente fontes locais alteradas; mídia, conteúdo publicado e progresso não foram modificados.
