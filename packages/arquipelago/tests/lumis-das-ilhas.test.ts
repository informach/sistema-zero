import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, LUMIS } from '@sistemazero/arquipelago-contracts'
import { Vector3 } from 'three'
import {
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDaCasa,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
} from '../src/mundo/colisao-da-ilha-central'
import {
  DISTANCIA_DOS_LUMIS_DA_PRAIA,
  LUGARES_DOS_LUMIS_DA_PRAIA,
} from '../src/mundo/lugares-da-praia'
import { alturaDaIlha, ilhasEmVolta, NIVEL_DA_AGUA } from '../src/mundo/medidas'
import {
  ANCORAS_DOS_LUMIS,
  BORROES_POR_NOITE,
  borroesDaNoite,
  FALA_DA_LANTERNA_DO_ZAPPY,
  FAMILIAS_DOS_LUMIS,
  falaDoLumiNovo,
  ID_DA_LANTERNA,
  type IlhaDosLumis,
  lanternaDoZappy,
  lumisNaIlha,
  receberLanterna,
} from '../src/sistemas/borroes'
import { ESPECIES_DE_LUMI } from '../src/sistemas/lumis'
import { bate, type Forma } from './ajuda-colisores'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))
const ILHAS = Object.keys(FAMILIAS_DOS_LUMIS) as IlhaDosLumis[]

/** As regras do texto da casa: sem travessão, sem exclamação, a primeira frase não é pergunta. */
function segueAsRegras(t: string) {
  expect(t).not.toMatch(/[—–!]/)
  expect(t.split(/[.?]/)[0]?.trim().endsWith('?')).toBe(false)
  expect(t.trim().startsWith('¿')).toBe(false)
}

describe('uma família de Lumis em cada ilha', () => {
  test('as sete famílias cobrem as 14 espécies, cada uma na ilha dela', () => {
    expect(ILHAS).toHaveLength(7)
    const todas = ILHAS.flatMap((i) => [FAMILIAS_DOS_LUMIS[i].comum, FAMILIAS_DOS_LUMIS[i].raro])
    expect(new Set(todas)).toEqual(new Set(LUMIS))
    for (const i of ILHAS) {
      const f = FAMILIAS_DOS_LUMIS[i]
      expect(ESPECIES_DE_LUMI[f.comum]).toMatchObject({ ilha: i, raro: false })
      expect(ESPECIES_DE_LUMI[f.raro]).toMatchObject({ ilha: i, raro: true })
    }
  })

  test('cada ilha tem os borrões dela à noite, sempre os da família, sem repetir id', () => {
    const ids = new Set<string>()
    for (const ilha of ILHAS) {
      const f = FAMILIAS_DOS_LUMIS[ilha]
      for (let dia = 0; dia < 40; dia++) {
        const noite = borroesDaNoite(dia, { [f.comum]: 2 }, ilha)
        expect(noite).toEqual(borroesDaNoite(dia, { [f.comum]: 2 }, ilha))
        expect(noite).toHaveLength(BORROES_POR_NOITE)
        expect(new Set(noite.map((b) => b.ancora)).size).toBe(BORROES_POR_NOITE)
        for (const b of noite) {
          expect([f.comum, f.raro]).toContain(b.lumi)
          expect(b.ancora).toBeLessThan(ANCORAS_DOS_LUMIS)
          expect(ids.has(b.id)).toBe(false)
          ids.add(b.id)
        }
        // Antes do primeiro da família, só o comum (mesmo com Lumis de outras ilhas).
        for (const b of borroesDaNoite(dia, { quindim: 5, brigadeiro: 1 }, ilha))
          expect(b.lumi).toBe(ilha === 'vila-doce' ? b.lumi : f.comum)
      }
    }
  })

  test('os raros aparecem nas noites, depois do primeiro comum', () => {
    for (const ilha of ILHAS) {
      const f = FAMILIAS_DOS_LUMIS[ilha]
      let raros = 0
      for (let dia = 0; dia < 200; dia++)
        for (const b of borroesDaNoite(dia, { [f.comum]: 1 }, ilha)) if (b.lumi === f.raro) raros++
      expect(raros).toBeGreaterThan(0)
    }
  })

  test('a Vila guarda os ids de antes', () => {
    expect(borroesDaNoite(7, { quindim: 1 }).map((b) => b.id)).toEqual(['7:0', '7:1'])
    expect(borroesDaNoite(7, { quindim: 1 }, 'vila-doce')).toEqual(
      borroesDaNoite(7, { quindim: 1 }),
    )
  })

  test('quem mora em cada ilha é só da família dela', () => {
    for (const ilha of ILHAS) {
      const f = FAMILIAS_DOS_LUMIS[ilha]
      expect(lumisNaIlha({}, ilha)).toEqual([])
      expect(lumisNaIlha({ [f.comum]: 3, [f.raro]: 1 }, ilha).map((l) => l.lumi)).toEqual([
        f.comum,
        f.raro,
        f.comum,
        f.comum,
      ])
    }
    expect(lumisNaIlha({ quindim: 4 }, 'bosque')).toEqual([])
  })

  test('as falas de cada Lumi novo dizem de onde ele é e seguem as regras da casa', () => {
    for (const lumi of LUMIS) {
      const primeiro = falaDoLumiNovo(lumi, 1)
      const outro = falaDoLumiNovo(lumi, 2)
      expect(primeiro).toContain(ESPECIES_DE_LUMI[lumi].nome)
      expect(primeiro).not.toBe(outro)
      segueAsRegras(primeiro)
      segueAsRegras(outro)
      const ilha = ESPECIES_DE_LUMI[lumi].ilha
      if (ilha !== 'vila-doce' && ilha !== 'farol')
        expect(primeiro).toContain(FAMILIAS_DOS_LUMIS[ilha].de)
    }
    expect(falaDoLumiNovo('pitanga', 1).startsWith('Uma Pitanga')).toBe(true)
    expect(falaDoLumiNovo('cristal', 1)).toContain('o raro do Pico')
  })
})

describe('a lanterna do Zappy na primeira noite', () => {
  test('quem não tem ganha a lanterna, uma só', () => {
    const r = lanternaDoZappy(inicial())
    expect(r?.salvamento.inventario[ID_DA_LANTERNA]).toBe(1)
    expect(r?.fala).toBe(FALA_DA_LANTERNA_DO_ZAPPY)
    segueAsRegras(FALA_DA_LANTERNA_DO_ZAPPY)
    expect(lanternaDoZappy(r!.salvamento)).toBeNull()
    // Com a lanterna do Zappy, o Bento não dá outra.
    expect(receberLanterna(r!.salvamento)).toBeNull()
  })
})

describe('os lugares dos Lumis da praia', () => {
  const lugares = LUGARES_DOS_LUMIS_DA_PRAIA.map(({ angulo }) => {
    const a = (angulo * Math.PI) / 180
    const x = Math.cos(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA
    const z = Math.sin(a) * DISTANCIA_DOS_LUMIS_DA_PRAIA
    return { x, y: alturaDaIlha(x, z), z }
  })

  test('quatro lugares em terra, fora da casa, do farol, do píer e das árvores', () => {
    expect(lugares).toHaveLength(ANCORAS_DOS_LUMIS)
    const solidos: Forma[] = [
      ...deslocar(colisoresDaCasa(true), GRUPOS.casa),
      ...deslocar(COLISORES_DO_FAROL, GRUPOS.farol),
      ...deslocar(COLISORES_DO_PIER, GRUPOS.pier),
      ...colisoresDasArvores(),
    ]
    for (const l of lugares) {
      expect(l.y).toBeGreaterThan(NIVEL_DA_AGUA + 0.3)
      const centro = new Vector3(l.x, l.y + 0.9, l.z)
      for (const f of solidos) expect([f.nome, bate(f, centro)]).toEqual([f.nome, false])
    }
  })

  test('longe das pontes (a 4 m da linha de cada uma)', () => {
    for (const { centro } of ilhasEmVolta()) {
      const r = Math.hypot(centro.x, centro.z)
      for (const l of lugares) {
        // Distância do lugar à reta do meio da ilha central até a ilha do anel.
        const t = Math.max(0, (l.x * centro.x + l.z * centro.z) / (r * r))
        const d = Math.hypot(l.x - centro.x * t, l.z - centro.z * t)
        expect(d).toBeGreaterThan(4)
      }
    }
  })
})
