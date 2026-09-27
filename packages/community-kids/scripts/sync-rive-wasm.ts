/**
 * Copia o WASM do runtime do Rive (mascote Zappy animado) para `public/rive/`.
 *
 * ⚠️ POR QUE ISTO EXISTE: por padrão o `@rive-app/canvas` baixa o `.wasm` de
 * `https://unpkg.com/@rive-app/canvas@<versão>/rive.wasm` (com fallback no
 * jsdelivr) — ou seja, a criança buscaria CÓDIGO EXECUTÁVEL num host de
 * terceiro, no caminho de render, toda vez. Numa área infantil isso não passa:
 * servimos o binário da nossa própria origem e DESLIGAMOS o fallback de CDN
 * (ver `mascot-rive-canvas.tsx`).
 *
 * O arquivo é DERIVADO (fica no .gitignore): roda no `dev` e no `build`, então
 * nunca desencontra da versão do pacote — atualizou o `@rive-app/react-canvas`,
 * o próximo boot já copia o WASM novo. `tests/rive-wasm-sync.test.ts` trava o
 * caminho de origem, que é a peça que quebraria em silêncio se o pacote mudasse
 * o layout dele (aí o mascote animado cairia no fallback WebP, sem erro nenhum).
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// `@rive-app/canvas` é dep TRANSITIVA (quem declaramos é o `react-canvas`), e o
// install isolado do bun não a hasteia para o `node_modules` do kids. Por isso a
// resolução parte do react-canvas, mesmo precedente do `three` no next.config.ts.
const requireDaqui = createRequire(`${import.meta.dir}/../package.json`)
const raizReact = path.dirname(requireDaqui.resolve('@rive-app/react-canvas/package.json'))
const requireDoReact = createRequire(`${raizReact}/package.json`)

/** Origem: o `rive.wasm` que veio com a versão instalada do runtime. */
export const ORIGEM = path.join(
  path.dirname(requireDoReact.resolve('@rive-app/canvas/package.json')),
  'rive.wasm',
)
/** Destino servido pelo Next. O `mascot-rive-canvas` aponta o loader para cá. */
export const PASTA_DESTINO = path.join(import.meta.dir, '..', 'public', 'rive')
export const DESTINO = path.join(PASTA_DESTINO, 'rive.wasm')

export function sincroniza(): { copiou: boolean; bytes: number } {
  const bytes = statSync(ORIGEM).size
  // Mesmo tamanho = mesma build do pacote; copiar 1,8 MB a cada `next dev` é desperdício.
  if (existsSync(DESTINO) && statSync(DESTINO).size === bytes) return { copiou: false, bytes }
  mkdirSync(PASTA_DESTINO, { recursive: true })
  copyFileSync(ORIGEM, DESTINO)
  return { copiou: true, bytes }
}

if (import.meta.main) {
  const { copiou, bytes } = sincroniza()
  console.log(
    `[rive] ${copiou ? 'copiado' : 'já em dia'}: public/rive/rive.wasm (${Math.round(bytes / 1024)} KB)`,
  )
}
