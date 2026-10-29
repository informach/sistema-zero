import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, LUMIS } from '@sistemazero/arquipelago-contracts'
import {
  ANCORAS_DOS_LUMIS,
  BORROES_POR_NOITE,
  borroesDaNoite,
  comLanterna,
  criarBorrao,
  FALA_DA_LANTERNA,
  FALA_DE_ACENDER,
  FALA_DE_APAGAR,
  FALA_DO_BORRAO_FUGINDO,
  FAMILIA_DA_VILA,
  FOGE_A,
  FOGE_ATE,
  falaDoLumiNovo,
  gravarPresos,
  ID_DA_LANTERNA,
  lerPresos,
  lumisNaVila,
  PRENDE_A,
  PRESO_POR,
  passoDoBorrao,
  podePrender,
  prender,
  prenderBorrao,
  RARO_A_CADA,
  receberLanterna,
  SOLTO_ATE,
  VIRANDO_POR,
} from '../src/sistemas/borroes'
import { ITENS, itensParaDar, remover } from '../src/sistemas/itens'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))

describe('os borrões da noite', () => {
  test('cada noite tem os mesmos borrões em qualquer aparelho, em âncoras diferentes', () => {
    for (let dia = 0; dia < 50; dia++) {
      const a = borroesDaNoite(dia, { quindim: 1 })
      expect(a).toEqual(borroesDaNoite(dia, { quindim: 1 }))
      expect(a).toHaveLength(BORROES_POR_NOITE)
      expect(new Set(a.map((b) => b.id)).size).toBe(BORROES_POR_NOITE)
      expect(new Set(a.map((b) => b.ancora)).size).toBe(BORROES_POR_NOITE)
      for (const b of a) {
        expect(b.ancora).toBeGreaterThanOrEqual(0)
        expect(b.ancora).toBeLessThan(ANCORAS_DOS_LUMIS)
      }
    }
  })

  test('enquanto nenhum Lumi foi preso, todos viram o comum', () => {
    for (let dia = 0; dia < 200; dia++)
      for (const b of borroesDaNoite(dia, {})) expect(b.lumi).toBe(FAMILIA_DA_VILA.comum)
  })

  test('depois do primeiro, o raro sai mais ou menos um em cada RARO_A_CADA', () => {
    let raros = 0
    let todos = 0
    for (let dia = 0; dia < 1000; dia++)
      for (const b of borroesDaNoite(dia, { quindim: 3 })) {
        todos++
        if (b.lumi === FAMILIA_DA_VILA.raro) raros++
        else expect(b.lumi).toBe(FAMILIA_DA_VILA.comum)
      }
    expect(raros / todos).toBeGreaterThan(1 / RARO_A_CADA - 0.04)
    expect(raros / todos).toBeLessThan(1 / RARO_A_CADA + 0.04)
  })

  test('prender pede chegar mais perto do que a distância em que ele foge', () => {
    expect(PRENDE_A).toBeLessThan(FOGE_A)
  })
})

describe('prender um borrão', () => {
  test('soma um Lumi da espécie, sem mudar o resto do salvamento', () => {
    const s = inicial()
    const um = prenderBorrao(s, 'quindim')
    expect(um.quantos).toBe(1)
    expect(um.salvamento.lumis).toEqual({ quindim: 1 })
    expect(um.salvamento.inventario).toBe(s.inventario)
    expect(s.lumis).toEqual({})
    const dois = prenderBorrao(um.salvamento, 'brigadeiro')
    expect(dois.salvamento.lumis).toEqual({ quindim: 1, brigadeiro: 1 })
    expect(prenderBorrao(dois.salvamento, 'quindim').quantos).toBe(2)
  })

  test('para em 999, o teto do salvamento', () => {
    const s = { ...inicial(), lumis: { quindim: 999 } }
    expect(prenderBorrao(s, 'quindim').salvamento.lumis.quindim).toBe(999)
  })

  test('a fala do primeiro é diferente da dos seguintes, e o raro tem a dele', () => {
    const textos = [
      falaDoLumiNovo('quindim', 1),
      falaDoLumiNovo('quindim', 2),
      falaDoLumiNovo('brigadeiro', 1),
      falaDoLumiNovo('brigadeiro', 2),
    ]
    expect(new Set(textos).size).toBe(4)
    expect(textos[0]).toContain('Quindim')
    expect(textos[2]).toContain('Brigadeiro')
  })
})

describe('os Lumis que moram na Vila', () => {
  test('o primeiro de cada espécie primeiro, depois os outros, até as quatro âncoras', () => {
    expect(lumisNaVila({})).toEqual([])
    expect(lumisNaVila({ quindim: 1 })).toEqual([{ ancora: 0, lumi: 'quindim' }])
    expect(lumisNaVila({ quindim: 3, brigadeiro: 1 }).map((l) => l.lumi)).toEqual([
      'quindim',
      'brigadeiro',
      'quindim',
      'quindim',
    ])
    expect(lumisNaVila({ quindim: 50, brigadeiro: 50 })).toHaveLength(ANCORAS_DOS_LUMIS)
    expect(lumisNaVila({ brigadeiro: 2 }).map((l) => l.lumi)).toEqual(['brigadeiro', 'brigadeiro'])
    // Lumis de outras ilhas não moram na Vila.
    expect(lumisNaVila({ estrelinha: 4 })).toEqual([])
  })
})

describe('a lanterna', () => {
  test('é um equipamento: não se come nem se dá de presente', () => {
    const item = ITENS[ID_DA_LANTERNA]
    expect(item?.equipamento).toBe(true)
    expect(item?.comida).toBeUndefined()
    expect(itensParaDar({ [ID_DA_LANTERNA]: 1 })).toEqual([])
  })

  test('o Bento dá uma vez, e de novo se ela sumir da mochila', () => {
    const s = inicial()
    const r = receberLanterna(s)
    if (!r) throw new Error('devia dar a lanterna')
    expect(r.fala).toBe(FALA_DA_LANTERNA)
    expect(r.salvamento.inventario[ID_DA_LANTERNA]).toBe(1)
    expect(receberLanterna(r.salvamento)).toBeNull()
    const semEla = remover(r.salvamento.inventario, ID_DA_LANTERNA)
    if (!semEla) throw new Error('devia tirar')
    expect(receberLanterna({ ...r.salvamento, inventario: semEla })).not.toBeNull()
  })

  test('só vale acesa e na mochila', () => {
    expect(comLanterna(true, { [ID_DA_LANTERNA]: 1 })).toBe(true)
    expect(comLanterna(false, { [ID_DA_LANTERNA]: 1 })).toBe(false)
    expect(comLanterna(true, {})).toBe(false)
  })
})

test('as famílias usam espécies do contrato', () => {
  expect(LUMIS).toContain(FAMILIA_DA_VILA.comum)
  expect(LUMIS).toContain(FAMILIA_DA_VILA.raro)
})

test('os textos seguem as regras: sem travessão, sem exclamação, sem começar com pergunta', () => {
  const textos = [
    FALA_DA_LANTERNA,
    FALA_DE_ACENDER,
    FALA_DE_APAGAR,
    FALA_DO_BORRAO_FUGINDO,
    ...[1, 2].flatMap((n) => [falaDoLumiNovo('quindim', n), falaDoLumiNovo('brigadeiro', n)]),
  ]
  for (const t of textos) {
    expect(t).not.toMatch(/[—!]/)
    const primeira = t.split(/(?<=[.?])\s/)[0] ?? ''
    expect(primeira.endsWith('?')).toBe(false)
  }
})

describe('o borrão no mundo', () => {
  const dt = 1 / 60
  const andar = (
    b: ReturnType<typeof criarBorrao>,
    s: number,
    px: number,
    pz: number,
    luz: boolean,
  ) => {
    const eventos: string[] = []
    for (let t = 0; t < s; t += dt) {
      const e = passoDoBorrao(b, dt, px, pz, luz)
      if (e) eventos.push(e)
    }
    return eventos
  }

  test('sem a lanterna, foge de quem chega perto e para longe o bastante', () => {
    const b = criarBorrao({ x: 0, z: 0 })
    expect(andar(b, 1, 5, 0, false)).toEqual([])
    expect(b.x).toBe(0)
    // Chega a 2 m: ele foge para o outro lado, uma vez só.
    expect(andar(b, 0.3, 2, 0, false)).toEqual(['fugiu'])
    expect(b.x).toBeLessThan(0)
    andar(b, 2, 2, 0, false)
    expect(Math.hypot(b.x - 2, b.z)).toBeGreaterThanOrEqual(FOGE_ATE - 0.1)
    expect(Math.hypot(b.x, b.z)).toBeLessThanOrEqual(SOLTO_ATE + 1e-9)
  })

  test('encurralado, não passa de SOLTO_ATE do lugar dele, e depois volta para casa', () => {
    const b = criarBorrao({ x: 0, z: 0 })
    andar(b, 5, 0.5, 0.2, false)
    expect(Math.hypot(b.x, b.z)).toBeCloseTo(SOLTO_ATE, 6)
    andar(b, 10, 30, 0, false)
    expect(b.x).toBeCloseTo(0, 6)
    expect(b.z).toBeCloseTo(0, 6)
    expect(b.fugindo).toBe(false)
  })

  test('com a lanterna acesa ele não foge e dá para prender de perto', () => {
    const b = criarBorrao({ x: 0, z: 0 })
    expect(andar(b, 1, 1, 0, true)).toEqual([])
    expect(b.x).toBe(0)
    expect(podePrender(b, 1, 0, true)).toBe(true)
    expect(podePrender(b, 1, 0, false)).toBe(false)
    expect(podePrender(b, PRENDE_A + 0.1, 0, true)).toBe(false)
  })

  test('preso, chacoalha, vira e acaba pronto, com o aviso uma vez só', () => {
    const b = criarBorrao({ x: 0, z: 0 })
    prender(b)
    expect(podePrender(b, 0, 0, true)).toBe(false)
    expect(andar(b, PRESO_POR * 0.9, 0, 0, false)).toEqual([])
    expect(b.fase).toBe('preso')
    expect(andar(b, PRESO_POR * 0.2 + VIRANDO_POR + 0.1, 0, 0, false)).toEqual(['virou'])
    expect(b.fase).toBe('pronto')
    expect(andar(b, 2, 0, 0, false)).toEqual([])
  })

  test('os presos da noite valem só naquela noite e ignoram texto estragado', () => {
    const t = gravarPresos(4, ['4:0'])
    expect(lerPresos(t, 4)).toEqual(['4:0'])
    expect(lerPresos(t, 5)).toEqual([])
    expect(lerPresos(null, 4)).toEqual([])
    expect(lerPresos('{', 4)).toEqual([])
    expect(lerPresos('{"dia":4,"ids":[1,"4:1"]}', 4)).toEqual(['4:1'])
  })
})
