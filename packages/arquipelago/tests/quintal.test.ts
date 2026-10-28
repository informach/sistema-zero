import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Obra } from '@sistemazero/arquipelago-contracts'
import { criarLojaDaConstrucao } from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { arrasto, type Escolhas, toque } from '../src/sistemas/construcao/ferramentas'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { esticarParede, type Resultado } from '../src/sistemas/construcao/obra'
import {
  apagarNaCelula,
  celulaDoCanteiro,
  celulasDoArrasto,
  colisoresDaCerca,
  esticarCerca,
  hortaComOQuintal,
  idDoCanteiro,
  pintarCaminho,
  porCanteiro,
  postesDaCerca,
} from '../src/sistemas/construcao/quintal'

const L = LOTE_DA_CASA
const inicial = (): Obra => structuredClone(L.obraInicial)
const ESCOLHAS: Escolhas = { janela: 'janela-grande', piso: 'tabua', caminho: 'pedra' }

function ok(r: Resultado | null): Obra {
  if (!r?.ok) throw new Error(`recusado: ${JSON.stringify(r)}`)
  return r.obra
}

describe('a cerca', () => {
  test('estica nas arestas como a parede; postes nas pontas e um colisor por trecho', () => {
    const o = ok(esticarCerca(inicial(), L, { x: -12, z: 3 }, { x: -12, z: 7 }))
    expect(o.cercas).toEqual([{ x: -12, z: 3, eixo: 'z', n: 4 }])
    expect(postesDaCerca(o)).toHaveLength(5)
    const [c] = colisoresDaCerca(o)
    expect(c?.nome && soParaOCorpo(c.nome)).toBe(true)
  })

  test('não vai em cima de parede, dentro de casa nem do que está ocupado', () => {
    expect(esticarCerca(inicial(), L, { x: -6, z: 0 }, { x: -3, z: 0 })).toMatchObject({
      motivo: 'tem-parede',
    })
    expect(esticarCerca(inicial(), L, { x: -4, z: -6 }, { x: -1, z: -6 })).toMatchObject({
      motivo: 'dentro-do-quarto',
    })
    expect(esticarCerca(inicial(), L, { x: 0, z: 1 }, { x: 3, z: 1 })).toMatchObject({
      motivo: 'ocupado',
      nome: 'a varanda',
    })
  })
})

describe('o caminho', () => {
  test('pinta as células do arrasto; pintar de novo com outro tipo troca', () => {
    const celulas = celulasDoArrasto({ x: -3, z: 2 }, { x: -3, z: 5 })
    expect(celulas).toHaveLength(4)
    const pedra = ok(pintarCaminho(inicial(), L, celulas, 'pedra'))
    expect(pedra.caminhos).toHaveLength(4)
    const grama = ok(pintarCaminho(pedra, L, celulas.slice(0, 1), 'grama'))
    expect(grama.caminhos.find((c) => c.x === -3 && c.z === 2)?.tipo).toBe('grama')
    expect(pintarCaminho(grama, L, celulas.slice(1), 'pedra')).toMatchObject({ motivo: 'nada' })
  })

  test('dentro de casa não; e o que fica dentro de um cômodo novo sai', () => {
    expect(pintarCaminho(inicial(), L, [{ x: 0, z: -3 }], 'pedra')).toMatchObject({
      motivo: 'dentro-de-casa',
    })
    let o = ok(pintarCaminho(inicial(), L, [{ x: -4, z: 1 }], 'pedra'))
    o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
    o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
    o = ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
    expect(o.caminhos).toEqual([])
  })
})

describe('o canteiro do quintal', () => {
  test('entra numa célula livre e vira um canteiro da horta', () => {
    const o = ok(porCanteiro(inicial(), L, { x: -11, z: 6 }))
    expect(o.canteiros).toEqual([{ x: -11, z: 6 }])
    const horta = hortaComOQuintal(criarSalvamentoInicial(new Date()).horta, o)
    expect(horta.map((h) => h.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'q-11_6'])
    expect(celulaDoCanteiro(idDoCanteiro({ x: -11, z: 6 }))).toEqual({ x: -11, z: 6 })
    expect(celulaDoCanteiro('c3')).toBeNull()
    // Saiu da obra: sai da horta; os seis de antes ficam.
    expect(hortaComOQuintal(horta, inicial())).toHaveLength(6)
  })

  test('em cima de caminho, com cerca em volta, e parede encostando: não', () => {
    const comCaminho = ok(pintarCaminho(inicial(), L, [{ x: -3, z: 5 }], 'pedra'))
    expect(porCanteiro(comCaminho, L, { x: -3, z: 5 })).toMatchObject({ motivo: 'tem-caminho' })
    const comCerca = ok(esticarCerca(inicial(), L, { x: -3, z: 5 }, { x: -3, z: 7 }))
    expect(porCanteiro(comCerca, L, { x: -3, z: 5 })).toMatchObject({ motivo: 'tem-parede' })
    const comCanteiro = ok(porCanteiro(inicial(), L, { x: -3, z: 5 }))
    expect(esticarParede(comCanteiro, L, { x: -3, z: 5 }, { x: -3, z: 7 })).toMatchObject({
      motivo: 'ocupado',
      nome: 'o canteiro',
    })
  })

  test('apagar o canteiro só vazio; o caminho sai na hora', () => {
    const o = ok(porCanteiro(inicial(), L, { x: -11, z: 6 }))
    const plantado = [{ id: 'q-11_6', semente: 'milho' as const, plantadoEm: null, regadoEm: null }]
    expect(apagarNaCelula(o, { x: -11, z: 6 }, plantado)).toMatchObject({
      motivo: 'canteiro-com-planta',
    })
    expect(ok(apagarNaCelula(o, { x: -11, z: 6 }, [])).canteiros).toEqual([])
  })
})

describe('as ferramentas', () => {
  test('o toque do apagar perto da parede tira a parede; longe dela, o que está na célula', () => {
    let o = ok(esticarParede(inicial(), L, { x: -12, z: 7 }, { x: -10, z: 7 }))
    o = ok(pintarCaminho(o, L, [{ x: -12, z: 6 }], 'pedra'))
    const naParede = toque('apagar', o, L, { x: -11.5, z: 7.1 }, ESCOLHAS, [])
    // Um toque tira só a aresta tocada; a outra fica.
    expect(ok(naParede.resultado).paredes).toContainEqual({ x: -11, z: 7, eixo: 'x', n: 1 })
    expect(ok(naParede.resultado).paredes).not.toContainEqual({ x: -12, z: 7, eixo: 'x', n: 2 })
    const naCelula = toque('apagar', o, L, { x: -11.5, z: 6.5 }, ESCOLHAS, [])
    expect(ok(naCelula.resultado).caminhos).toEqual([])
  })

  test('arrastar a parede dá a prévia verde; em cima da varanda, vermelha', () => {
    const bom = arrasto('parede', inicial(), L, { x: -12.1, z: 7 }, { x: -9, z: 7.2 }, ESCOLHAS)
    expect(bom.previa).toMatchObject({ tipo: 'arestas', ok: true })
    const ruim = arrasto('parede', inicial(), L, { x: 0, z: 1 }, { x: 4, z: 1 }, ESCOLHAS)
    expect(ruim.previa).toMatchObject({ tipo: 'arestas', ok: false })
    expect(ruim.resultado).toMatchObject({ ok: false, motivo: 'ocupado' })
  })

  test('a loja do Construir põe o canteiro novo na horta do salvamento', () => {
    const loja = criarLoja({
      salvamento: {
        ...criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z')),
        casa: { portaNova: true },
      },
      jornada: 2,
      quarto: QUARTO_DE_EXEMPLO,
      avatar: {} as never,
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
        contabilizaTempo: false,
      },
      aoMudar: () => {},
    })
    const construcao = criarLojaDaConstrucao(loja)
    construcao.getState().abrir()
    const obra = loja.getState().salvamento.construcao.casa ?? inicial()
    construcao
      .getState()
      .aplicar(
        toque('canteiro', obra, L, { x: -10.5, z: 6.5 }, ESCOLHAS, []).resultado as Resultado,
      )
    expect(loja.getState().salvamento.horta.at(-1)?.id).toBe('q-11_6')
  })
})
