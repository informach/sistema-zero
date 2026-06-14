# Embarcando o @sistemazero/studio

Guia para apps do monorepo (admin/community = Next 16; funnel = Astro 6) incorporarem o editor.

## 1. Dependência e transpilação

```jsonc
// package.json do consumer
"dependencies": { "@sistemazero/studio": "workspace:*" }
```

```ts
// next.config.ts (Next)
transpilePackages: ['@sistemazero/studio']
```

No Astro/Vite não precisa de nada: o Vite transpila workspace source por padrão.

## 2. CSS (Tailwind v4)

No CSS global do consumer (ex.: `src/app/globals.css`):

```css
@import "tailwindcss";
@import "@sistemazero/studio/styles.css"; /* tokens --color-sz-* + estilos do componente */
@source "../../../studio/src";            /* o scanner PRECISA ver as classes do studio */
```

O `styles.css` do studio NÃO traz `@import "tailwindcss"` nem `@custom-variant dark` — não colide com o preflight nem com a variant dark do app. Os tokens são namespaced (`--color-sz-*`) e o tema é escopado por `[data-sz-theme]` no root do componente (nunca no `<html>` do host).

## 3. Render client-only

Monaco/Blockly/IndexedDB não existem no server.

```tsx
// Next (App Router)
'use client'
import dynamic from 'next/dynamic'
const Studio = dynamic(() => import('@sistemazero/studio').then((m) => m.Studio), { ssr: false })
```

```astro
<!-- Astro -->
<StudioIsland client:only="react" />
```

## 4. Uso básico

```tsx
import { createEmptyProject, type StudioHandle } from '@sistemazero/studio'

<Studio
  initialProject={project}                  // uncontrolled; recarga externa = handle.replaceProject()
  persistence="none"                        // 'local' (IndexedDB, default) | 'none' | adapter custom
  onChange={(p) => salvarNoBackend(p)}      // snapshot completo no debounce do autosave (1s) e em flushes
  onSave={(p) => salvarAgora(p)}            // pós "Salvar" explícito; Promise rejeitada marca erro no badge
  features={{ terminal: false, ai: { apiKey: chaveDoHost, model: 'anthropic/claude-sonnet-4.5' } }}
  allowedModes={['blocks', 'bridge']}       // esconde modos; modo salvo fora da lista cai no 1º permitido
  theme="dark"                              // sem a prop: toggle interno (Topbar) + Settings
  onExit={() => router.back()}
  ref={handleRef}                           // StudioHandle: getProject/save/replaceProject/setMode/isDirty
  className="h-[80vh]"                      // o Studio preenche 100% do container
/>
```

Props ESTÁTICAS por instância (trocar exige remount): `persistence`, `limits`, `locale`.

`<ProjectList onOpenProject={(id) => ...} />` — lista/gerência de projetos do IndexedDB local (por ora acoplada ao adapter local; hosts com backend devem listar pelos próprios dados).

`prefetchStudioModes()` — aquece os chunks pesados (Blockly/Monaco) no hover do link que abre o editor.

## 5. Headers — SOMENTE se `features.terminal` for ligado

O WebContainer exige cross-origin isolation no DOCUMENTO do host:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

No Next: `headers()` do next.config.ts. ⚠️ COEP afeta TODO recurso cross-origin da página (imagens/iframes precisam de CORS/CORP) — ligue só na rota do editor.

CSP, se o host usa uma: o terminal precisa de `script-src 'unsafe-eval' 'wasm-unsafe-eval' blob: https://*.webcontainer-api.io`, `connect-src https://*.webcontainer-api.io https://*.staticblitz.com`, `frame-src blob: https://*.webcontainer-api.io`; a IA (BYOK/host) precisa de `connect-src https://openrouter.ai`; o preview e os workers do Monaco precisam de `worker-src 'self' blob:` e `frame-src 'self' blob:`.

## 6. Limitações conhecidas

- Multi-instância funciona (stores por instância), MAS: o WebContainer é singleton por aba (2 terminais compartilham o container) e o atalho de teclado da busca de blocos fica com a última instância montada.
- **Tema do Monaco é GLOBAL por página** (consequência do namespace único do Monaco — há um só tema ativo via `monaco.editor.setTheme`). Duas instâncias simultâneas em Código/Ponte (ex.: rota `/dual`) acabam adotando o ÚLTIMO tema definido; não há isolamento de tema por instância no Monaco. O Blockly, ao contrário, aplica tema por workspace. (Os models, esses sim, são isolados por instância: o `path` é salgado com um id estável por instância.)
- Settings (tema via toggle, fonte do código, chave BYOK) são preferência do USUÁRIO, compartilhada entre instâncias e persistida em IndexedDB.
- O smoke obrigatório na primeira integração Next/Turbopack: modo Código (autocomplete = workers do Monaco) e modo Ponte (digitar HTML → blocos = worker de reverse-parse). Se o worker `.ts` relativo falhar no bundler do host, ver plano B no CLAUDE.md (factory injetável).

## 7. Modo Profissional (`features.professional`)

O modo profissional troca o preview srcdoc por um **dev-server real (Vite) rodando dentro do WebContainer**: TypeScript + npm + Vite + React, com `npm install`/`npm run dev` de verdade e HMR. É a ponte do aluno dos blocos para uma stack moderna.

```tsx
import { createProProject } from '@sistemazero/studio'

<Studio
  initialProject={createProProject(crypto.randomUUID(), 'Meu app', 'react-ts')}
  features={{ professional: true }}   // FORÇA terminal:true e allowedModes:['code']
  persistence="local"
/>
```

Templates disponíveis (`PRO_TEMPLATES` / `listProTemplates()`): `vanilla-vite`, `react-ts`, `three-ts`. A `<ProjectList professional />` mostra o seletor de template no "Novo projeto" e chama o factory por baixo.

Regras NÃO-NEGOCIÁVEIS:

- **COOP/COEP são OBRIGATÓRIOS** na rota inteira do editor (mesmos headers da seção 5 — `features.professional` já liga `terminal:true`). Sem eles o WebContainer não inicia.
- **1 instância profissional por aba.** O WebContainer é singleton e o dev-server tem **uma** porta `server-ready` por vez; NÃO renderize dois `<Studio professional>` (nem a rota `/dual`) na mesma aba — eles disputam o mesmo container e a mesma porta.
- **COEP afeta a página toda**: imagens/iframes cross-origin do host precisam de CORP/CORS, senão quebram. Ligue o modo só na rota do editor.
- **O preview é cross-origin**: a URL vem do evento `server-ready` em runtime (porta dinâmica) — **não é configurável** pelo host. Exceções do app chegam ao Console via `preview-message`.
- **Boot + `npm install` são lentos na 1ª carga** (segundos). Trocar de projeto preserva `node_modules` (mesmo template = sem reinstalar); a UI mostra os estados `Iniciando / Instalando / Subindo o servidor`.
- **Persistência**: só o código-fonte é salvo (a árvore `tree`); `node_modules` **nunca** é persistido nem aceito no load (o sanitizer rebaixa para projeto básico qualquer árvore com `node_modules`).

Um único sincronizador (`ProWebContainerProvider`) escreve no FS do container; o Terminal em modo profissional só abre o shell sobre o FS já montado (dois escritores corromperiam os arquivos).
