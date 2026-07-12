# CLAUDE.md — @sistemazero/ui

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (React, Tailwind, CVA
> etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes.

**Componentes de UI compartilhados** entre `@sistemazero/admin` e `@sistemazero/community`
(Bun workspace, mesmo molde do `@sistemazero/core`). Existe para que os apps NUNCA dupliquem
primitivos — cópias divergem e quebram o tema (foi assim que o quiz do community ficou fora do
tema). O design espelha o projeto de referência `C:\Users\tocha\projects\comunidade-sistema-zero`
(que tem o MESMO padrão: apps + packages/ui).

## Regras (NÃO quebrar)

1. **Novo primitivo reutilizável? Nasce AQUI**, não em `packages/<app>/src/components/`.
   Componentes específicos de domínio (cards de curso, tabelas de admin) ficam nos apps.
2. **O Button espelha o da referência** (`comunidade-sistema-zero/packages/ui/button.tsx`) —
   classes IDÊNTICAS, só o primitivo difere (`<button>` nativo em vez do Base UI). NÃO
   simplifique as variantes: o contraste por tema (destructive suave, outline `dark:bg-input/30`,
   ring a 50%) vem delas. O variant `default` vira CTA gradiente via override
   `button.bg-primary.text-primary-foreground` no globals.css de cada app.
3. **Sem CSS próprio nos COMPONENTES**: os componentes usam tokens dos apps (`--primary`,
   `--success`, `--ring`…). Token novo num componente → defina-o nos DOIS globals.css (admin e
   community) nos DOIS temas (light/dark). **Exceção única (07/2026):**
   `src/styles/theme-kids.css` (export `@sistemazero/ui/theme-kids.css`) — arquivo OPT-IN de
   PRIMITIVOS de marca da linha kids (`--sz-kids-*`, só constantes; nenhuma classe, nenhum token
   semântico). Importado pelo funnel e pelo community-kids, que apontam seus tokens semânticos
   para os primitivos; studio/pensa/pinta referenciam com fallback literal (sem dep). Nenhum
   componente deste pacote referencia `--sz-kids-*` — admin/community adulto não são afetados.
4. **Sem deps de framework**: react/react-dom são peer; só cva + clsx + tailwind-merge +
   lucide-react. Nada de Next/`server-only` aqui.

## Consumo (já configurado nos dois apps)

- `package.json` do app: `"@sistemazero/ui": "workspace:*"`.
- Import: `import { Button } from '@sistemazero/ui/button'` (wildcard `./*` →
  `src/components/ui/*.tsx`; barrel `@sistemazero/ui` e `@sistemazero/ui/cn` também existem).
- `next.config.ts`: `transpilePackages: ['@sistemazero/ui']` (TS cru no workspace).
- `globals.css`: `@source "../../../ui/src";` — **obrigatório** (Tailwind v4 só gera classes
  que o scanner vê; sem isso os componentes renderizam sem estilo).

## Componentes

badge (variant `success` usa tokens `--success/*`) · button (+`buttonVariants` p/ Links) · card ·
**confirm-dialog** (`@sistemazero/ui/confirm-dialog` — `ConfirmDialog` sobre o `Dialog`: rodapé
Cancelar/Confirmar; substitui o `window.confirm()` nativo. Props `open/onClose/title/message/
onConfirm/confirmText/cancelText/confirmVariant('default'|'destructive')/confirmDisabled/children`.
`onConfirm` pode ser async — mostra spinner e trava os botões; o chamador fecha no sucesso (via
`onClose`) e mantém aberto no erro. `children` entra abaixo da `message` — use p/ um campo de
confirmação, ex.: digitar o e-mail antes de excluir, com Confirmar travado por `confirmDisabled`.
No admin há o hook `useConfirm` (`components/admin/use-confirm.tsx`) que embrulha o estado p/ os
confirms simples) ·
dialog (props opcionais `titleAlign: 'left'|'center'` e `onBack` — fluxos multi-passo estilo
Udemy; X/Voltar são absolutos no header; **gestão de foco a11y**: foca o card ao abrir, PRENDE o
Tab, devolve o foco ao gatilho ao fechar — pilha de diálogos + lock de scroll refcontado (via
`scroll-lock`, ver abaixo), só o do
TOPO trata Esc/Tab; **o card é capado à viewport (`max-h-[calc(100dvh-6rem)]` + flex-col): cabeçalho
e rodapé FIXOS, só o corpo rola** — conteúdo alto (ex.: o Estúdio embutido na autoria de bloco) não
transborda nem corta o topo, e o footer Salvar/Cancelar fica sempre visível; **largura via
`className`** — default `max-w-lg`, sobrescreva p/ conteúdo largo, ex. `max-w-7xl` no bloco Estúdio)
· info-tooltip · input · label (`Field` com `tooltip?`; **o erro vira
`role="alert"` ligado por `aria-describedby` + `aria-invalid` no controle** — clona o filho) ·
pagination · password-input (**olho alcançável por teclado**, `aria-pressed`) · progress · select ·
**skeleton** (`@sistemazero/ui/skeleton` —
placeholder animado `animate-pulse`/`bg-muted` no lugar de "Carregando…"; molde por `className`,
componha p/ cards/linhas; use em `loading.tsx` de rota e em estados de fetch client) · spinner ·
star-rating (display + input com MEIA
estrela 1–5: radios nativos sr-only sobre as metades — 1ª estrela é alvo inteiro —, hover preview,
âmbar `fill-amber-400`; sem `onChange` = read-only) · **`scroll-lock`** (`@sistemazero/ui/scroll-lock`
— `useBodyScrollLock(active)` + `lockBodyScroll`/`unlockBodyScroll` REFCONTADOS; o `Dialog` usa, e
overlays de tela cheia também — fechar um modal por cima de um overlay não destrava o body cedo) ·
switch · table · textarea · **`use-modal-a11y`** (`@sistemazero/ui/use-modal-a11y` —
`useModalA11y({open,onClose})` devolve o `ref` do card e faz a gestão de foco de modal: foca ao
abrir, PRENDE o Tab, Esc fecha, devolve o foco ao gatilho; pilha refcontada + lock de scroll. O
`Dialog` consome este hook; overlays "bespoke" que precisam do mesmo comportamento sem o chrome do
Dialog — ex.: as celebrações do community-kids — reusam o hook direto) · `cn`
(clsx + tailwind-merge) · **`phone`** (`@sistemazero/ui/phone`, módulo PURO sem React:
`phoneDigits`/`brLocalDigits`/`formatTelefone` — máscara BR "(11) 99999-9999"; usado pelo
perfil do community e pelo pré-checkout do funil; convenção: o auth guarda SÓ DÍGITOS locais).

## Comandos

`bun run typecheck` · `bun run check` / `check:fix` (Biome; overrides a11y p/ `packages/ui` no
biome.json da raiz). Não há build — os apps transpilam o source.
