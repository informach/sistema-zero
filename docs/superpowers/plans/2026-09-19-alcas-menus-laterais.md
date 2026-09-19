# Alças dos Menus Laterais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer todos os controles de recolher painéis laterais da plataforma de alunos parecerem alças ligadas aos painéis, sem mudar conteúdo nem estado inicial.

**Architecture:** O componente `EdgePanelHandle` de `@sistemazero/ui` concentra botão, ícones, semântica e transição. No Kids, o `FocusModeProvider` continua como única fonte de estado e o layout `(app)` monta as alças; o `hostChrome.menu` das ferramentas embarcadas passa a `null`. No Adulto, o player mantém o estado local da lista de aulas e só troca seu botão pelo componente compartilhado.

**Tech Stack:** React 19, Next.js, Tailwind CSS 4, TypeScript, Bun test, Biome.

**Spec:** `docs/plans/2026-09-19-alcas-menus-laterais-design.md`

## Global Constraints

- Não mudar o conteúdo da aula, da ferramenta, do avatar nem do quarto.
- Preservar os estados iniciais e os limiares responsivos atuais: menu esquerdo Kids somente a partir de 768 px; lista de aulas também no celular.
- Cor esquerda: `--menu`/`--menu-texto`; cor direita: `--card`/`--foreground`. Não duplicar valores de paleta.
- Alça fixa na borda do painel aberto ou na borda da tela fechada; transição de 300 ms, desligada em `prefers-reduced-motion`.
- Preservar `aria-pressed`, rótulo de ação, `aria-controls`, foco por teclado e painéis fechados `inert`.
- Não misturar os arquivos ainda não comitados da outra sessão; integrar e revisar depois do CI/deploy de materiais.

## Mapa de arquivos

- `packages/ui/src/components/ui/edge-panel-handle.tsx`: componente visual e acessível, sem estado próprio.
- `packages/ui/tests/edge-panel-handle.test.tsx`: contratos dos dois lados, posições e nomes.
- `packages/community-kids/src/components/kids/focus-mode-toggle.tsx`: adaptador do estado Kids ao componente compartilhado.
- `packages/community-kids/src/app/(app)/layout.tsx` e `src/components/kids/app-sidebar.tsx`: ponto único de montagem e ID do painel esquerdo.
- `packages/community-kids/src/app/globals.css`: largura real responsiva do painel direito e aparência das duas alças via tokens.
- `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`, `src/components/kids/avatar3d/configurator.tsx`, `src/app/(app)/quarto/quarto-header.tsx`: retirar botões de cabeçalho duplicados.
- `packages/community-kids/src/components/kids/use-host-chrome.tsx` e `src/lib/host-chrome.ts`: menu do host deixa de ser entregue aos editores embarcados; os controles autônomos das ferramentas continuam intactos.
- `packages/community-kids/tests/focus-mode.test.tsx`, `tests/host-chrome.test.tsx`: cobrir a montagem única e a nova pele sem mudar a lógica de estado.
- `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`, `src/app/globals.css`: substituir o botão do topo pela alça direita.

---

### Task 1: Componente compartilhado de alça

**Files:**
- Create: `packages/ui/src/components/ui/edge-panel-handle.tsx`
- Create: `packages/ui/tests/edge-panel-handle.test.tsx`

**Interfaces:**
- Consumes: `lucide-react`, `@sistemazero/ui/cn`.
- Produces: `EdgePanelHandle({ side, open, openOffset, label, controlsId, onToggle, className })`.

- [ ] **Step 1: Write the failing test**

```tsx
const closed = renderToStaticMarkup(<EdgePanelHandle side="left" open={false} openOffset="var(--kids-menu-width)" label="Mostrar menu" controlsId="kids-app-sidebar" onToggle={() => {}} />)
expect(closed).toContain('aria-label="Mostrar menu"')
expect(closed).toContain('aria-pressed="true"')
expect(closed).toContain('left:0')
const opened = renderToStaticMarkup(<EdgePanelHandle side="right" open openOffset="var(--lesson-outline-width)" label="Esconder lista de aulas" controlsId="kids-lesson-outline" onToggle={() => {}} />)
expect(opened).toContain('right:var(--lesson-outline-width)')
expect(opened).toContain('aria-controls="kids-lesson-outline"')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/ui/tests/edge-panel-handle.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the smallest shared component**

```tsx
type Side = 'left' | 'right'
type Props = { side: Side; open: boolean; openOffset: string; label: string; controlsId: string; onToggle: () => void; className?: string }
const Icon = side === 'left' ? (open ? PanelLeftClose : PanelLeftOpen) : open ? PanelRightClose : PanelRightOpen
const style = side === 'left' ? { left: open ? openOffset : 0 } : { right: open ? openOffset : 0 }
return <button type="button" onClick={onToggle} aria-label={label} aria-controls={controlsId} aria-pressed={!open} data-side={side} data-open={open} style={style} className={cn('fixed top-[5.75rem] z-40 flex h-11 w-9 items-center justify-center transition-[left,right] duration-300 ease-in-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', side === 'left' ? 'rounded-r-xl' : 'rounded-l-xl', className)}><Icon className="size-5" aria-hidden /></button>
```

- [ ] **Step 4: Run `bun test packages/ui/tests/edge-panel-handle.test.tsx` and `bun run --filter @sistemazero/ui typecheck`**

Expected: both exit 0.

- [ ] **Step 5: Review the diff and commit**

```bash
git add packages/ui/src/components/ui/edge-panel-handle.tsx packages/ui/tests/edge-panel-handle.test.tsx
git commit -m "feat(ui): criar alça compartilhada para painéis laterais"
```

### Task 2: Uma alça por lateral no shell Kids

**Files:**
- Modify: `packages/community-kids/src/components/kids/focus-mode-toggle.tsx`
- Modify: `packages/community-kids/src/app/(app)/layout.tsx`
- Modify: `packages/community-kids/src/components/kids/app-sidebar.tsx`
- Modify: `packages/community-kids/src/app/globals.css`
- Test: `packages/community-kids/tests/focus-mode.test.tsx`

**Interfaces:**
- Consumes: `EdgePanelHandle` from Task 1 and existing `useFocusMode()`.
- Produces: exactly one visible left handle when `navAvailable`, and one right handle when `outlineAvailable`.

- [ ] **Step 1: Make the focus-mode test describe the new handle**

```tsx
expect(screen.getByRole('button', { name: 'Mostrar menu' }).getAttribute('data-side')).toBe('left')
expect(screen.getByRole('button', { name: 'Mostrar menu' }).getAttribute('style')).toContain('left: 0')
fireEvent.click(screen.getByRole('button', { name: 'Mostrar menu' }))
expect(screen.getByRole('button', { name: 'Esconder menu' }).getAttribute('style')).toContain('var(--kids-menu-width)')
expect(screen.getByRole('button', { name: 'Mostrar lista de aulas' }).getAttribute('data-side')).toBe('right')
```

- [ ] **Step 2: Run `bun test packages/community-kids/tests/focus-mode.test.tsx`**

Expected: FAIL on the new `data-side`/position assertions.

- [ ] **Step 3: Adapt `FocusModeToggle` and mount centrally**

```tsx
return <EdgePanelHandle side={target === 'nav' ? 'left' : 'right'} open={!hidden} openOffset={target === 'nav' ? 'var(--kids-menu-width)' : 'var(--lesson-outline-width)'} label={label} controlsId={target === 'nav' ? 'kids-app-sidebar' : 'kids-lesson-outline'} onToggle={toggle} className={target === 'nav' ? 'bg-(--menu) text-(--menu-texto) md:z-40' : 'bg-card text-foreground border border-border z-[62] lg:z-[41]'} />
```

In `(app)/layout.tsx`, put `<FocusModeToggle target="nav" />` and `<FocusModeToggle target="outline" />` inside `.kids-shell-row`, outside the sidebar `Suspense`. Set `id="kids-app-sidebar"` on the real `<aside>` and its fallback. In Kids CSS set `--lesson-outline-width: min(20rem, 90vw)` at `.kids-shell-row` and override it to `18rem` at `min-width: 1024px`, matching the actual drawer widths.

- [ ] **Step 4: Run focused tests, Kids typecheck and review both states**

Run: `bun test packages/community-kids/tests/focus-mode.test.tsx packages/community-kids/tests/main-container.test.tsx`; `bun run --filter @sistemazero/community-kids typecheck`.
Expected: both exit 0; closed handle at screen edge, open handle at the exact panel width.

- [ ] **Step 5: Review and commit**

```bash
git add packages/community-kids/src/components/kids/focus-mode-toggle.tsx packages/community-kids/src/app/'(app)'/layout.tsx packages/community-kids/src/components/kids/app-sidebar.tsx packages/community-kids/src/components/kids/focus-mode.tsx packages/community-kids/src/app/globals.css packages/community-kids/tests/focus-mode.test.tsx
git commit -m "feat(kids): prender alças às laterais do shell"
```

### Task 3: Retirar controles duplicados das páginas Kids

**Files:**
- Modify: `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`
- Modify: `packages/community-kids/src/components/kids/avatar3d/configurator.tsx`
- Modify: `packages/community-kids/src/app/(app)/quarto/quarto-header.tsx`
- Modify: `packages/community-kids/src/components/kids/use-host-chrome.tsx`
- Modify: `packages/community-kids/src/lib/host-chrome.ts`
- Modify: `packages/community-kids/src/components/kids/main-container.tsx` (comments only)
- Test: `packages/community-kids/tests/host-chrome.test.tsx`

**Interfaces:**
- Consumes: the two centrally mounted Kids handles from Task 2.
- Produces: tool `hostChrome.menu === null`, while `status`, `back` and `account` continue unchanged.

- [ ] **Step 1: Change the host-chrome test**

```tsx
pathname = '/pinta'
mount(null)
expect(screen.getByTestId('menu').textContent).toBe('null')
expect(screen.getByTestId('back').textContent).toBe('Voltar para Criar|/criar')
```

- [ ] **Step 2: Run `bun test packages/community-kids/tests/host-chrome.test.tsx`**

Expected: FAIL while `useHostChrome()` still supplies the menu.

- [ ] **Step 3: Set `menu: null` only in the embedded Kids host; remove duplicate JSX**

```tsx
const chrome = useMemo<HostChrome>(
  () => ({ menu: null, status, back, account }),
  [status, back, account],
)
```

Remove the local `<FocusModeToggle>` calls from the lesson progress row, avatar header and Quarto header. Remove now-unused imports and the dead `HOST_CHROME_MENU_LABELS` constant. Do not remove `HostChromeMenu` from the structural contract: standalone tool playgrounds still use it. Update comments that say the button lives in tool headers.

- [ ] **Step 4: Run tests/typecheck and review no duplicate buttons**

Run: `bun test packages/community-kids/tests/host-chrome.test.tsx packages/community-kids/tests/focus-mode.test.tsx`; `bun run --filter @sistemazero/community-kids typecheck`.
Expected: both exit 0. Check lesson, Studio, Pensa, Pinta, Molda, avatar and Quarto source paths for only the central handle.

- [ ] **Step 5: Review and commit**

```bash
git add packages/community-kids/src packages/community-kids/tests/host-chrome.test.tsx
git commit -m "refactor(kids): retirar toggles duplicados dos cabeçalhos"
```

### Task 4: Alça da aula adulta e verificação final

**Files:**
- Modify: `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`
- Modify: `packages/community/src/app/globals.css`
- Modify: `packages/community-kids/CLAUDE.md`, `packages/community/CLAUDE.md` (localização atual dos controles)

**Interfaces:**
- Consumes: `EdgePanelHandle` from Task 1.
- Produces: a single right handle for the adult lesson outline, with mobile offset matching `min(20rem, 90vw)` and desktop offset `18rem`.

- [ ] **Step 1: Add a source/DOM regression for the adult handle**

```tsx
const html = renderToStaticMarkup(<EdgePanelHandle side="right" open={false} openOffset="var(--lesson-outline-width)" label="Mostrar lista de aulas" controlsId="adult-lesson-outline" onToggle={() => {}} />)
expect(html).toContain('aria-controls="adult-lesson-outline"')
expect(html).toContain('right:0')
```

Place this contract in `packages/ui/tests/edge-panel-handle.test.tsx`; the adult player build will verify its import and render path.

- [ ] **Step 2: Replace the old adult top-bar button**

```tsx
<EdgePanelHandle side="right" open={outlineOpen} openOffset="var(--lesson-outline-width)" label={outlineOpen ? 'Esconder lista de aulas' : 'Mostrar lista de aulas'} controlsId="adult-lesson-outline" onToggle={() => setOutlineOpen((value) => !value)} className="border border-border bg-card text-foreground z-[62] lg:z-[41]" />
```

Set `--lesson-outline-width: min(20rem, 90vw)` on `.sz-aula-adulto` below `1024px` and `18rem` from `1024px`, so the handle touches the real drawer edge. Keep the existing backdrop/close button and `inert` behavior. Update the relevant docs.

- [ ] **Step 3: Run full relevant verification**

Run: `bun test packages/ui/tests/edge-panel-handle.test.tsx packages/community-kids/tests/focus-mode.test.tsx packages/community-kids/tests/host-chrome.test.tsx`; `bun run --filter @sistemazero/ui typecheck`; `bun run --filter @sistemazero/community-kids typecheck`; `bun run --filter @sistemazero/community typecheck`; `bunx biome ci packages/ui packages/community-kids packages/community`; builds for Kids and Adult with `NODE_ENV=production`.
Expected: exit 0; no new skipped test or warning. Inspect at 390, 768, 1024 and 1440 px, including keyboard focus, reduced motion, Studio toolbox, Pinta and Molda controls.

- [ ] **Step 4: Review diff against spec and commit**

```bash
git diff --check
git add packages/community/src/app/'(app)'/cursos/'[slug]'/aulas/'[lessonId]'/lesson-player-client.tsx packages/community/src/app/globals.css packages/community-kids/CLAUDE.md packages/community/CLAUDE.md packages/ui/tests/edge-panel-handle.test.tsx
git commit -m "feat(community): usar alça no índice da aula adulta"
```

## Integração após os lotes

Revisar os commits da outra sessão antes de rebase/merge, com atenção a `focus-mode.tsx`, `focus-route.ts`, avatar, Quarto e cabeçalhos de Pinta/Pensa/Studio. Não sobrescrever o trabalho deles. Só integrar esta branch em `staging` depois de o CI/deploy de materiais concluir com sucesso. Fazer review final do diff integrado, executar testes/CI, push e conferir os serviços `community-kids` e `community` em Railway pelo SHA final.
