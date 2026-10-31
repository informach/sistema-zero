import {
  type Obra,
  type ObraEstendida,
  obraEstendidaVazia,
} from '@sistemazero/arquipelago-contracts'
import { andarDaObra, loteDeCima, obraDeCima, porEscada } from '../sistemas/construcao/andar'
import { LOTE_DA_CASA } from '../sistemas/construcao/lote'
import { porMovel } from '../sistemas/construcao/moveis'
import {
  esticarParede,
  moverEntrada,
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

/**
 * A obra de exemplo com um cômodo atrás do quarto (x 1 a 6, z -12 a -8), ligado a ele por uma porta
 * no fundo (`?obra=fundo`): para conferir o fundo do quarto desenhado pelo kit e a porta nele.
 */
export function obraDeExemploComFundo(): Obra {
  const L = LOTE_DA_CASA
  let o = obraDeExemplo()
  const passo = (r: Resultado) => {
    if (!r.ok) throw new Error(`obra de exemplo recusada: ${r.motivo}`)
    o = r.obra
  }
  passo(esticarParede(o, L, { x: 1, z: -8 }, { x: 1, z: -12 }))
  passo(esticarParede(o, L, { x: 1, z: -12 }, { x: 6, z: -12 }))
  passo(esticarParede(o, L, { x: 6, z: -12 }, { x: 6, z: -8 }))
  passo(porAbertura(o, L, 'porta', { eixo: 'x', x: 3, z: -8 }))
  passo(porAbertura(o, L, 'janela-grande', { eixo: 'x', x: 3, z: -12 }))
  passo(trocarPiso(o, L, { x: 3, z: -10 }, 'ladrilho'))
  return o
}

/**
 * A obra de exemplo com a porta de entrada na frente do cômodo da frente do quarto (`?obra=entrada`,
 * 31/10/2026): a porta e a varanda vão para a parede de fora do cômodo (a janela em arco vira porta),
 * e a frente do quarto fica inteira, sem porta.
 */
export function obraDeExemploComEntrada(): Obra {
  const r = moverEntrada(obraDeExemplo(), LOTE_DA_CASA, { eixo: 'x', x: -4, z: 3 })
  if (!r.ok) throw new Error(`obra de exemplo recusada: ${r.motivo}`)
  return r.obra
}

/**
 * A obra de exemplo com uma sala à esquerda do quarto (x -12 a -6, z -8 a 0), ligada a ele por uma
 * porta (`?obra=andar`, E04): cabe a escada do andar de cima (`OBRA_ESTENDIDA_DE_EXEMPLO`).
 */
export function obraDeExemploComAndar(): Obra {
  const L = LOTE_DA_CASA
  let o = obraDeExemplo()
  const passo = (r: Resultado) => {
    if (!r.ok) throw new Error(`obra de exemplo recusada: ${r.motivo}`)
    o = r.obra
  }
  passo(esticarParede(o, L, { x: -12, z: -8 }, { x: -12, z: 0 }))
  passo(esticarParede(o, L, { x: -12, z: -8 }, { x: -6, z: -8 }))
  passo(esticarParede(o, L, { x: -12, z: 0 }, { x: -6, z: 0 }))
  passo(porAbertura(o, L, 'porta', { eixo: 'z', x: -6, z: -4 }))
  passo(porAbertura(o, L, 'janela-grande', { eixo: 'z', x: -12, z: -6 }))
  return o
}

/**
 * O andar de cima e o terreno do exemplo (`?obra=andar`): a escada na sala, subindo para o fundo,
 * dois cômodos em cima do quarto com a porta entre eles e janelas (no da direita, uma poltrona), o
 * resto do piso aberto com o guarda-corpo; um morrinho no quintal (de meio metro a 1,5 m).
 */
export function obraEstendidaDeExemplo(): ObraEstendida {
  const obra = obraDeExemploComAndar()
  const r = porEscada(null, obra, LOTE_DA_CASA, { x: -10, z: -2 }, 0)
  if (!r.ok) throw new Error(`escada de exemplo recusada: ${r.motivo}`)
  const lote = loteDeCima(LOTE_DA_CASA)
  let cima = obraDeCima(r.andar)
  const passo = (x: Resultado) => {
    if (!x.ok) throw new Error(`andar de exemplo recusado: ${x.motivo}`)
    cima = x.obra
  }
  passo(esticarParede(cima, lote, { x: -6, z: -8 }, { x: 6, z: -8 }))
  passo(esticarParede(cima, lote, { x: -6, z: 0 }, { x: 6, z: 0 }))
  passo(esticarParede(cima, lote, { x: -6, z: -8 }, { x: -6, z: 0 }))
  passo(esticarParede(cima, lote, { x: 6, z: -8 }, { x: 6, z: 0 }))
  passo(esticarParede(cima, lote, { x: 0, z: -8 }, { x: 0, z: 0 }))
  passo(porAbertura(cima, lote, 'porta', { eixo: 'z', x: 0, z: -4 }))
  passo(porAbertura(cima, lote, 'porta', { eixo: 'z', x: -6, z: -4 }))
  passo(porAbertura(cima, lote, 'janela-arco', { eixo: 'x', x: -4, z: 0 }))
  passo(porAbertura(cima, lote, 'janela-redonda', { eixo: 'z', x: 6, z: -4 }))
  passo(trocarPiso(cima, lote, { x: 3, z: -4 }, 'ladrilho'))
  passo(porMovel(cima, lote, 'poltrona', { x: 3, z: -6 }, 0))
  const alturas: [number, number, number][] = []
  for (let x = 8; x <= 12; x++)
    for (let z = 4; z <= 8; z++) {
      const h = 3 - Math.max(Math.abs(x - 10), Math.abs(z - 6))
      if (h > 0) alturas.push([x, z, h])
    }
  return {
    ...obraEstendidaVazia(),
    andar: andarDaObra(cima, r.andar.escada),
    terreno: { alturas },
  }
}

const GANHO = { ganhoEm: '2026-10-28T12:00:00.000Z', aparencia: null, aparencias: [] }
/** Os projetos azuis que a obra de exemplo já ganhou (geladeira, planta e casinha). */
export const PROJETOS_DE_EXEMPLO = { geladeira: GANHO, 'planta-interior': GANHO, casinha: GANHO }
