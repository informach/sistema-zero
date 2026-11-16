import type { ModeloDeCatalogo } from '@sistemazero/molda-cenarios-core'
import { Group, type Texture } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { liberarObjeto } from '../mundo/carregar-ilha'
import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { prepararModeloDoPiloto } from '../mundo/faisca/preparar-modelo'

export interface ArteDeCenario {
  modelos: Map<string, GLTF>
  soltar(): void
}
/** Leitura limitada, autenticada pelo host e conferida pelo conteúdo. Não mantém cache global. */
export async function carregarArteDeCenario(
  catalogo: readonly ModeloDeCatalogo[],
  ids: ReadonlySet<string>,
  url: (m: ModeloDeCatalogo) => string,
  signal: AbortSignal,
): Promise<ArteDeCenario> {
  const modelos = new Map<string, GLTF>(),
    raiz = new Group(),
    loader = new GLTFLoader(),
    imagens = new Set<{ close?: () => void }>(),
    texturas = new Map<string, Texture>()
  let solto = false
  const soltar = () => {
    if (solto) return
    solto = true
    liberarObjeto(raiz)
    for (const i of imagens) i.close?.()
  }
  try {
    for (const m of catalogo) {
      if (!ids.has(m.id)) continue
      signal.throwIfAborted()
      const r = await fetch(url(m), { signal, credentials: 'same-origin' })
      if (!r.ok) throw Error(`Não foi possível carregar ${m.nome} (${r.status})`)
      if (Number(r.headers.get('content-length')) > 64 * 1024 * 1024)
        throw Error('Modelo acima do limite')
      const bytes = await r.arrayBuffer()
      if (bytes.byteLength !== m.bytes || bytes.byteLength > 64 * 1024 * 1024)
        throw Error(`Tamanho diferente do catálogo: ${m.nome}`)
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('')
      if (hash !== m.digest) throw Error(`Integridade inválida: ${m.nome}`)
      const g = await loader.parseAsync(bytes, '')
      g.scene.userData.digest = m.digest
      raiz.add(g.scene)
      modelos.set(m.id, g)
      const original = Object.values(ARTE_DA_FAISCA.pecas).find((p) => p.digest === m.digest)
      prepararModeloDoPiloto(
        g,
        { id: original?.id ?? m.id, imagens: m.imagens ?? original?.imagens },
        texturas,
        imagens,
      )
    }
    signal.throwIfAborted()
    return { modelos, soltar }
  } catch (e) {
    soltar()
    throw e
  }
}
