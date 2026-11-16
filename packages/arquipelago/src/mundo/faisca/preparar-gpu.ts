import type { Camera, Material, Object3D, Scene, Texture, WebGLRenderer } from 'three'

/** Prepara as variantes reais da cena (instâncias, pele e luzes), antes de liberar a exploração. */
export async function prepararGpuDaFaisca(gl: WebGLRenderer, cena: Scene, camera: Camera) {
  const texturas = new Set<Texture>()
  cena.traverse((objeto: Object3D) => {
    const renderizavel = objeto as Object3D & {
      material?: Material | Material[]
      morphTexture?: Texture | null
    }
    if (renderizavel.morphTexture) texturas.add(renderizavel.morphTexture)
    const materiais = renderizavel.material
    for (const material of Array.isArray(materiais) ? materiais : materiais ? [materiais] : [])
      for (const valor of Object.values(material)) {
        const textura = valor as Texture | null
        if (textura?.isTexture) texturas.add(textura)
      }
  })
  for (const textura of texturas) gl.initTexture(textura)
  await gl.compileAsync(cena, camera)
}
