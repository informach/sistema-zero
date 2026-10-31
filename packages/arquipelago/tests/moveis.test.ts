import { describe, expect, test } from 'bun:test'
import {
  MOVEIS,
  MOVEIS_NA_CASA_MAXIMO,
  type Movel,
  type Obra,
  ObraDaCasaSchema,
  type ProjetoAzul,
} from '@sistemazero/arquipelago-contracts'
import { Box3 } from 'three'
import { lugarDoMovel } from '../src/mundo/moveis-da-obra'
import { aconchegoDosComodos } from '../src/sistemas/construcao/aconchego'
import { falaDaRecusa } from '../src/sistemas/construcao/falas'
import { type Escolhas, toque } from '../src/sistemas/construcao/ferramentas'
import { LOTE_DA_CASA, loteDaCabana } from '../src/sistemas/construcao/lote'
import {
  arestaAtras,
  CATEGORIAS_DOS_MOVEIS,
  celulasDoMovel,
  DADOS_DO_MOVEL,
  ehDeParede,
  giroDaParedeNoToque,
  type MovelPosto,
  moveisDaObra,
  porMovel,
  tirarMovel,
  tuplaDoMovel,
} from '../src/sistemas/construcao/moveis'
import {
  apagarParede,
  esticarParede,
  porAbertura,
  type Resultado,
} from '../src/sistemas/construcao/obra'
import { porObjeto } from '../src/sistemas/construcao/projeto-azul'
import { carregarGlb } from './ajuda-colisores'

const L = LOTE_DA_CASA
const agora = new Date('2026-10-30T12:00:00Z')
const ganho = (): ProjetoAzul => ({ ganhoEm: agora.toISOString(), aparencia: null, aparencias: [] })

function ok(r: Resultado): Obra {
  if (!r.ok) throw new Error(`recusado: ${JSON.stringify(r)}`)
  return r.obra
}
function motivo(r: Resultado): string {
  if (r.ok) throw new Error('deu certo, e não devia')
  return r.motivo
}

/**
 * Um cômodo novo na frente do quarto: células de x -6 a -2 e de z 0 a 2. A parede de z = 0 é a do
 * quarto (com a janela grande de x -4 a -1); as outras três são novas.
 */
function comComodo(): Obra {
  let o = structuredClone(L.obraInicial)
  o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
  o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
  return ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
}
const por = (o: Obra, id: Movel, x: number, z: number, giro = 0) =>
  porMovel(o, L, id, { x, z }, giro)

describe('o catálogo dos móveis', () => {
  test('cada móvel tem nome, cômodo e área (ou é de parede, com altura)', () => {
    for (const id of MOVEIS) {
      const d = DADOS_DO_MOVEL[id]
      expect(d.nome.length).toBeGreaterThan(2)
      expect(CATEGORIAS_DOS_MOVEIS).toContain(d.categoria)
      if (d.area === null) expect(d.altura).toBeGreaterThan(1)
      else expect(d.altura).toBeUndefined()
    }
    expect(MOVEIS.filter(ehDeParede)).toEqual([
      'prateleira-potes',
      'quadro',
      'espelho',
      'toalheiro',
    ])
    // A tupla do salvamento volta igual.
    const m: MovelPosto = { id: 'sofa', x: -5, z: 2, giro: 2 }
    expect(moveisDaObra({ ...comComodo(), moveis: [tuplaDoMovel(m)] })).toEqual([m])
  })

  test('cada móvel é um nó do GLB do cômodo dele e cabe na área (o de encostar até o fundo)', async () => {
    for (const categoria of CATEGORIAS_DOS_MOVEIS) {
      const modelo = await carregarGlb(`src/assets/casa/casa-${categoria}.glb`)
      for (const id of MOVEIS.filter((m) => DADOS_DO_MOVEL[m].categoria === categoria)) {
        const no = modelo.getObjectByName(id)
        expect([id, Boolean(no)]).toEqual([id, true])
        if (!no) continue
        const caixa = new Box3().setFromObject(no)
        const area = DADOS_DO_MOVEL[id].area
        if (area === null) {
          // Peça de parede: o fundo em 0,10 atrás da origem (README de arte/casa), fina.
          expect([id, caixa.min.z]).toEqual([id, expect.closeTo(-0.1, 1)])
          expect(caixa.max.z - caixa.min.z).toBeLessThan(0.35)
          continue
        }
        // A origem no meio da área; nada passa dela.
        expect([id, caixa.max.x - caixa.min.x <= area.largura + 0.001]).toEqual([id, true])
        expect([id, caixa.max.z - caixa.min.z <= area.fundo + 0.001]).toEqual([id, true])
        expect([id, caixa.min.x >= -area.largura / 2 - 0.001]).toEqual([id, true])
        expect([id, caixa.min.z >= -area.fundo / 2 - 0.001]).toEqual([id, true])
        expect([id, caixa.min.y]).toEqual([id, expect.closeTo(0, 1)])
      }
    }
  })
})

describe('pôr os móveis', () => {
  test('o sofá vai inteiro num cômodo novo e o tapete fica por baixo da mesinha', () => {
    let o = comComodo()
    o = ok(por(o, 'sofa', -6, 2))
    o = ok(por(o, 'tapete', -5, 0))
    o = ok(por(o, 'mesinha-centro', -5, 1))
    expect(moveisDaObra(o).map((m) => m.id)).toEqual(['sofa', 'tapete', 'mesinha-centro'])
    expect(ObraDaCasaSchema.safeParse(o).success).toBe(true)
    // O sofá já está ali; outro tapete em cima do tapete, também não.
    expect(motivo(por(o, 'poltrona', -4, 2))).toBe('tem-movel')
    expect(motivo(por(o, 'tapetinho', -4, 0))).toBe('tem-movel')
    // De lado, o sofá ocupa três células em z.
    expect(celulasDoMovel({ id: 'sofa', x: 0, z: 0, giro: 1 })).toEqual([
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: 2 },
    ])
  })

  test('fora de cômodo, no quarto, atravessando parede e passando do teto não dá', () => {
    const o = comComodo()
    expect(motivo(por(o, 'balcao', -4, 5))).toBe('movel-fora-de-comodo')
    expect(motivo(por(o, 'balcao', -3, -3))).toBe('movel-no-quarto')
    // Saindo pela parede de x = -1: duas células em cômodos diferentes (uma fora de casa).
    expect(motivo(por(o, 'balcao-pia', -2, 1))).toBe('movel-fora-de-comodo')
    // Ocupado no lote (a varanda).
    expect(motivo(por(o, 'balcao', 1, 0))).toBe('ocupado')
    // O teto da casa.
    const cheia = {
      ...o,
      moveis: Array.from({ length: MOVEIS_NA_CASA_MAXIMO }, () =>
        tuplaDoMovel({ id: 'tapetinho', x: -6, z: 0, giro: 0 }),
      ),
    }
    expect(motivo(por(cheia, 'balcao', -2, 2))).toBe('limite')
    // Na cabana não vai móvel.
    const cabana = loteDaCabana('bosque', { x0: 0, z0: 0, x1: 8, z1: 6 })
    expect(cabana.limites.moveis).toBe(0)
  })

  test('a peça de parede precisa de parede atrás, sem porta nem janela, uma por lado', () => {
    let o = comComodo()
    // Na parede de trás (z = 3), de frente para o cômodo: giro 2.
    o = ok(por(o, 'quadro', -5, 2, 2))
    expect(motivo(por(o, 'espelho', -5, 2, 2))).toBe('tem-movel')
    // Outro lado da mesma célula, na parede de x = -6: pode.
    o = ok(por(o, 'toalheiro', -6, 2, 1))
    // Sem parede atrás (o meio do cômodo).
    expect(motivo(por(o, 'quadro', -4, 1, 0))).toBe('sem-parede-atras')
    // Na parede do quarto onde está a janela grande.
    expect(motivo(por(o, 'quadro', -3, 0, 0))).toBe('ja-tem-abertura')
    // A peça de parede não ocupa o chão: o balcão fica embaixo do quadro.
    o = ok(por(o, 'balcao', -5, 2))
    expect(moveisDaObra(o)).toHaveLength(3)
  })

  test('o toque acha a parede mais perto do dedo para a peça de parede', () => {
    const o = comComodo()
    expect(giroDaParedeNoToque(o, L, { x: -5.5, z: 2.9 })).toBe(2)
    expect(giroDaParedeNoToque(o, L, { x: -5.9, z: 2.6 })).toBe(1)
    expect(giroDaParedeNoToque(o, L, { x: -4.5, z: 1.5 })).toBeNull()
    // Na parede do quarto, a da janela não conta: sobra a de x = -6 na célula do canto.
    expect(giroDaParedeNoToque(o, L, { x: -3.5, z: 0.1 })).toBeNull()
    const escolhas: Escolhas = {
      janela: 'janela-grande',
      piso: 'tabua',
      caminho: 'pedra',
      objeto: null,
      movel: 'espelho',
      giro: 0,
    }
    const r = toque('movel', o, L, { x: -5.5, z: 2.9 }, escolhas, [])
    expect(r.previa).toEqual({
      tipo: 'arestas',
      arestas: [arestaAtras({ x: -6, z: 2 }, 2)],
      ok: true,
    })
    expect(moveisDaObra(ok(r.resultado as Resultado))).toEqual([
      { id: 'espelho', x: -6, z: 2, giro: 2 },
    ])
  })

  test('objeto e móvel não se sobrepõem, mas o objeto fica em cima do tapete', () => {
    const projetos = { geladeira: ganho(), 'planta-interior': ganho() }
    let o = comComodo()
    o = ok(por(o, 'balcao', -6, 0))
    expect(motivo(porObjeto(o, L, projetos, 'planta-interior', { x: -6, z: 0 }, 0))).toBe(
      'tem-movel',
    )
    o = ok(por(o, 'tapetinho', -4, 1))
    o = ok(porObjeto(o, L, projetos, 'planta-interior', { x: -4, z: 1 }, 0))
    expect(motivo(por(o, 'poltrona', -4, 1))).toBe('tem-objeto')
  })
})

describe('as paredes mexem nos móveis', () => {
  test('a parede não corta um móvel ao meio, e a porta não abre numa peça pendurada', () => {
    let o = comComodo()
    o = ok(por(o, 'sofa', -6, 1))
    expect(motivo(esticarParede(o, L, { x: -5, z: 0 }, { x: -5, z: 3 }))).toBe('tem-movel')
    o = ok(por(o, 'quadro', -3, 2, 2))
    expect(motivo(porAbertura(o, L, 'porta', { eixo: 'x', x: -3, z: 3 }))).toBe('movel-na-parede')
  })

  test('apagar a parede de trás tira a peça dela; abrir o cômodo tira os móveis de dentro', () => {
    let o = comComodo()
    o = ok(por(o, 'quadro', -5, 2, 2))
    o = ok(por(o, 'balcao', -6, 0))
    o = ok(apagarParede(o, L, [{ eixo: 'x', x: -5, z: 3 }]))
    // A parede saiu: o cômodo abriu para o quintal e os dois móveis saem.
    expect(moveisDaObra(o)).toEqual([])
  })

  test('o apagar tira primeiro o móvel de chão, depois a peça do lado mais perto e o tapete', () => {
    let o = comComodo()
    o = ok(por(o, 'tapete', -6, 1))
    o = ok(por(o, 'poltrona', -6, 2))
    o = ok(por(o, 'quadro', -6, 2, 2))
    o = ok(por(o, 'toalheiro', -6, 2, 1))
    const toques = [
      { x: -5.5, z: 2.5 },
      { x: -5.95, z: 2.5 },
      { x: -5.5, z: 2.5 },
      { x: -5.5, z: 2.5 },
    ]
    const saidas: Movel[] = []
    for (const onde of toques) {
      const antes = moveisDaObra(o).map((m) => m.id)
      o = ok(tirarMovel(o, onde))
      const depois = moveisDaObra(o).map((m) => m.id)
      saidas.push(antes.find((id, i) => depois[i] !== id) as Movel)
    }
    expect(saidas).toEqual(['poltrona', 'toalheiro', 'quadro', 'tapete'])
    expect(motivo(tirarMovel(o, { x: -5.5, z: 2.5 }))).toBe('nada')
  })
})

describe('os móveis no aconchego e no mundo', () => {
  test('tipos diferentes somam variedade; a luminária é luz e a planta é planta', () => {
    const base = comComodo()
    const antes = aconchegoDosComodos(base, L, {}).find((c) => !c.comodo.quarto)
    let o = ok(por(base, 'luminaria-pe', -6, 2))
    o = ok(por(o, 'planta', -2, 2))
    o = ok(por(o, 'sofa', -5, 2))
    o = ok(por(o, 'quadro', -5, 2, 2))
    const depois = aconchegoDosComodos(o, L, {}).find((c) => !c.comodo.quarto)
    expect(antes?.variedade).toBe(0)
    expect(depois?.variedade).toBe(8)
    expect((depois?.luz ?? 0) - (antes?.luz ?? 0)).toBe(2)
    expect(depois?.plantas).toBe(2)
  })

  test('o móvel de chão fica no meio da área; a peça de parede a 0,20 da linha', () => {
    expect(lugarDoMovel({ id: 'sofa', x: -6, z: 2, giro: 0 })).toEqual({
      x: -4.5,
      y: 0,
      z: 2.5,
      giro: 0,
    })
    const quadro = lugarDoMovel({ id: 'quadro', x: -5, z: 2, giro: 2 })
    expect(quadro.x).toBeCloseTo(-4.5)
    expect(quadro.z).toBeCloseTo(2.8)
    expect(quadro.y).toBe(DADOS_DO_MOVEL.quadro.altura as number)
  })

  test('as falas novas seguem as regras dos textos das crianças', () => {
    for (const m of [
      'tem-movel',
      'movel-fora-de-comodo',
      'movel-no-quarto',
      'sem-parede-atras',
      'movel-na-parede',
    ] as const) {
      const fala = falaDaRecusa({ motivo: m }) ?? ''
      expect(fala).not.toMatch(/[—!]/)
      expect(fala.split('.')[0]).not.toContain('?')
    }
  })
})
