import { type Material, type Mesh, MeshStandardMaterial, type Texture } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
/** Acabamento e deduplicação compartilhados pelo jogo e pelo editor. */
export function prepararModeloDoPiloto(
  gltf: GLTF,
  meta: { id: string; imagens?: readonly string[] },
  texturas: Map<string, Texture>,
  imagens: Set<{ close?: () => void }>,
) {
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
        const hash = source === undefined ? undefined : meta.imagens?.[source]
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
