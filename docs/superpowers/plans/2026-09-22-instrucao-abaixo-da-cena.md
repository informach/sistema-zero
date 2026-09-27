# Instrução abaixo da cena — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer todas as experiências mostrarem a cena antes da instrução e manterem a instrução imediatamente junto dos controles.

**Architecture:** Reordenar o ramo de experimentação do `SceneActivity`, componente compartilhado por Community e Community Kids, sem criar variações por cena ou breakpoint. Preservar o ramo do palpite e os avisos imediatos dentro do palco; mover os retornos reflexivos para depois da prancha de controles.

**Tech Stack:** React 19, TypeScript, Bun Test, Biome.

**Spec:** `docs/plans/2026-09-22-instrucao-abaixo-da-cena-design.md`

## Global Constraints

- O palpite mantém a ordem contexto → cena parada → pergunta → alternativas e não mostra controles.
- A experiência usa HUD/nome → cena → instrução → pista solicitada → controles → retorno.
- A instrução e os controles devem manter essa ordem no DOM, sem reordenação por CSS.
- A mudança deve valer para Community e Community Kids por meio de `member-shell`.
- Avisos que respondem imediatamente a um gesto permanecem sobre a cena.
- Alterações locais alheias à tarefa não podem entrar nos commits.

---

### Task 1: Registrar e proteger a ordem das experiências

**Files:**
- Create: `packages/member-shell/tests/scene-experience-layout.test.tsx`
- Modify: `docs/aulas-interativas/BRIEFING.md`
- Modify: `docs/aulas-interativas/ESPEC-MANIFESTO.md`

**Interfaces:**
- Consumes: composição JSX existente de `SceneActivity` e a regra aprovada na especificação.
- Produces: teste estrutural que falha enquanto a instrução anteceder a cena e documentação canônica para novos roteiros.

- [ ] **Step 1: Escrever o teste estrutural que extrai o segundo `SceneConsole`**

```tsx
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ARQUIVO_DA_CENA = resolve(import.meta.dir, '../src/components/scene-activity.tsx')

describe('a experiência aproxima a instrução dos controles', () => {
  test('mostra HUD, cena, instrução, controles e retorno nessa ordem', () => {
    const fonte = readFileSync(ARQUIVO_DA_CENA, 'utf8')
    const inicioDoPalpite = fonte.indexOf('{previsaoPendente && palpite ? (')
    const fimDoPalpite = fonte.indexOf('</SceneConsole>', inicioDoPalpite)
    const inicioDaExperiencia = fonte.indexOf('<SceneConsole>', fimDoPalpite)
    const ramo = fonte.slice(
      inicioDaExperiencia,
      fonte.indexOf('</SceneConsole>', inicioDaExperiencia),
    )

    const hud = ramo.indexOf('{hudDaCena}')
    const cena = ramo.indexOf('<ConsoleMundo>')
    const instrucao = ramo.indexOf('<ConsoleFala>{blocoDaInstrucao}</ConsoleFala>')
    const controles = ramo.indexOf('{pranchaDaCena}')
    const palpiteAnterior = ramo.indexOf('{palpite &&')
    const conclusao = ramo.indexOf('{!revisita && conclusao &&')
    const situacao = ramo.indexOf('<LugarReservado')

    expect(hud).toBeGreaterThan(-1)
    expect(hud).toBeLessThan(cena)
    expect(cena).toBeLessThan(instrucao)
    expect(instrucao).toBeLessThan(controles)
    expect(controles).toBeLessThan(palpiteAnterior)
    expect(controles).toBeLessThan(conclusao)
    expect(controles).toBeLessThan(situacao)
  })
})
```

- [ ] **Step 2: Executar o teste e confirmar a falha pela ordem atual**

Run: `bun test packages/member-shell/tests/scene-experience-layout.test.tsx`

Expected: FAIL em `expect(cena).toBeLessThan(instrucao)`, porque a instrução ainda aparece antes de `ConsoleMundo`.

- [ ] **Step 3: Registrar a regra no briefing e na especificação do manifesto**

Adicionar depois da regra de palpite em `BRIEFING.md`:

```markdown
Na experimentação, o topo reúne HUD, nome e cena. Logo abaixo da cena, uma única fala curta do
Zappy apresenta a ação; a pista solicitada e os controles vêm em seguida. Palpite retomado,
conclusão e situação alcançada aparecem depois da área de ação. A ordem é a mesma no celular.
```

Adicionar depois do exemplo de bloco interativo em `ESPEC-MANIFESTO.md`:

```markdown
O player organiza toda experimentação nesta ordem: HUD e nome, cena, instrução curta do Zappy,
pista solicitada, controles e retorno. Portanto, `instructions` deve orientar a ação sem repetir
os controles nem o vídeo. A instrução fica abaixo da cena e imediatamente antes dos controles.
```

- [ ] **Step 4: Verificar a documentação e manter o teste vermelho**

Run: `bunx biome check packages/member-shell/tests/scene-experience-layout.test.tsx`

Expected: PASS no formato e lint; o teste funcional continua falhando apenas pela ordem ainda não implementada.

- [ ] **Step 5: Commit**

```bash
git add docs/aulas-interativas/BRIEFING.md docs/aulas-interativas/ESPEC-MANIFESTO.md packages/member-shell/tests/scene-experience-layout.test.tsx
git commit -m "test(learning): proteger ordem das experiencias"
```

### Task 2: Reordenar o console compartilhado

**Files:**
- Modify: `packages/member-shell/src/components/scene-activity.tsx:1189-1342`
- Test: `packages/member-shell/tests/scene-experience-layout.test.tsx`
- Test: `packages/member-shell/tests/scene-prediction-layout.test.tsx`

**Interfaces:**
- Consumes: `hudDaCena`, `blocoDaInstrucao`, `pranchaDaCena`, `ConsoleMundo`, `ConsoleFala` e os retornos existentes.
- Produces: a mesma API pública de `SceneActivity`, com nova ordem semântica interna; nenhuma cena individual precisa mudar.

- [ ] **Step 1: Colocar a cena imediatamente depois do HUD**

Mover o bloco completo de `ConsoleMundo`, inclusive `RelogioDaArteProvider` e `AvisosDaCena`, para depois de `{hudDaCena}`. Não alterar props, callbacks ou condições.

- [ ] **Step 2: Colocar instrução, pista e controles imediatamente depois da cena**

Manter este trecho contíguo:

```tsx
<ConsoleFala>{blocoDaInstrucao}</ConsoleFala>
{hintText && !conclusao && (/* caixa da pista existente */)}
{pranchaDaCena}
```

Não duplicar a instrução, não criar ordem responsiva e não mudar o comportamento da pista.

- [ ] **Step 3: Colocar os retornos depois da prancha**

Preservar os blocos existentes nesta ordem depois de `{pranchaDaCena}`:

```tsx
{palpite && !(revisita && !prediction) && (/* palpite congelado */)}
{!revisita && conclusao && (/* checkpoint */)}
<LugarReservado marca="situacao" ...>{/* situação atual */}</LugarReservado>
```

Atualizar os comentários que ainda descrevem a posição antiga. Não alterar a persistência, os critérios de conclusão ou o estado da cena.

- [ ] **Step 4: Executar as regressões de layout**

Run: `bun test packages/member-shell/tests/scene-experience-layout.test.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx`

Expected: PASS; o novo teste comprova a ordem da experiência e o teste anterior comprova que o palpite não mudou.

- [ ] **Step 5: Executar as verificações do pacote compartilhado**

Run: `bun run --filter @sistemazero/member-shell typecheck`

Expected: exit 0.

Run: `bun run --filter @sistemazero/member-shell test`

Expected: exit 0.

Run: `bun run --filter @sistemazero/member-shell check`

Expected: exit 0.

- [ ] **Step 6: Executar a regressão do consumidor infantil**

Run: `bun test packages/community-kids/tests/lesson-scene-design.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx packages/community-kids/tests/lesson-scene-moldura.test.tsx packages/community-kids/tests/lesson-voz-zappy.test.tsx`

Expected: exit 0, sem mudança no comportamento das cenas, da moldura ou da voz do Zappy.

- [ ] **Step 7: Revisar o diff e fazer o commit**

Run: `git diff --check`

Expected: sem erros.

Run: `git diff --name-only HEAD`

Expected: somente os arquivos desta tarefa desde o último commit.

```bash
git add packages/member-shell/src/components/scene-activity.tsx
git commit -m "fix(learning): aproximar instrucoes dos controles"
```

### Task 3: Fazer a verificação final do lote

**Files:**
- Verify: `docs/plans/2026-09-22-instrucao-abaixo-da-cena-design.md`
- Verify: `docs/superpowers/plans/2026-09-22-instrucao-abaixo-da-cena.md`
- Verify: todos os arquivos alterados nos Tasks 1 e 2.

**Interfaces:**
- Consumes: commits e evidências dos Tasks 1 e 2.
- Produces: confirmação reproduzível de que o lote respeita a regra pedagógica e não inclui trabalho alheio.

- [ ] **Step 1: Comparar implementação e especificação**

Confirmar no diff que a ordem é HUD → cena → instrução → pista → controles → retorno e que o ramo do palpite permanece contexto → cena parada → pergunta → alternativas.

- [ ] **Step 2: Rodar novamente os testes direcionados e as checagens do pacote**

Run: `bun test packages/member-shell/tests/scene-experience-layout.test.tsx packages/member-shell/tests/scene-prediction-layout.test.tsx`

Expected: PASS.

Run: `bun run --filter @sistemazero/member-shell typecheck && bun run --filter @sistemazero/member-shell check`

Expected: exit 0.

- [ ] **Step 3: Auditar o histórico e o estado do worktree**

Run: `git status --short --branch`

Expected: nenhum arquivo desta tarefa pendente; qualquer alteração alheia permanece preservada e identificada.

Run: `git log --oneline --decorate -5`

Expected: commits pequenos e específicos desta mudança no topo, sem reescrever o histórico existente.
