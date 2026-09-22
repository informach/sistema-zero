# Ligar a nave antes de avançar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a primeira experiência do Dia 1 apresentar “Ligar a nave” e manter o botão de avanço depois da configuração das ações.

**Architecture:** Manter o contrato interno estável (`panel`) para não migrar estados salvos nem ampliar o escopo, mas trocar toda a linguagem visível por “Ligar a nave” e representar o motor ativo no palco. No compositor da experiência, renderizar os comandos de execução depois da bancada apenas em `once-vs-always`; as outras cenas preservam a ordem atual.

**Tech Stack:** TypeScript, React, Bun Test, renderização estática React, Biome.

**Spec:** `docs/plans/2026-09-22-experiencia-uma-vez-sempre-design.md`

## Global Constraints

- A nave já existe no palco; ligar não pode significar criar nem desenhar.
- A instrução segue a ordem: ligar em `Ao iniciar`, mover em `Enquanto estiver rodando`, depois avançar cinco passos.
- `Avançar 1 passo` fica depois das áreas de configuração somente em `once-vs-always`.
- O identificador interno `panel` permanece inalterado por compatibilidade com estados persistidos e presets existentes.
- Nenhum controle de tempo contínuo ou velocidade volta para essa experiência.

---

### Task 1: Proteger a linguagem e a ordem com regressões

**Files:**
- Modify: `packages/core/src/learning/scene/presets.test.ts`
- Modify: `packages/core/src/learning/scene/once-vs-always.test.ts`
- Modify: `packages/member-shell/tests/scene-once-vs-always.test.tsx`
- Modify: `packages/member-shell/tests/scene-experience-layout.test.tsx`

**Interfaces:**
- Consumes: `ONCE_VS_ALWAYS_PRESETS`, `OnceVsAlwaysStage` e a composição de `scene-activity.tsx`.
- Produces: regressões que exigem a ficha `Ligar a nave`, o estado visível `Nave ligada` e o comando de avanço depois de `LessonSceneControls` para `once-vs-always`.

- [x] **Step 1: Atualizar as expectativas de linguagem**

  Nos testes do core, esperar exatamente:

  ```ts
  { id: 'panel', kind: 'panel', label: 'Ligar a nave' }
  ```

  No teste do palco, exigir `Nave ligada`, uma única ocorrência de `Ligar a nave` na bancada e ausência de `Painel aceso`.

- [x] **Step 2: Adicionar a regressão de ordem sem API de teste**

  Em `scene-experience-layout.test.tsx`, ler o fonte real e provar que o ramo especial de `once-vs-always` renderiza os botões da cena depois de `LessonSceneControls`, enquanto a composição geral continua contendo uma única expressão reutilizável para os botões.

- [x] **Step 3: Executar os testes e confirmar a falha correta**

  Run:

  ```powershell
  bun test packages/core/src/learning/scene/presets.test.ts packages/core/src/learning/scene/once-vs-always.test.ts packages/member-shell/tests/scene-once-vs-always.test.tsx packages/member-shell/tests/scene-experience-layout.test.tsx
  ```

  Expected: FAIL porque a produção ainda contém “Acender o painel”, “Painel aceso” e põe `botoesDaCena` antes da bancada.

### Task 2: Implementar a sequência aprovada e alinhar o conteúdo

**Files:**
- Modify: `packages/core/src/learning/scene/presets.ts`
- Modify: `packages/studio/src/arte/figuras/espaco.ts`
- Modify: `packages/member-shell/src/components/scene-figures.tsx`
- Modify: `packages/member-shell/src/components/scene-once-vs-always.tsx`
- Modify: `packages/member-shell/src/components/scene-activity.tsx`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.md`
- Modify: `docs/aulas-interativas/cenas/CENAS-NOVAS.md`
- Modify: `docs/superpowers/plans/2026-09-22-experiencia-uma-vez-sempre.md`
- Modify: `packages/member-shell/CLAUDE.md`

**Interfaces:**
- Consumes: `OnceCard` existente com `id` e `kind` iguais a `panel`; `botoesDaCena: ReactNode[]`; `LessonSceneControls`.
- Produces: linguagem infantil coerente e composição visual configuração → execução, sem alteração no estado serializado.

- [x] **Step 1: Trocar a linguagem mantendo o contrato**

  Alterar o rótulo do preset para `Ligar a nave`. No palco, derivar `naveLigada` de `state.once.fires.panel > 0`, usar a variante `desligada` da arte antes do primeiro disparo e mostrar `Nave ligada` com o motor ativo, sem sugerir criação da nave. A arte padrão da nave continua ligada para não mudar o jogo nem as demais cenas.

- [x] **Step 2: Mover o comando de execução para depois da bancada**

  Extrair a renderização compartilhada de `botoesDaCena` em uma constante React. Em `ConsolePrancha`, renderizá-la antes dos controles nas demais cenas e depois do bloco que contém `LessonSceneControls` quando `m === 'once-vs-always'`.

- [x] **Step 3: Reescrever a instrução e as referências pedagógicas**

  Usar no manifesto:

  ```text
  Ligue a nave em Ao iniciar. Mova a nave em Enquanto estiver rodando. Depois, avance cinco passos e compare os contadores. Para testar outro lugar, use Voltar ao começo primeiro.
  ```

  Substituir as referências contraditórias a “acender painel” nos documentos atuais e registrar no guia do shell que o passo vem depois da montagem nessa cena.

- [x] **Step 4: Executar as regressões afetadas**

  Run:

  ```powershell
  bun test packages/core/src/learning/scene/presets.test.ts packages/core/src/learning/scene/once-vs-always.test.ts packages/member-shell/tests/scene-once-vs-always.test.tsx packages/member-shell/tests/scene-experience-layout.test.tsx
  ```

  Expected: PASS.

- [x] **Step 5: Verificar formatação e tipos dos pacotes afetados**

  Run:

  ```powershell
  bun run --filter @sistemazero/core check
  bun run --filter @sistemazero/core typecheck
  bun run --filter @sistemazero/member-shell check
  bun run --filter @sistemazero/member-shell typecheck
  ```

  Expected: todos os comandos terminam com código 0.

### Task 3: Revisar todo o lote, integrar e publicar em staging

**Files:**
- Review: todos os caminhos retornados por `git status --short`
- Review: `.github/workflows/*`
- Commit: alterações pedagógicas e o trabalho autorizado da outra sessão

**Interfaces:**
- Consumes: scripts raiz do monorepo, workflow real de `staging` e mudanças do baú Rive.
- Produces: commits reproduzíveis em `staging`, branch remota atualizada e deploy confirmado pelo provedor do projeto.

- [x] **Step 1: Revisar o trabalho do baú antes de incluí-lo**

  Ler o design, o plano, os componentes e os testes do baú Rive; conferir as regras de `packages/community-kids/CLAUDE.md`; corrigir somente problemas concretos e executar as suítes direcionadas do baú e da trilha.

- [ ] **Step 2: Executar a verificação completa com evidência fresca**

  Run:

  ```powershell
  bun run ci
  bun run --filter '*' test
  bun run build:kids
  bun run build:community
  bun run build:admin
  ```

  Expected: checks, testes e builds terminam com código 0.

- [ ] **Step 3: Commitar tudo que o usuário autorizou**

  Conferir `git diff --check`, revisar `git diff --stat` e criar commits temáticos contendo todas as mudanças restantes, inclusive o trabalho da outra sessão. Confirmar `git status --short` vazio.

- [ ] **Step 4: Sincronizar e enviar `staging`**

  Executar `git fetch origin`, verificar divergência e integrar qualquer avanço remoto sem descartar mudanças locais. Depois executar `git push origin staging`.

- [ ] **Step 5: Acompanhar o workflow e o deploy reais**

  Identificar o run criado pelo push, acompanhá-lo até o fim e confirmar o job de deploy de staging. Se falhar, diagnosticar a causa, corrigir, repetir a verificação proporcional, commitar e enviar novamente.
