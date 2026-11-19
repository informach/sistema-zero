import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import { Box3, BufferGeometry, Group, Matrix4, Mesh, MeshBasicMaterial } from 'three'
import type { FonteDeColisao } from '../teste/colisoes'
import type { ArquivosDaCompilacao } from './arquivos'
import { gravarGlbCompilado } from './arquivos-glb'
import { conferirGeometriaEstatica, dividirParteEstatica } from './geometria'

/** Serializa a mesma malha física, sem texturas/decoração. Fontes permanecem sob
 * seus donos; a matriz externa continua no manifesto para cada instância. */
export async function gravarColisaoLocal(
  fontes: readonly FonteDeColisao[],
  caminho: string,
  arquivos: ArquivosDaCompilacao,
  sinal: AbortSignal,
) {
  sinal.throwIfAborted()
  const raiz = new Group(),
    geometrias = new Set<BufferGeometry>(),
    material = new MeshBasicMaterial()
  raiz.name = 'colisor'
  material.name = 'colisao'
  let bytes = 0,
    numero = 0
  try {
    for (const f of fontes) {
      conferirGeometriaEstatica(f.geometria)
      if (!f.geometria.getAttribute('position')?.count || f.geometria.drawRange.count === 0)
        continue
      const minima = new BufferGeometry().setAttribute(
        'position',
        f.geometria.getAttribute('position').clone(),
      )
      if (f.geometria.index) minima.setIndex(f.geometria.index.clone())
      minima.setDrawRange(f.geometria.drawRange.start, f.geometria.drawRange.count)
      try {
        for (const g of dividirParteEstatica(
          { geometria: minima, matriz: f.matriz },
          new Matrix4(),
          LIMITES_DA_EXPORTACAO.malha.bytesDaSaida - bytes,
        )) {
          geometrias.add(g)
          bytes +=
            Object.values(g.attributes).reduce((s, a) => s + a.count * a.itemSize * 4, 0) +
            (g.index?.array.byteLength ?? 0)
          const m = new Mesh(g, material)
          m.name = `parte_${numero++}`
          raiz.add(m)
        }
      } finally {
        minima.dispose()
      }
      sinal.throwIfAborted()
    }
    if (!raiz.children.length) return null
    const volume = new Box3().setFromObject(raiz),
      arquivo = await gravarGlbCompilado(raiz, caminho, 'colisao', arquivos, sinal)
    return { arquivo, volume }
  } finally {
    for (const g of geometrias) g.dispose()
    material.dispose()
    raiz.clear()
  }
}
