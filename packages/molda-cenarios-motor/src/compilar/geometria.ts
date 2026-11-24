import {
  dividirMalhaParaExportacao,
  LIMITES_DA_EXPORTACAO,
} from '@sistemazero/molda-cenarios-core/compilar'
import { BufferAttribute, BufferGeometry, type Matrix4 } from 'three'
import { lerParteEstatica } from '../curvas/parte-estatica'
import type { ParteDoModelo } from '../modelos'

/** Preflight compartilhado antes de copiar fontes estáticas. */
export function conferirGeometriaEstatica(original: BufferGeometry) {
  if (
    Object.values(original.morphAttributes).some((a) => a?.length) ||
    original.hasAttribute('skinIndex') ||
    original.hasAttribute('skinWeight')
  )
    throw Error('Geometria animável ou com morphs não pode ser assada implicitamente.')
  const atributos = Object.values(original.attributes)
  const bytes =
    atributos.reduce((s, a) => s + a.count * a.itemSize * 4, 0) + (original.index?.count ?? 0) * 4
  if (
    !Number.isSafeInteger(bytes) ||
    bytes > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte ||
    atributos.length > LIMITES_DA_EXPORTACAO.malha.atributos
  )
    throw Error('A geometria excede o orçamento de leitura da compilação.')
}

/** Materialização numérica estática. Atores/skins seguem o caminho animável. */
export function dividirParteEstatica(
  parte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  mundo: Matrix4,
  orcamentoBytes: number = LIMITES_DA_EXPORTACAO.malha.bytesDaSaida,
): BufferGeometry[] {
  conferirGeometriaEstatica(parte.geometria)
  const leitura = lerParteEstatica(parte, mundo),
    saida: BufferGeometry[] = []
  try {
    for (const dados of dividirMalhaParaExportacao(leitura.malha, 65_000, orcamentoBytes)) {
      const g = new BufferGeometry()
      saida.push(g)
      for (const [nome, a] of Object.entries(dados.atributos))
        g.setAttribute(nome, new BufferAttribute(a.valores, a.itemSize))
      g.setIndex(new BufferAttribute(dados.indices, 1))
      g.computeBoundingBox()
      g.computeBoundingSphere()
    }
    return saida
  } catch (erro) {
    for (const g of saida) g.dispose()
    throw erro
  } finally {
    leitura.descartar()
  }
}
