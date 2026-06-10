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
- Settings (tema via toggle, fonte do código, chave BYOK) são preferência do USUÁRIO, compartilhada entre instâncias e persistida em IndexedDB.
- O smoke obrigatório na primeira integração Next/Turbopack: modo Código (autocomplete = workers do Monaco) e modo Ponte (digitar HTML → blocos = worker de reverse-parse). Se o worker `.ts` relativo falhar no bundler do host, ver plano B no CLAUDE.md (factory injetável).
