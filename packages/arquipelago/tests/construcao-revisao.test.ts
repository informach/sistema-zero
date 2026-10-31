import { describe, expect, test } from 'bun:test'
import {
  CATALOGO_DE_OBJETOS,
  type Obra,
  ObraDaCasaSchema,
} from '@sistemazero/arquipelago-contracts'
import { falaDaRecusa } from '../src/sistemas/construcao/falas'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { esticarParede, type Resultado, trocarPiso } from '../src/sistemas/construcao/obra'
import { falaDoGanho, oQueOPintaPinta, porObjeto } from '../src/sistemas/construcao/projeto-azul'
import { esticarCerca, pintarCaminho, porCanteiro } from '../src/sistemas/construcao/quintal'

/**
 * As correções da revisão do modo construção (28/10/2026): o jogo nunca monta uma obra que o
 * contrato recusaria, o quintal respeita a casinha, o objeto não fica em cima de parede e as falas
 * de objeto são as dele.
 */
const L = LOTE_DA_CASA
/**
 * Um lote grande e vazio, com os mesmos tetos: cabem 420 paredes soltas, mais que o teto de 200. Não
 * maior que isso: cada esticada percorre a área toda (num lote de 80 × 80 o teste passava de 5 s).
 */
const GRANDE = { ...LOTE_DA_CASA, area: { x0: -20, z0: -10, x1: 20, z1: 10 }, ocupadas: [] }
const inicial = (): Obra => structuredClone(L.obraInicial)
const GANHO = { ganhoEm: '2026-10-28T12:00:00.000Z', aparencia: null, aparencias: [] }
const PROJETOS = { geladeira: GANHO, casinha: GANHO, aquario: GANHO }

function ok(r: Resultado): Obra {
  if (!r.ok) throw new Error(`recusado: ${JSON.stringify(r)}`)
  return r.obra
}

/** Um cômodo na frente do quarto (x -6 a -1, z 0 a 3). */
function comComodo(): Obra {
  let o = inicial()
  o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
  o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
  return ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
}

describe('o salvamento nunca recebe obra fora do contrato', () => {
  test('paredes soltas: o teto de trechos vale antes do de arestas', () => {
    let o = inicial()
    let parou: Resultado | null = null
    // Tocos de 1 aresta, um vão entre eles: cada um é um trecho.
    for (let z = -10; z <= 10 && !parou; z++)
      for (let x = -20; x < 20 && !parou; x += 2) {
        const r = esticarParede(o, GRANDE, { x, z }, { x: x + 1, z })
        if (r.ok) o = r.obra
        else if (r.motivo === 'limite') parou = r
      }
    expect(parou).toMatchObject({ motivo: 'limite' })
    expect(o.paredes.length).toBeLessThanOrEqual(L.limites.trechosDeParede)
    expect(ObraDaCasaSchema.safeParse(o).success).toBe(true)
  })

  test('cercas soltas: o mesmo teto de trechos', () => {
    let o = inicial()
    let parou = false
    for (let z = -10; z <= 10 && !parou; z++)
      for (let x = -20; x < 20 && !parou; x += 2) {
        const r = esticarCerca(o, GRANDE, { x, z }, { x: x + 1, z })
        if (r.ok) o = r.obra
        else if (r.motivo === 'limite') parou = true
      }
    expect(o.cercas.length).toBeLessThanOrEqual(L.limites.trechosDeCerca)
    expect(ObraDaCasaSchema.safeParse(o).success).toBe(true)
  })

  test('o piso tem teto; voltar para a tábua tira o registro', () => {
    const o = ok(trocarPiso(comComodo(), L, { x: -4, z: 1 }, 'ladrilho'))
    expect(o.pisos).toHaveLength(1)
    expect(ok(trocarPiso(o, L, { x: -4, z: 1 }, 'tabua')).pisos).toEqual([])
    const cheia = {
      ...comComodo(),
      pisos: Array.from({ length: L.limites.pisos }, (_, i) => ({
        x: 20 + i,
        z: 0,
        tipo: 'azulejo' as const,
      })),
    }
    expect(trocarPiso(cheia, L, { x: -4, z: 1 }, 'ladrilho')).toMatchObject({ motivo: 'limite' })
  })
})

describe('o quintal respeita a casinha', () => {
  const comCasinha = () => ok(porObjeto(inicial(), L, PROJETOS, 'casinha', { x: -12, z: 6 }, 0))

  test('cerca não atravessa, caminho e canteiro não vão debaixo dela', () => {
    expect(esticarCerca(comCasinha(), L, { x: -11, z: 6 }, { x: -11, z: 8 })).toMatchObject({
      motivo: 'tem-objeto',
    })
    expect(pintarCaminho(comCasinha(), L, [{ x: -12, z: 7 }], 'pedra')).toMatchObject({
      motivo: 'tem-objeto',
    })
    expect(porCanteiro(comCasinha(), L, { x: -11, z: 6 })).toMatchObject({ motivo: 'tem-objeto' })
  })

  test('a casinha em cima de canteiro diz que é o canteiro', () => {
    const o = ok(porCanteiro(inicial(), L, { x: -12, z: 6 }))
    expect(porObjeto(o, L, PROJETOS, 'casinha', { x: -12, z: 6 }, 0)).toMatchObject({
      motivo: 'ocupado',
      nome: 'o canteiro',
    })
  })
})

describe('o objeto e as paredes', () => {
  test('o aquário (2 por 1) não fica em cima de um toco de parede dentro do cômodo', () => {
    const toco = ok(esticarParede(comComodo(), L, { x: -4, z: 2 }, { x: -4, z: 3 }))
    expect(porObjeto(toco, L, PROJETOS, 'aquario', { x: -5, z: 2 }, 0)).toMatchObject({
      motivo: 'tem-parede',
    })
    expect(porObjeto(toco, L, PROJETOS, 'aquario', { x: -3, z: 2 }, 0).ok).toBe(true)
  })

  test('falas próprias de objeto (não as do piso)', () => {
    const o = comComodo()
    const fora = porObjeto(o, L, PROJETOS, 'geladeira', { x: -12, z: 6 }, 0)
    const quarto = porObjeto(o, L, PROJETOS, 'geladeira', { x: 0, z: -4 }, 0)
    expect(fora).toMatchObject({ motivo: 'objeto-fora-de-comodo' })
    expect(quarto).toMatchObject({ motivo: 'objeto-no-quarto' })
    for (const r of [fora, quarto]) {
      const fala = !r.ok && falaDaRecusa(r)
      expect(fala).toBeTruthy()
      expect(fala).not.toContain('piso')
      expect(fala).not.toMatch(/[!?—…]/)
    }
  })
})

describe('textos', () => {
  test('a casinha vai no quintal; o Pinta diz as faces de cada objeto', () => {
    expect(falaDoGanho('casinha')).toContain('no quintal')
    expect(falaDoGanho('geladeira')).toContain('em casa')
    expect(oQueOPintaPinta(CATALOGO_DE_OBJETOS.geladeira.molde.faces)).toBe(
      'A frente, os lados e o topo',
    )
    expect(oQueOPintaPinta(CATALOGO_DE_OBJETOS.fliperama.molde.faces)).toBe('A tela')
    expect(oQueOPintaPinta(CATALOGO_DE_OBJETOS.forno.molde.faces)).toBe('A frente e os lados')
    expect(oQueOPintaPinta(CATALOGO_DE_OBJETOS.lareira.molde.faces)).toBeNull()
  })
})
