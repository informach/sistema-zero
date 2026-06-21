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
3. **Sem CSS próprio**: os componentes usam tokens dos apps (`--primary`, `--success`,
   `--ring`…). Token novo num componente → defina-o nos DOIS globals.css (admin e community)
   nos DOIS temas (light/dark).
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
dialog (props opcionais `titleAlign: 'left'|'center'` e `onBack` — fluxos multi-passo estilo
Udemy; X/Voltar são absolutos no header) · info-tooltip · input · label (`Field` com `tooltip?`) ·
pagination · password-input · progress · select · **skeleton** (`@sistemazero/ui/skeleton` —
placeholder animado `animate-pulse`/`bg-muted` no lugar de "Carregando…"; molde por `className`,
componha p/ cards/linhas; use em `loading.tsx` de rota e em estados de fetch client) · spinner ·
star-rating (display + input com MEIA
estrela 1–5: radios nativos sr-only sobre as metades — 1ª estrela é alvo inteiro —, hover preview,
âmbar `fill-amber-400`; sem `onChange` = read-only) · switch · table · textarea · `cn`
(clsx + tailwind-merge) · **`phone`** (`@sistemazero/ui/phone`, módulo PURO sem React:
`phoneDigits`/`brLocalDigits`/`formatTelefone` — máscara BR "(11) 99999-9999"; usado pelo
perfil do community e pelo pré-checkout do funil; convenção: o auth guarda SÓ DÍGITOS locais).

## Comandos

`bun run typecheck` · `bun run check` / `check:fix` (Biome; overrides a11y p/ `packages/ui` no
biome.json da raiz). Não há build — os apps transpilam o source.
