# “Uma vez e sempre” Implementation Plan

**Status:** implementação e full review concluídos em 22/09/2026; a entrega em `staging` é
acompanhada pelo pipeline do repositório.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a primeira experiência do Dia 1 e a explicação de 800 × 480 sem introduzir conceitos falsos ou tarefas artificiais.

**Architecture:** O preset passa a declarar as fichas que comprovam cada meta, e o motor continua único para todos os cursos. O member-shell apresenta o mesmo estado por uma bancada de seleção e destino, com arrasto opcional, enquanto o manifesto e os roteiros espelham o comportamento real.

**Tech Stack:** TypeScript, React, Bun test, Biome, manifestos JSON e Markdown.

**Spec:** `docs/plans/2026-09-22-experiencia-uma-vez-sempre-design.md`

## Global Constraints

- A nave já existe no simulador; a experiência não ensina que criar também desenha.
- A cena usa “passo”, não “quadro”, antes da seção que apresenta o conceito de quadro.
- O cenário espacial não mostra chão nem cacto.
- O piloto não tem palpite nem pergunta final nesta experiência.
- O bloco de tela mantém 800 × 480, seus valores padrão; o vídeo ensina o significado sem redigitação.
- Alterações locais alheias ao lote não entram no commit.

---

### Task 1: Contrato e motor configuráveis

**Files:**
- Modify: `packages/core/src/learning/scene/presets.ts`
- Modify: `packages/core/src/learning/scene/once-vs-always.ts`
- Modify: `packages/core/src/learning/scene/actions.ts`
- Modify: `packages/core/src/learning/scene/engine.ts`
- Modify: `packages/core/src/learning/scene/catalog.ts`
- Modify: `packages/core/src/learning/scene/readout.ts`
- Test: `packages/core/src/learning/scene/once-vs-always.test.ts`
- Test: `packages/core/src/learning/scene/presets.test.ts`

**Interfaces:**
- Consumes: `OnceVsAlwaysPreset`, `SceneOnce` e ações `place-in-area` existentes.
- Produces: ficha `panel`, mapeamento declarativo de metas e rótulo de passo manual.

- [x] Escrever testes que esperem as duas fichas do piloto, as três metas configuradas e a nave já presente.
- [x] Rodar os testes e confirmar que falham com o preset atual.
- [x] Adicionar `panel` e o mapa de fichas por meta ao contrato, ao validador e ao motor.
- [x] Corrigir os blocos do validador `isSceneOnce` e cobrir áreas e números inválidos.
- [x] Trocar os textos de quadro por passo e retirar o relógio contínuo da apresentação desta cena.
- [x] Rodar os testes do core até passarem.

### Task 2: Palco e bancada coerentes

**Files:**
- Modify: `packages/member-shell/src/components/scene-once-vs-always.tsx`
- Modify: `packages/member-shell/src/components/scene-frame.tsx`
- Test: `packages/member-shell/tests/scene-once-vs-always.test.tsx`
- Test: `packages/member-shell/tests/scene-figures.test.tsx`

**Interfaces:**
- Consumes: preset com `panel`, estado `fires`, `cenarioTemChao` e `pisoDoMundo`.
- Produces: palco temático correto e fluxo selecionar ficha → escolher área.

- [x] Escrever testes para ausência de cacto/chão, presença de nave/asteroide/estrelas e painel aceso.
- [x] Escrever teste para uma única bancada acessível e para apenas o avanço manual no rodapé.
- [x] Rodar os testes e confirmar as falhas.
- [x] Declarar nave e asteroide no manifesto, respeitar o chão do cenário e derivar o painel de
  `fires.panel` sem inventar papéis dentro do palco.
- [x] Substituir a grade duplicada por seleção local da ficha e botões contextuais de destino.
- [x] Rodar os testes do member-shell até passarem.

### Task 3: Aula piloto e fontes pedagógicas

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md`
- Modify: `docs/aulas-interativas/cenas/CENAS-NOVAS.md`
- Modify: `docs/aulas-interativas/CATALOGO-CENAS.json`
- Test: `docs/aulas-interativas/qa/validar-manifestos.ts`

**Interfaces:**
- Consumes: preset `duas-caixas-nave` atualizado e padrão real 800 × 480 do Estúdio.
- Produces: manifesto importável e roteiro de gravação sem contradições.

- [x] Atualizar a experiência para painel + movimento, `semPerguntaFinal: true` e instrução com reinício.
- [x] Alinhar o vídeo conceitual às duas áreas e remover palpite/pergunta final das descrições.
- [x] Reescrever a seção 3 para conferir e explicar os padrões 800 × 480 sem redigitá-los.
- [x] Atualizar catálogo e documento de cenas com “passos” e o novo preset.
- [x] Rodar o validador de manifestos e os testes de deriva.

### Task 4: Full review e preparação da entrega

**Files:**
- Review: todos os arquivos modificados neste plano.

**Interfaces:**
- Consumes: os três lotes anteriores verdes.
- Produces: o lote verificado e delimitado, pronto para um único commit em `staging`.

- [x] Rodar testes focados, typechecks e Biome nos pacotes afetados.
- [x] Rodar a validação integral dos manifestos e conferir o JSON com parser real.
- [x] Fazer busca de deriva por textos e fichas aposentados no piloto.
- [x] Revisar o diff completo e o status para excluir alterações alheias.
- [x] Consolidar a revisão final para criar um único commit em `staging`.
