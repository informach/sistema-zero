import { Group, type Texture } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { liberarObjeto } from '../carregar-ilha'
import { ARTE_DA_FAISCA } from './arte.generated'
import { prepararModeloDoPiloto } from './preparar-modelo'

export interface ArteDoPiloto {
  modelos: Map<string, GLTF>
  soltar(): void
}
/** Um lote pequeno, com texturas deduplicadas e sem cache global que impeça descarregar. */
export async function carregarPiloto(
  signal: AbortSignal,
  selecao: readonly string[],
): Promise<ArteDoPiloto> {
  const modelos = new Map<string, GLTF>(),
    raiz = new Group(),
    loader = new GLTFLoader()
  const imagens = new Set<{ close?: () => void }>(),
    texturas = new Map<string, Texture>()
  let solto = false
  const soltar = () => {
    if (solto) return
    solto = true
    liberarObjeto(raiz)
    for (const img of imagens) img.close?.()
  }
  try {
    // Sequencial para limitar os picos de decodificação e memória na entrada.
    for (const meta of Object.values(ARTE_DA_FAISCA.pecas)) {
      if (!selecao.includes(meta.id)) continue
      if (signal.aborted) throw Error('Carga da Faísca cancelada')
      const response = await fetch(`/api/faisca3d/${meta.arquivo}`, { signal })
      if (!response.ok)
        throw Error(`Não foi possível carregar ${meta.rotulo} (${response.status}).`)
      const bytes = await response.arrayBuffer()
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('')
      if (digest !== meta.digest) throw Error(`Arquivo diferente do manifesto: ${meta.rotulo}`)
      const gltf = await loader.parseAsync(bytes, '')
      raiz.add(gltf.scene)
      modelos.set(meta.id, gltf)
      prepararModeloDoPiloto(gltf, meta, texturas, imagens)
    }
    if (signal.aborted) throw Error('Carga da Faísca cancelada')
    return { modelos, soltar }
  } catch (e) {
    soltar()
    throw e
  }
}
