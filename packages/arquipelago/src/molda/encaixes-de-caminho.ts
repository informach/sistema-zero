import type { EncaixeDeModeloDeCaminho, ModeloDoCenario } from '@sistemazero/molda-cenarios-core/v2'

/** Curadoria do adaptador; o motor não conhece nomes nem regras específicas da Faísca.
 * Lajes do Templo: eixo X, base Y=0 e centro de circulação Z=0, conferidos no GLB/catálogo.
 * Não usa a célula nominal de 7 m como tamanho da malha: o motor mede o volume carregado.
 */
const ENCAIXES: Readonly<Record<string, EncaixeDeModeloDeCaminho>> = {
  '65f405847e5ff3b19d6470afbd4ff5da843f61c9c3360a6b5b04e506bb7bae0f': {
    eixo: 'x',
    baseLocal: 0,
    centroTransversalLocal: 0,
  },
}

export function encaixeDoCaminhoImportado(modelo: Pick<ModeloDoCenario, 'digest'>) {
  const encaixe = ENCAIXES[modelo.digest]
  return encaixe ? structuredClone(encaixe) : undefined
}
