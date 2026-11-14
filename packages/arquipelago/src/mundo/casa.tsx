import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { Suspense } from 'react'
import { useJogo } from '../estado/contexto'
import { casaMoradaStore } from '../estado/morada'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, CENTRO_DA_CASA, PORTA } from './medidas'
import { GanharProjetos } from './objetos-da-casa'

/** Portal de transição: o lote Morada tem física nativa, sem ampliar suas portas para o mundo antigo. */
export function Casa() {
  const { loja, plataforma } = useJogo()
  const x = CENTRO_DA_CASA.x + PORTA.x
  const z = CENTRO_DA_CASA.z + 5
  useInterativo('porta-da-casa', {
    x,
    z,
    raio: 3,
    rotulo: () => 'Entrar na sua casa',
    agir: () => {
      loja.getState().mudar((s) => ({ ...s, casa: { ...s.casa, portaNova: true } }))
      void casaMoradaStore(loja, plataforma).getState().enter()
    },
  })
  return (
    <>
      <Suspense fallback={null}>
        <MoradaPieceView
          instance={{
            id: 'portal-casa',
            pieceId: 'construcao/arco_2m',
            position: [x - 1, ALTURA_DA_TERRA, z],
            rotation: 0,
          }}
        />
      </Suspense>
      <GanharProjetos />
    </>
  )
}
