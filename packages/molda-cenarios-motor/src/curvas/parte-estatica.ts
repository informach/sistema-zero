import type { MalhaParaRecorte } from '@sistemazero/molda-cenarios-core/geometria'
import { Matrix4 } from 'three'
import { transformarGeometriaEstatica } from '../geometria-instanciada'
import type { ParteDoModelo } from '../modelos'

/** Leitura única de nó/drawRange, com buffers próprios; materiais continuam no acervo. */
export function lerParteEstatica(
  parte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  mundo: Matrix4,
) {
  const geometria = transformarGeometriaEstatica(
    parte.geometria,
    new Matrix4().multiplyMatrices(mundo, parte.matriz),
  )
  try {
    const posicao = geometria.getAttribute('position'),
      quantidade = geometria.index?.count ?? posicao.count,
      inicio = geometria.drawRange.start,
      numero = geometria.drawRange.count,
      fim = numero === Infinity ? quantidade : inicio + numero
    if (
      !Number.isSafeInteger(inicio) ||
      inicio < 0 ||
      inicio % 3 ||
      !Number.isSafeInteger(fim) ||
      fim > quantidade ||
      fim < inicio ||
      (fim - inicio) % 3
    )
      throw Error('O intervalo de desenho da parte do modelo é inválido.')
    if (!geometria.hasAttribute('normal')) geometria.computeVertexNormals()
    const atributos = Object.fromEntries(
        Object.entries(geometria.attributes).map(([nome, a]) => [
          nome,
          { itemSize: a.itemSize, valores: a.array },
        ]),
      ),
      indices = geometria.index
        ? geometria.index.array.slice(inicio, fim)
        : Uint32Array.from({ length: fim - inicio }, (_, i) => i + inicio),
      malha: MalhaParaRecorte = { atributos, indices }
    return { malha, descartar: () => geometria.dispose() }
  } catch (erro) {
    geometria.dispose()
    throw erro
  }
}
