import { type Material, type Mesh, type Object3D, Texture } from 'three'

/** O exporter escolhe o encoder pelo mimeType da textura. Fontes WebP acabam
 * recomprimidas com perdas/metadados de cor; o pacote portátil usa PNG sem perdas.
 * A raiz aqui é a cópia já materializada. Só suas ligações temporárias mudam:
 * materiais, texturas e imagens do acervo permanecem intactos. */
export function prepararImagensDoGlb(raiz: Object3D) {
  const originais = new Map<Mesh, Material | Material[]>(),
    materiais = new Map<Material, Material>(),
    texturas = new Map<Texture, Texture>()
  let descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const [m, original] of originais) m.material = original
    for (const m of materiais.values()) m.dispose()
    for (const t of texturas.values()) t.dispose()
    originais.clear()
    materiais.clear()
    texturas.clear()
  }
  const preparar = (m: Material) => {
    const existente = materiais.get(m)
    if (existente) return existente
    const copia = m.clone()
    materiais.set(m, copia)
    for (const [chave, valor] of Object.entries(m))
      if (valor instanceof Texture) {
        let textura = texturas.get(valor)
        if (!textura) {
          textura = valor.clone()
          textura.userData = { ...valor.userData, mimeType: 'image/png' }
          texturas.set(valor, textura)
        }
        Reflect.set(copia, chave, textura)
      }
    return copia
  }
  try {
    raiz.traverseVisible((n) => {
      const m = n as Mesh
      if (!m.isMesh) return
      originais.set(m, m.material)
      m.material = Array.isArray(m.material) ? m.material.map(preparar) : preparar(m.material)
    })
    return { descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
