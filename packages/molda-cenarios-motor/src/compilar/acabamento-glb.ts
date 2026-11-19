import { type BufferGeometry, type Material, type Mesh, type Object3D, Texture } from 'three'

/** O exporter escolhe o encoder pelo mimeType da textura. Fontes WebP acabam
 * recomprimidas com perdas/metadados de cor; o pacote portátil usa PNG sem perdas.
 * A raiz aqui é a cópia já materializada. Só suas ligações temporárias mudam:
 * materiais, texturas e imagens do acervo permanecem intactos. */
export function prepararAcabamentoDoGlb(raiz: Object3D) {
  const originais = new Map<Mesh, Material | Material[]>(),
    materiais = new Map<Material, Material>(),
    texturas = new Map<Texture, Texture>(),
    geometriasOriginais = new Map<Mesh, BufferGeometry>(),
    geometrias = new Map<BufferGeometry, BufferGeometry>()
  let descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const [m, original] of originais) m.material = original
    for (const [m, g] of geometriasOriginais) m.geometry = g
    for (const m of materiais.values()) m.dispose()
    for (const t of texturas.values()) t.dispose()
    for (const g of geometrias.values()) g.dispose()
    originais.clear()
    materiais.clear()
    texturas.clear()
    geometriasOriginais.clear()
    geometrias.clear()
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
      const lista = Array.isArray(m.material) ? m.material : [m.material],
        planos = lista.map((m) => 'flatShading' in m && m.flatShading === true)
      if (planos.some(Boolean) && !planos.every(Boolean))
        throw Error('Separe materiais lisos e facetados antes de gravar o GLB.')
      if (planos.every(Boolean) && m.geometry.morphAttributes.normal?.length)
        throw Error('Prepare os morphs de normal do modelo facetado antes de exportar para glTF.')
      if (
        planos.every(Boolean) &&
        (m.geometry.hasAttribute('normal') ||
          m.geometry.hasAttribute('tangent') ||
          m.geometry.morphAttributes.normal?.length)
      ) {
        const original = m.geometry
        let g = geometrias.get(original)
        if (!g) {
          g = original.clone()
          // Sem NORMAL o glTF pede normais por face. Não expandir a malha nem
          // exportar normais suavizadas que o shader flat da fonte ignorava.
          g.deleteAttribute('normal')
          g.deleteAttribute('tangent')
          geometrias.set(original, g)
        }
        geometriasOriginais.set(m, original)
        m.geometry = g
      }
    })
    return { descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
