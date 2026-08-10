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

## 2b. Sons dos blocos (opcional, recomendado)

O Blockly toca um somzinho ao ENCAIXAR/DESCONECTAR/DESCARTAR bloco. Por padrão ele os baixaria de um servidor demo externo (`blockly-demo.appspot.com`), que a CSP dos apps bloqueia (spam no console). Por isso o studio injeta com `sounds:false` e **recarrega os sons a partir do PRÓPRIO app** (mesma origem, passa na CSP `media-src 'self'`).

Para o som funcionar, o consumer serve 3 arquivos em **`public/studio-sounds/`**:

```
public/studio-sounds/click.mp3       # copiados de node_modules/blockly/media/
public/studio-sounds/disconnect.mp3
public/studio-sounds/delete.mp3
```

Caminho fixo `/studio-sounds/` (ver `STUDIO_SOUNDS_PATH` no `BlocklyPanel.tsx`). App que NÃO sirva os arquivos simplesmente fica **sem som** (o 404 falha em silêncio, nada quebra). A CSP precisa de `media-src 'self'` (admin/community/community-kids já têm).

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
  onChange={(p, ctx) => salvarNoBackend(p, ctx)} // snapshot no autosave (1s) e em flushes; ctx?.reason: 'autosave' | 'flush'
  onSave={(p) => salvarAgora(p)}            // pós "Salvar" explícito; Promise rejeitada marca erro no badge
  features={{ terminal: false, ai: { provider: providerDoBff } }}
  allowedModes={['blocks', 'bridge']}       // esconde modos; modo salvo fora da lista cai no 1º permitido
  theme="dark"                              // sem a prop: toggle interno (Topbar) + Settings
  onExit={() => router.back()}
  ref={handleRef}                           // StudioHandle: getProject/save/replaceProject/setMode/isDirty
  className="h-[80vh]"                      // o Studio preenche 100% do container
/>
```

Props ESTÁTICAS por instância (trocar exige remount): `persistence`, `limits`, `locale`.

**Botões de saída do projeto** (controlados por `features`, default ON; o `<StudioLesson>` desliga
`export` e `download`): **Salvar** (persiste + dispara `onSave`), **Baixar** (`features.download`) gera um ZIP
de FONTE legível pra continuar no VSCode, e **Exportar** (`features.export`, no menu ⋯) gera o ZIP de deploy
(Railway). Os três são independentes; o autosave (IndexedDB, ~1s) é separado do Salvar.

**Adapters remotos e flush no fechamento:** `onChange` recebe um 2º argumento OPCIONAL `ctx?: { reason: 'autosave' | 'flush' }`. No fechamento da aba (pagehide/beforeunload), no unmount e no "Salvar" explícito o Studio emite com `reason: 'flush'` — e um `fetch` normal é ABORTADO pela navegação, perdendo a última edição. Para um backend remoto, use um transporte com keepalive no flush:

```tsx
onChange={(p, ctx) =>
  ctx?.reason === 'flush'
    ? navigator.sendBeacon('/api/projects', JSON.stringify(p))   // sobrevive ao fechamento
    : salvarNoBackend(p)                                          // autosave normal
}
```

A biblioteca não chama `sendBeacon` sozinha (endpoint/credenciais são do host). Hosts `persistence="local"` não precisam disso (o IndexedDB já ordena as escritas).

`<ProjectList onOpenProject={(id) => ...} />` — lista/gerência de projetos do IndexedDB local (por ora acoplada ao adapter local; hosts com backend devem listar pelos próprios dados). Tem **Exportar** (baixa o projeto inteiro como `*.szproject.json`) e **Importar** (lê o JSON e cria um projeto NOVO). O import saneia tudo pelas mesmas cotas do load e mostra **avisos** quando algo não cabe (imagens/extras/extensões fora da cota, ou blocos de uma versão mais nova) — o projeto importa mesmo assim, sem perder o resto em silêncio.

`prefetchStudioModes()` — aquece os chunks pesados (Blockly/Monaco) no hover do link que abre o editor.

## 5. Headers para o runtime local

O WebContainer exige cross-origin isolation no DOCUMENTO do host:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

No Next: `headers()` do next.config.ts. ⚠️ COEP afeta TODO recurso cross-origin da página (imagens/iframes precisam de CORS/CORP) — ligue só na rota do editor.

CSP, se o host usa uma: o terminal precisa de `script-src 'unsafe-eval' 'wasm-unsafe-eval' blob: https://*.webcontainer-api.io`, `connect-src https://*.webcontainer-api.io https://*.staticblitz.com`, `frame-src blob: https://*.webcontainer-api.io`; a IA (BYOK/host) precisa de `connect-src https://openrouter.ai`; o preview e os workers do Monaco precisam de `worker-src 'self' blob:` e `frame-src 'self' blob:`.

## 6. Limitações conhecidas

- Multi-instância funciona (stores por instância), MAS: o WebContainer é singleton por aba e o atalho de teclado da busca de blocos fica com a última instância montada. Como o container é singleton, apenas UMA instância (não-profissional) pode usar o Terminal por aba — uma segunda mostra "Terminal já está em uso em outra instância nesta aba" em vez de sobrescrever os arquivos da primeira (namespacing por instância sob `/sz-<id>/` é item de backlog).
- **Preview do editor é de MESMA THREAD:** o iframe `srcdoc` null-origin compartilha a thread principal do host. O guarda de laços corta loops síncronos instrumentados, mas trabalho síncrono pesado que NÃO é laço (`Array.from({length: 1e10})`, `JSON.parse` gigante, ReDoS, recursão profunda) congela a thread e o watchdog só DETECTA — não interrompe. No player público, configure `originAdapter` para navegar a uma origem/processo dedicado; o editor criativo continua local por compatibilidade.
- **O perfil `creative` mantém o canal residual de GET passivo:** ele libera `https:` em `img/media/font/frame-src` para o ambiente de criação. O `StudioProjectPlayer` usa `strict` por padrão e fecha esse canal; só reabra com `securityProfile="creative"` quando o conteúdo publicado realmente depender de recursos externos.
- **Tema do Monaco é GLOBAL por página** (consequência do namespace único do Monaco — há um só tema ativo via `monaco.editor.setTheme`). Duas instâncias simultâneas em Código/Ponte (ex.: rota `/dual`) acabam adotando o ÚLTIMO tema definido; não há isolamento de tema por instância no Monaco. O Blockly, ao contrário, aplica tema por workspace. (Os models, esses sim, são isolados por instância: o `path` é salgado com um id estável por instância.)
- Settings (tema via toggle, fonte do código, chave BYOK) são preferência do USUÁRIO, compartilhada entre instâncias e persistida em IndexedDB.
- O smoke obrigatório na primeira integração Next/Turbopack: modo Código (autocomplete = workers do Monaco) e modo Ponte (digitar HTML → blocos = worker de reverse-parse). Se o worker `.ts` relativo falhar no bundler do host, ver plano B no CLAUDE.md (factory injetável).

## 7. Modo Profissional (`features.professional`)

O projeto Pro trabalha somente em Código e pode usar dois runtimes. No Estúdio livre, o runtime local executa Vite dentro do WebContainer. Em aulas e no Admin, o host passa `proRuntime` e recebe o HTML já compilado por um executor remoto isolado.

```tsx
import { createProProject } from '@sistemazero/studio'

<Studio
  initialProject={createProProject(crypto.randomUUID(), 'Meu app', 'react-ts')}
  features={{ professional: true }}
  persistence="local"
/>
```

Templates disponíveis em `listProTemplates()`: `vanilla-js`, `vanilla-vite`, `react-ts`, `three-js` e `three-ts`. A `<ProjectList professional />` mostra o seletor no novo projeto.

Para uma aula ou painel sem cross-origin isolation:

```tsx
import type { StudioProRuntimeAdapter } from '@sistemazero/studio'

const proRuntime: StudioProRuntimeAdapter = {
  async build({ project, signal }) {
    const response = await fetch('/api/studio/pro-runtime/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
      signal,
    })
    if (!response.ok) throw new Error('Não foi possível compilar o projeto.')
    return response.json()
  },
}

<StudioLesson
  initialProject={proProject}
  features={{ professional: true, terminal: false }}
  proRuntime={proRuntime}
/>
```

Regras do runtime local:

- **COOP/COEP são obrigatórios** na rota inteira do editor. `features.professional` liga o terminal por padrão, mas o host pode passar `terminal:false` quando fornece `proRuntime`.
- **1 instância profissional por aba.** O WebContainer é singleton e o dev-server tem **uma** porta `server-ready` por vez; NÃO renderize dois `<Studio professional>` (nem a rota `/dual`) na mesma aba — eles disputam o mesmo container e a mesma porta.
- **COEP afeta a página toda**: imagens/iframes cross-origin do host precisam de CORP/CORS, senão quebram. Ligue o modo só na rota do editor.
- **O preview é cross-origin**: a URL vem do evento `server-ready` em runtime (porta dinâmica) — **não é configurável** pelo host. Exceções do app chegam ao Console via `preview-message`.
- **Boot + `npm install` são lentos na 1ª carga** (segundos). Trocar de projeto preserva `node_modules` (mesmo template = sem reinstalar); a UI mostra os estados `Iniciando / Instalando / Subindo o servidor`.
- **Persistência**: só o código-fonte é salvo (a árvore `tree`); `node_modules` **nunca** é persistido nem aceito no load (o sanitizer rebaixa para projeto básico qualquer árvore com `node_modules`).

Um único sincronizador (`ProWebContainerProvider`) escreve no FS do container; o Terminal em modo profissional só abre o shell sobre o FS já montado (dois escritores corromperiam os arquivos).

No runtime remoto, a autenticação, a autorização da aula e a escolha confiável do template pertencem ao BFF. O navegador não recebe o token do executor. O contrato do Studio aceita apenas `{ html, output?, durationMs? }`; limites, dependências e isolamento são responsabilidade do serviço remoto.

## 8. Compartilhar (Mural) + player público

Botão **"Compartilhar"** na Topbar (ao lado do Salvar) que publica o projeto e gera um link público de jogar. **Opt-in**: só aparece quando o host passa a prop `share`. O Studio só ORQUESTRA a UX (confirmação, descrição editável, print via `captureCoverFromProject`); a rede/IA-de-servidor/storage vive 100% no host, atrás de duas funções do adapter.

```tsx
import type { StudioShareAdapter } from '@sistemazero/studio'

const share: StudioShareAdapter = {
  // Rascunho curto da descrição (SERVIDOR — nunca a BYOK do aluno). Pode voltar vazio/rejeitar:
  // o dialog cai no modo "escreva você mesmo", sem travar a publicação.
  async generateDescription({ project, title }) {
    const r = await fetch('/api/studio/describe', { method: 'POST', /* ...3 arquivos + título */ })
    return (await r.json()).description ?? ''
  },
  // Publica e devolve os links mostrados na tela de sucesso.
  async publish({ project, coverDataUrl, title, description }) {
    // ...sobe o print + o projeto, cria o post... 
    return { muralUrl: '/mural?thread=…', playUrl: '/jogar/…' }
  },
}

<Studio initialProject={project} share={share} />
```

O que foi publicado é um **SNAPSHOT imutável e INDEPENDENTE**: a criança continua editando o projeto no editor e a versão publicada NÃO muda (republicar gera um post novo). O dialog avisa isso no passo de confirmação.
Hosts que servem link público devem persistir um `Project` normalizado; o player é defensivo para
snapshots legados (ex.: arrays opcionais ausentes), mas o publish deve preferir o contrato completo.

**Player público** (página de jogar SEM login, fora do editor): use o subpath LEVE `@sistemazero/studio/player` (só a cadeia de preview — sem Monaco/Blockly):

```tsx
import { StudioProjectPlayer } from '@sistemazero/studio/player' // dynamic ssr:false

<StudioProjectPlayer project={projetoBuscadoDoServidor} />       // roda SÓ o jogo, autostart
```

O player público usa `securityProfile="strict"` por padrão: imagens, fontes, mídia, CSS e iframes
remotos ficam bloqueados, além de fetch/XHR. Projetos públicos que dependam deliberadamente de
recursos externos podem optar por `securityProfile="creative"`.

Para isolar também CPU/processo, o host pode publicar o documento numa origem dedicada:

```tsx
const originAdapter = {
  async createPreviewUrl({ document, signal }) {
    const response = await fetch('/api/preview-runs', { method: 'POST', body: document, signal })
    if (!response.ok) throw new Error('Falha ao criar preview isolado')
    return (await response.json()).url // URL HTTP(S) em OUTRA origem
  },
  releasePreviewUrl(url) {
    void fetch('/api/preview-runs', { method: 'DELETE', body: JSON.stringify({ url }) })
  },
}

<StudioProjectPlayer project={projeto} originAdapter={originAdapter} />
```

Com o adaptador, o iframe usa `src`; sem ele, preserva o `srcDoc` de origem opaca. URLs de mesma
origem, `data:` e `blob:` são recusadas pelo contrato.

Também exportado no index principal (`StudioProjectPlayer` + a função assíncrona pura
`renderProjectToPreviewDocAsync(project): Promise<string>`, caso o host queira montar o srcdoc por
conta própria):

```ts
import { renderProjectToPreviewDocAsync } from '@sistemazero/studio'

const srcDoc = await renderProjectToPreviewDocAsync(project)
```

**Migração:** a montagem passou a ser assíncrona porque runtimes oficiais são chunks lazy. O nome antigo
`renderProjectToPreviewDoc` continua como alias depreciado que também devolve `Promise<string>`; código
que antes passava o retorno diretamente para `srcDoc` precisa usar `await` e preferir o nome `Async`.
A função tolera `files` ausente e `installedExtensions`/`extraFiles`/`assets` não-array, usando defaults
vazios para não quebrar páginas públicas antigas. O iframe usa
`sandbox="allow-scripts allow-modals allow-pointer-lock"`, `allow="fullscreen"`, e a CSP/guards viajam
dentro do doc. Sem adaptador, o host precisa permitir o iframe local; com adaptador, `frame-src` da
CSP do host deve listar somente a origem dedicada de preview.
