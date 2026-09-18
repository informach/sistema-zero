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
   community) nos DOIS temas (light/dark). **TRÊS exceções, todas OPT-IN por `@import`:**
   (a) **`src/tokens/` + `src/styles/palettes/community.css` (GERADO) + os dois aliases**
   (`src/styles/community-kids-theme.css` e `src/styles/theme-kids.css`; exports
   `@sistemazero/ui/palettes.css`, `.../community-kids-theme.css` e `.../theme-kids.css`).
   ⭐ **Desde 17/09/2026 a fonte canônica das CORES é o registro TS em `src/tokens/`, não um
   arquivo CSS**: `palettes.ts` (uma paleta = uma matiz), `recipe.ts` (a receita ajustada às
   paletas aprovadas), `derive.ts` (pura: id → 36 tokens), `contrast.ts` (a auditoria) e
   `emit.ts`. `bun run tokens:gen` escreve `src/styles/palettes/community.css`, que é
   COMPROMETIDO no repositório — e `tests/palettes-generated.test.ts` o regenera em memória e
   compara byte a byte, o que faz o TESTE ser a conferência de build (o pacote segue sem build).
   ⚠️⚠️ O gerador AUDITA contraste e sai com erro nomeando a dupla que reprovou: paleta ilegível
   não chega ao disco. ⚠️ Cor nova é UMA LINHA em `palettes.ts` (a matiz) mais o id em
   `@sistemazero/core/palette` — que é onde mora o VOCABULÁRIO (ids, rótulos pt-BR,
   `DEFAULT_PALETTE`), porque banco, gateway e BFF precisam dele sem arrastar React.
   A paleta escolhida pela pessoa chega por **`data-sz-palette` no `<html>`** (⚠️ NÃO reutilizar
   `data-sz-theme`, que é das ferramentas embarcadas); o servidor SEMPRE emite o atributo.
   `community-kids-theme.css` virou camada de alias `--sz-community-*` → `--sz-*` com ZERO
   literal, e `theme-kids.css` (os `--sz-kids-*`) segue intocado atrás dele. Funnel e
   community-kids importam `theme-kids.css`, mapeiam seus tokens semânticos para a mesma fonte e
   NUNCA repetem os valores localmente (o contrato varre TODO valor que o gerador produz, então
   cresce sozinho com o catálogo); studio/pensa/pinta/molda referenciam os aliases com fallback
   literal (sem dep).
   (b) **`src/styles/tool-chrome.css`** (export `@sistemazero/ui/tool-chrome.css`, 07/09/2026) —
   o CHROME COMPARTILHADO das ferramentas embarcadas (Pinta, Estúdio, Pensa; Molda no lote 6b):
   tokens SEMÂNTICOS `--sz-tool-*` (claro em `:root` + nos escopos claros de cada ferramenta;
   escuro DEPOIS, sob `.dark`, `[data-sz-theme="dark"]`, `[data-pinta-theme="dark"]`,
   `[data-molda-theme="dark"]`, `.pensa-theme-dark`; derivados re-declarados nos dois; FORA do
   bloco de tema do Tailwind, que poda) e as RECEITAS em `@layer components`. ⭐ **Desde
   11/09/2026 o desenho é o das telas-modelo dela** (as galerias iguais às páginas do kids):
   faixas `.sz-tool-bands` > `.sz-tool-band--creme|ceu|lilas|branco` + `__inner` (64px dos
   lados a partir de 1024px de janela, 32 no tablet, 16 no celular; a última faixa cresce até o
   pé); `.sz-tool-title`/`-subtitle`/`-section-title`/`-section-text`/`-kicker`; o QUADRADO de
   ícone `.sz-tool-icon-btn(--round)`, que é também o `.sz-tool-btn-menu` (o menu do host
   DEIXOU de ser a aba colada na barra lateral: agora é um quadrado dentro do conteúdo, e o
   `--sz-tool-inset` saiu) e a `.sz-tool-back`; pílulas `.sz-tool-pill--primary|quiet|
   outline|creme` (sem gradiente; chapadas nos editores e com o 3D só nas galerias, ver abaixo); `.sz-tool-chips`/`.sz-tool-chip` (o ativo é o
   azul da marca cheio), `.sz-tool-search(-wrap)`, `.sz-tool-select(-wrap)` (desenha a seta),
   `.sz-tool-status(--ok|--warn|--danger)` em pílula; `.sz-tool-grid` (auto-fill de 13,75rem:
   4 colunas a 1440 com o menu aberto), `.sz-tool-card(--new)` + `.sz-tool-card-title` (Baloo 800 de
   15px) + `.sz-tool-new-dot` (o `--new` desligado fica com meia opacidade e sem o fio amarelo do
   hover: o Pinta o deixa NO LUGAR no modo seleção, para a grade não andar uma casa),
   `.sz-tool-cover`, `.sz-tool-tile--new|ok|estudio|pinta|molda|pensa` e `.sz-tool-cta-card`
   (`__body|__title|__text`); e o layout `.sz-tool-header(__lead|__nav|__title|__actions)` /
   `.sz-tool-toolbar(__start|__end)`. Os controles novos medem `--sz-tool-hit`: 40px no mouse (a
   imagem) e 44px com `any-pointer: coarse` (a régua da casa). O fundo dos controles quietos é
   `--sz-tool-quiet`: céu diluído sobre barra branca, branco dentro de uma faixa. As receitas
   ANTIGAS (`.sz-tool-btn`/`--icon`, `.sz-tool-btn-3d`, `.sz-tool-panel`/`.sz-tool-pop`) SAÍRAM na
   limpeza do lote (11/09/2026), junto com os tokens que só elas liam (`--sz-tool-control` e as
   sombras duras `--sz-tool-shadow-*`/`-shade`); o contrato trava a ausência e VARRE o código dos
   pacotes consumidores (classe sem receita não quebra teste nenhum: o botão só sai sem desenho).
   Ficaram `--sz-tool-border`/`--sz-tool-radius-card` (o `.pin-panel` do Pinta lê) e o
   `--sz-tool-cta-gradient` (pinta.css e pensa.css leem).
   ⭐ **Paleta do Pen (11/09/2026):** `--sz-tool-accent`/`--sz-tool-cta` leem `--sz-kids-acao`
   ANTES do azul de identidade (o kids dá a cor de ação do tema: azul no Padrão, rosa no Pink;
   sem host, o azul de sempre), e as faixas seguem o chão do Pen (cabeçalho e grade no
   `--sz-kids-ceu-suave`, fechamento no `--sz-kids-ceu`). **O 3D do Brilliant só nas GALERIAS:**
   dentro de `.sz-tool-bands`, as pílulas, os quadrados (menu, seta, ícone) e o cartão
   `--new` ganham a borda de baixo sólida por sombra (`--sz-tool-cta-degrau` na primária,
   `--sz-tool-degrau` no resto, tokens nos dois temas que o host alimenta; `--sz-3d-*` é o estado
   de cada peça, não token); no hover sobem 1px e no aperto afundam, por `translate`. Os
   EDITORES e os chips (que são abas) ficam planos. O contrato trava: nenhuma regra de pílula
   fora das faixas tem sombra, e existe UMA regra de relevo, sem os chips. ⚠️ Peça com a área
   clicável esticada por `::after` ("o cartão inteiro abre") NÃO pode andar: o `translate` faz
   dela o bloco de referência do `::after`, que encolhe no meio do gesto (hover piscando, clique
   perdido). Desligue o movimento na folha do pacote, fora de camada, como o
   `.pensa-project-card__open` do Pensa (`ba43b146`). ⚠⚠ **E quem declara o `cursor` de uma peça
   assim é o CARTÃO, nunca só a camada (18/09/2026):** o `cursor: pointer` vem do `.sz-tool-pill`
   e é herdado pelo `::after`, então qualquer ponto que escape da camada cai no `auto` do
   contêiner e vira SETA — com o ponteiro parado na beirada, ele alterna entre seta e mãozinha
   várias vezes por segundo (o "cursor tremendo" que ela relatou TRÊS vezes no Pensa). Casar as
   duas fronteiras (o `inset: -1px`) resolve em 100% e volta a falhar em zoom fracionário;
   declarar no ancestral resolve por HERANÇA e mata a classe. Medido em
   `packages/pensa/src/styles/pensa.css`, com trava em `tokens.test.ts` de lá. ⚠️⚠️ **E o cartão `--new` também NÃO anda
   (14/09/2026):** cartão de grade tem aresta longa, e 1px de movimento faz o ponteiro parado na
   borda de baixo entrar e sair do hover várias vezes por segundo — é o "cursor tremendo/piscando"
   que ela relatou no Pensa (medido no playground: o cartão termina em 502,15 parado e em 501,15
   no hover). A regra que zera o movimento dele vem DEPOIS do `:active` (mesma especificidade,
   0-4-0) e o relevo fica: a sombra cresce e a borda amarela acende. Quem importa: o community-kids (`globals.css`, DEPOIS do
   `theme-kids` e ANTES dos CSS dos pacotes) e os playgrounds do pinta/studio/molda/pensa; admin e
   community adulto NÃO (lá não há galeria nem menu do host; os pacotes caem nos fallbacks). Os
   pacotes apontam seus tokens (`--color-pin-*`, `--color-sz-*`, `--pz-*`) para os `--sz-tool-*`
   em cadeia de dois degraus (`var(--sz-tool-x, var(--sz-kids-y, literal))`). ⚠️ `color-mix`
   SEMPRE `in oklab` (o branco `oklch(1 0 0)` tem matiz explícito; em oklch a mistura gira e dá
   rosa). Contrato em `tests/tool-chrome.test.ts` (lê a folha e os `@import` dos hosts como texto;
   `bun test tests`). Nenhum componente deste pacote referencia `--sz-kids-*`/`--sz-tool-*`.
   (c) **`src/styles/console.css`** (export `@sistemazero/ui/console.css`, 17/09/2026) — o chassi
   das FERRAMENTAS INTERNAS (admin, helpdesk-app, marketing-app). Os três carregavam este mesmo
   bloco COPIADO: o `:root` diferia por uma palavra de comentário e o `.dark` era byte a byte
   igual, ~330 linhas. ⭐ Ele também é **GERADO** — de `src/tokens/console.ts`, que veste os
   tokens do shadcn com a paleta do Pen (`deriveConsole` deriva de `derive(DEFAULT_PALETTE)`; o
   `bun run tokens:gen` escreve os dois arquivos e AUDITA o contraste dos dois chassis antes de
   gravar). ⚠️⚠️ **UM tema só:** sem cor por pessoa (o público é o time interno, não há
   `[data-sz-palette]` aqui) e **sem claro/escuro** — o `.dark` saiu junto com o das comunidades,
   e o `next-themes` foi removido dos três apps. O `@custom-variant dark` FICA nos `globals.css`
   deles: sem ele os `dark:` que este pacote e o `member-shell` ainda trazem passariam a seguir o
   sistema operacional. ⚠️ Token de console novo nasce em `console.ts`, não nos `globals.css` —
   eles não têm mais bloco `:root`/`.dark`. Contrato em `tests/console-theme.test.ts` (importam a
   folha, não redeclaram, o `@import` vem antes de qualquer regra, e todo token que o
   `@theme inline` deles consome existe na folha).
   ⭐⭐ **18/09/2026 — o console ficou FIEL à comunidade (cor, marca E forma).** Sobravam três
   pedaços da identidade antiga, e os três saíram: `--sz-gradient` (o botão primário era promovido
   a CTA com degradê azul), `--brand-lime`/`--brand-cyan` (o verde-lima da wordmark antiga, que
   só as classes mortas `.brand-gradient-text` e `.dark .brand-glow` liam) e a logo em `<img>`.
   No lugar: `--radius` **1.25rem** (a régua do Pen — ⚠️ ela reverbera em todo
   `rounded-sm/md/lg/xl` dos painéis), `--primary-hover` novo (o hover do botão chapado troca a
   COR), os quatro `--logo-zero-*` (o `BrandLogo` abaixo) e, nos `globals.css` dos três, a pílula
   chapada da comunidade + `@theme { --shadow-sm: 0 0 #0000 }`. O contrato cobra os quatro tokens
   da logo, a AUSÊNCIA dos três antigos e o desenho do botão nos três apps.
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

badge (variant `success` usa tokens `--success/*`) · **brand-logo**
(`@sistemazero/ui/brand-logo` — `<BrandLogo fundo="escuro"|"claro" label className>`: a logo
oficial em SVG EMBUTIDO. Era do community e virou compartilhada em 18/09/2026, quando os painéis
internos e o /admin do funil trocaram o `<img>` dos SVGs de `public/` — que traziam o verde-lima
`#C4F042` cravado, fora do alcance de qualquer tema. O ZERO e a estrelinha leem
`var(--logo-zero-<fundo>-{de,ate})`: o community declara os quatro no `:root`, os três consoles os
recebem do `console.css` e o funil os declara no `global.css`. ⚠️ Os caminhos do SVG são GERADOS a
partir dos arquivos de `public/` — não edite à mão) · button (+`buttonVariants` p/ Links) · card ·
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

`bun run typecheck` · `bun test tests` (o contrato do `tool-chrome.css` + `phone`) · `bun run check`
/ `check:fix` (Biome; overrides a11y p/ `packages/ui` no biome.json da raiz). Não há build — os
apps transpilam o source.
