# Manifestos autossuficientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar os 28 manifestos sem criar blocos de Estúdio, Pinta, materiais ou certificado previamente.

**Architecture:** O contrato recebe conteúdo completo e rejeita referências `existing`. O importador cria IDs estáveis ou preserva o único ID existente do mesmo tipo. Cada JSON contém configuração e snapshot inicial; anexos privados continuam vinculados pela autoria.

**Tech Stack:** Bun, TypeScript, Postgres, JSON de manifestos.

**Spec:** `docs/plans/2026-09-20-manifestos-autossuficientes-design.md`

## Global Constraints

- Não criar compatibilidade com `existing` nos manifestos ativos.
- Preservar o ID de bloco existente quando a correspondência por tipo for única.
- Não fabricar identificadores de anexos privados.

---

### Task 1: Contrato e importador

**Files:** `packages/core/src/learning/index.ts`, `packages/members/src/application/learning/learning-import.service.ts`, testes de importação em `packages/members/tests/integration/`.

**Interfaces:** `LearningManifest.blocks[].content` aceita `studio`, `pinta`, `materials`; `preview` cria ou atualiza mantendo o ID quando houver uma correspondência única.

- [ ] Alterar o validador e executar `bun test packages/core/tests/learning.test.ts`.
- [ ] Alterar o importador e executar os testes de integração de importação.
- [ ] Comprovar criação em aula vazia, reimportação idempotente e recusa de ambiguidade.

### Task 2: Conteúdo dos 28 manifestos

**Files:** `docs/aulas-interativas/aulas/*.manifesto.json`, `docs/aulas-interativas/ESPEC-MANIFESTO.md`.

**Interfaces:** `content.initialProject` usa o formato atual do Estúdio; `content.initialAsset` usa Pinta para editor ou `null` para entrega por galeria; `materials.items` contém apenas anexos reais.

- [ ] Gerar snapshots a partir do criador oficial de projeto e das configurações de aula.
- [ ] Substituir todos os `existing` por `content` completo e atualizar a especificação.
- [ ] Executar testes dos 27 manifestos e a importação com Postgres de teste.

### Task 3: Verificação final

**Files:** testes e documentação alterados nas tarefas anteriores.

- [ ] Rodar Biome e typecheck dos pacotes afetados.
- [ ] Conferir o diff, isolar alterações de outras sessões e publicar no branch `staging` após CI local.
