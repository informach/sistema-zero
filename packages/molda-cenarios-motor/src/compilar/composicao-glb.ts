import { type AnimationClip, type Object3D, Scene } from 'three'
import { normalizarRaizAnimavel, temAnimacaoOuDeformacao } from './raiz-animavel'

/** Só a pele/morphs exigem a normalização de partes. Instâncias estáticas
 * conservam geometria e materiais compartilhados; nenhum recurso da fonte é descartado. */
export function prepararComposicaoDoGlb(
  ramos: readonly { raiz: Object3D; animacoes: readonly AnimationClip[] }[],
) {
  const raiz = new Scene(),
    animacoes: AnimationClip[] = [],
    normalizadas: ReturnType<typeof normalizarRaizAnimavel>[] = []
  const descartar = () => {
    for (const n of normalizadas) n.descartar()
    normalizadas.length = 0
    raiz.clear()
  }
  try {
    for (const ramo of ramos) {
      if (!temAnimacaoOuDeformacao(ramo.raiz, ramo.animacoes)) {
        raiz.add(ramo.raiz.clone(true))
        continue
      }
      const n = normalizarRaizAnimavel(ramo.raiz, ramo.animacoes)
      normalizadas.push(n)
      // glTF ignora transformações dos pais de malhas com skin. O normalizador
      // já as coloca na raiz: não acrescentar outro grupo ao redor delas.
      raiz.add(...[...n.raiz.children])
      animacoes.push(...n.animacoes)
    }
    raiz.updateMatrixWorld(true)
    return { raiz, animacoes, descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
