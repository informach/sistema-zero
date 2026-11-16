import { Group, type Material, type Mesh, MeshStandardMaterial, type Texture } from 'three'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { liberarObjeto } from '../carregar-ilha'
import { ARTE_DA_FAISCA } from './arte.generated'

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
      gltf.scene.traverse((obj) => {
        const mesh = obj as Mesh
        if (!mesh.isMesh) return
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (
            mat instanceof MeshStandardMaterial &&
            ['faisca_madeira_violeta', 'faisca_pedra_natural'].includes(mat.name)
          ) {
            const madeira = mat.name === 'faisca_madeira_violeta'
            mat.emissive.set(0)
            mat.roughness = madeira ? 0.82 : 1
            mat.onBeforeCompile = (s) => {
              s.fragmentShader = s.fragmentShader.replace(
                '#include <map_fragment>',
                `#include <map_fragment>\nfloat valorFaisca = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb = ${madeira ? 'mix(vec3(0.12,0.035,0.20),vec3(0.43,0.23,0.58),clamp(valorFaisca*1.8,0.0,1.0))' : 'vec3(0.72,0.73,0.68)*clamp(valorFaisca*1.5+0.12,0.0,1.0)'};`,
              )
            }
            mat.customProgramCacheKey = () =>
              madeira ? 'faisca-madeira-violeta-1' : 'faisca-pedra-natural-1'
          }
          if (meta.id === 'praca_terra_14x14' && mat instanceof MeshStandardMaterial) {
            mat.emissive.set(0)
            mat.roughness = 1
            mat.onBeforeCompile = (s) => {
              s.fragmentShader = s.fragmentShader.replace(
                '#include <map_fragment>',
                '#include <map_fragment>\nfloat terraFaisca=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=mix(vec3(0.10,0.06,0.03),vec3(0.32,0.22,0.11),clamp(terraFaisca*1.4,0.0,1.0));',
              )
            }
            mat.customProgramCacheKey = () => 'faisca-terra-cultivada-1'
          }
          const material = mat as Material & Record<string, unknown>
          for (const [prop, valor] of Object.entries(material)) {
            const tex = valor as Texture | undefined
            if (!tex?.isTexture) continue
            if (tex.image && typeof tex.image === 'object')
              imagens.add(tex.image as { close?: () => void })
            const indice = gltf.parser.associations.get(tex)?.textures
            const def = indice === undefined ? undefined : gltf.parser.json.textures[indice]
            const source = def?.source ?? def?.extensions?.EXT_texture_webp?.source
            const hash = source === undefined ? undefined : meta.imagens[source]
            if (!hash) continue
            const chave = [
              hash,
              tex.colorSpace,
              tex.minFilter,
              tex.magFilter,
              tex.anisotropy,
              tex.flipY,
              tex.channel,
              tex.wrapS,
              tex.wrapT,
              tex.repeat.toArray(),
              tex.offset.toArray(),
              tex.center.toArray(),
              tex.rotation,
            ].join(':')
            const existente = texturas.get(chave)
            if (existente && existente !== tex) {
              material[prop] = existente
              tex.dispose()
            } else texturas.set(chave, tex)
          }
        }
      })
    }
    if (signal.aborted) throw Error('Carga da Faísca cancelada')
    return { modelos, soltar }
  } catch (e) {
    soltar()
    throw e
  }
}
