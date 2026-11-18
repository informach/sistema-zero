import type { CamadaDeSolo } from '@sistemazero/molda-cenarios-core/v2'
import { Color, DataTexture, MeshStandardMaterial, RGBAFormat, type Texture } from 'three'

/** Material pronto da ferramenta: pesos interpolados, texturas em metros e iluminação padrão. */
export class MaterialDoSolo {
  readonly material = new MeshStandardMaterial({ roughness: 1, metalness: 0 })
  private readonly branco = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat)
  private readonly mapas: { value: Texture }[]
  private descartado = false
  constructor(private readonly camadas: readonly CamadaDeSolo[]) {
    if (!camadas.length || camadas.length > 8)
      throw new Error('O solo precisa de uma a oito camadas')
    this.branco.needsUpdate = true
    this.mapas = camadas.map(() => ({ value: this.branco }))
    const vertex =
      'attribute vec4 mcnPesosA;\nattribute vec4 mcnPesosB;\nvarying vec4 vMcnPesosA;\nvarying vec4 vMcnPesosB;\nvarying vec2 vMcnChao;\n'
    const fragment =
      'varying vec4 vMcnPesosA;\nvarying vec4 vMcnPesosB;\nvarying vec2 vMcnChao;\n' +
      camadas
        .map(
          (_, i) =>
            `uniform sampler2D mcnSolo${i};\nuniform vec3 mcnCor${i};\nuniform float mcnMetros${i};`,
        )
        .join('\n')
    const misturar =
      'vec3 mcnSolo = vec3(0.0);\n' +
      camadas
        .map((_, i) => {
          const peso = `vMcnPesos${i < 4 ? 'A' : 'B'}.${['x', 'y', 'z', 'w'][i % 4]}`
          return `mcnSolo += ${peso} * mcnCor${i} * texture2D(mcnSolo${i}, vMcnChao / mcnMetros${i}).rgb;`
        })
        .join('\n') +
      '\ndiffuseColor.rgb *= mcnSolo;'
    this.material.onBeforeCompile = (shader) => {
      for (const [i, camada] of camadas.entries()) {
        shader.uniforms[`mcnSolo${i}`] = this.mapas[i]!
        shader.uniforms[`mcnCor${i}`] = { value: new Color(camada.cor) }
        shader.uniforms[`mcnMetros${i}`] = { value: camada.textura?.repeticaoMetros ?? 2 }
      }
      shader.vertexShader =
        vertex +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvMcnPesosA = mcnPesosA;\nvMcnPesosB = mcnPesosB;\nvMcnChao = (modelMatrix * vec4(position, 1.0)).xz;',
        )
      shader.fragmentShader = `${fragment}\n${shader.fragmentShader.replace('#include <map_fragment>', misturar)}`
    }
    this.material.customProgramCacheKey = () => `mcn-solo-v1-${camadas.length}`
  }
  definirTexturas(obter: (id: string) => Texture | undefined) {
    if (this.descartado) return
    for (const [i, camada] of this.camadas.entries())
      this.mapas[i]!.value = camada.textura
        ? (obter(camada.textura.id) ?? this.branco)
        : this.branco
  }
  descartar() {
    if (this.descartado) return
    this.descartado = true
    this.material.dispose()
    this.branco.dispose()
    // As imagens reais pertencem ao cache por digest do palco, nunca a cada peça.
    for (const mapa of this.mapas) mapa.value = this.branco
  }
}
