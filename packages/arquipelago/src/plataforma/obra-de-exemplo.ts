import type { Obra } from '@sistemazero/arquipelago-contracts'
import { LOTE_DA_CASA } from '../sistemas/construcao/lote'
import {
  esticarParede,
  porAbertura,
  type Resultado,
  tirarAbertura,
  trocarPiso,
} from '../sistemas/construcao/obra'
import { porObjeto } from '../sistemas/construcao/projeto-azul'

/**
 * Uma obra de exemplo para o playground (`?obra=exemplo`): a casa com um cômodo na frente do quarto
 * (com porta de fora, janela em arco e piso de ladrilho) e um à direita (com a porta nova saindo do
 * quarto, janela redonda e azulejo), a geladeira, a planta de interior e a casinha em projeto azul.
 * Montada pelas mesmas regras do modo Construir.
 */
export function obraDeExemplo(): Obra {
  const L = LOTE_DA_CASA
  let o: Obra = structuredClone(L.obraInicial)
  const passo = (r: Resultado) => {
    if (!r.ok) throw new Error(`obra de exemplo recusada: ${r.motivo}`)
    o = r.obra
  }
  // Na frente do quarto, à esquerda da varanda.
  passo(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
  passo(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
  passo(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
  passo(porAbertura(o, L, 'porta', { eixo: 'z', x: -1, z: 1 }))
  passo(porAbertura(o, L, 'janela-arco', { eixo: 'x', x: -5, z: 3 }))
  passo(trocarPiso(o, L, { x: -4, z: 1 }, 'ladrilho'))
  // À direita do quarto: a janela do lado vira a porta para o cômodo novo.
  passo(esticarParede(o, L, { x: 6, z: -6 }, { x: 8, z: -6 }))
  passo(esticarParede(o, L, { x: 8, z: -6 }, { x: 8, z: -2 }))
  passo(esticarParede(o, L, { x: 8, z: -2 }, { x: 6, z: -2 }))
  passo(tirarAbertura(o, { eixo: 'z', x: 6, z: -5 }))
  passo(porAbertura(o, L, 'porta', { eixo: 'z', x: 6, z: -4 }))
  passo(porAbertura(o, L, 'janela-redonda', { eixo: 'z', x: 8, z: -4 }))
  passo(trocarPiso(o, L, { x: 7, z: -4 }, 'azulejo'))
  // Os projetos azuis do exemplo: a geladeira no cômodo da frente, a planta no da direita e a
  // casinha no quintal.
  passo(porObjeto(o, L, PROJETOS_DE_EXEMPLO, 'geladeira', { x: -5, z: 2 }, 0))
  passo(porObjeto(o, L, PROJETOS_DE_EXEMPLO, 'planta-interior', { x: 7, z: -3 }, 0))
  passo(porObjeto(o, L, PROJETOS_DE_EXEMPLO, 'casinha', { x: -12, z: 6 }, 0))
  return o
}

const GANHO = { ganhoEm: '2026-10-28T12:00:00.000Z', aparencia: null }
/** Os projetos azuis que a obra de exemplo já ganhou (geladeira, planta e casinha). */
export const PROJETOS_DE_EXEMPLO = { geladeira: GANHO, 'planta-interior': GANHO, casinha: GANHO }
