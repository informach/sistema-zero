import { describe, expect, test } from 'bun:test'
import {
  CARTAS_LUMI,
  type CartaoDaRotina,
  criarSalvamentoInicial,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { obraDeExemplo, PROJETOS_DE_EXEMPLO } from '../src/plataforma/obra-de-exemplo'
import { climaLiberado, climaNatural } from '../src/sistemas/clima'
import { CRESCIMENTO_MS, falaDeQuandoColhe, textoDoTempo } from '../src/sistemas/horta'
import {
  chuvaComOJogoFechado,
  falaDoJogoFechado,
  JOGO_FECHADO,
  rotinasComOJogoFechado,
  viradasComOJogoFechado,
} from '../src/sistemas/jogo-fechado'
import { deveFalarDoHumor, HUMOR_OTIMO } from '../src/sistemas/necessidades'
import { BOA_NOITE } from '../src/sistemas/resumo-do-dia'
import { DURACAO_DO_DIA_MS, PARTE_CLARA } from '../src/sistemas/tempo-do-dia'

/**
 * Enquanto você estava fora (§6.28, A12 e A14): as viradas que passaram, a chuva dos dias do jogo
 * que passaram e as rotinas dos Lumis rodadas ao abrir, uma vez por QUANDO.
 */

const D = DURACAO_DO_DIA_MS
const MIN = 60 * 1000
const T0 = Date.parse('2026-10-01T12:00:00Z')
const TODOS = new Set(CARTAS_LUMI.map((c) => c.id))
const JORNADA_ANTES_DAS_NUVENS = 0
const JORNADA_COM_NUVENS = (() => {
  for (let j = 0; j < 20; j++) if (climaLiberado(j)) return j
  throw new Error('as Nuvens não abrem na jornada')
})()

describe('as viradas com o jogo fechado', () => {
  test('sem virada no meio, nada roda', () => {
    expect(viradasComOJogoFechado(T0 + 5 * MIN, T0 + 10 * MIN, T0)).toEqual([])
    expect(viradasComOJogoFechado(T0 + 10 * MIN, T0 + 5 * MIN, T0)).toEqual([])
  })

  test('o anoitecer e o amanhecer que passaram, na ordem em que aconteceram', () => {
    const noite = T0 + PARTE_CLARA * D
    expect(viradasComOJogoFechado(T0 + 5 * MIN, T0 + 13 * MIN, T0)).toEqual([
      { quando: 'quando-anoitecer', em: noite },
    ])
    expect(viradasComOJogoFechado(T0 + 5 * MIN, T0 + 17 * MIN, T0)).toEqual([
      { quando: 'quando-anoitecer', em: noite },
      { quando: 'quando-amanhecer', em: T0 + D },
    ])
  })

  test('fora por horas: só a última virada de cada QUANDO (o teto)', () => {
    const agora = T0 + 10 * 60 * MIN
    const v = viradasComOJogoFechado(T0 + 5 * MIN, agora, T0)
    expect(v.map((x) => x.quando).sort()).toEqual(['quando-amanhecer', 'quando-anoitecer'])
    for (const x of v) {
      expect(x.em).toBeLessThanOrEqual(agora)
      expect(agora - x.em).toBeLessThan(D)
    }
    expect(v[0]!.em).toBeLessThan(v[1]!.em)
  })
})

/** Um dia do jogo (1 = o primeiro) com este clima natural, a partir de `desde`. */
function diaCom(clima: 'chuva' | 'sol', desde = 1): number {
  for (let d = desde; d < desde + 500; d++) if (climaNatural(d) === clima) return d
  throw new Error(`nenhum dia de ${clima}`)
}

/** Um jogo com a semente plantada no canteiro 1, esperando água. */
function plantado(clima: Salvamento['clima'] = 'sol'): Salvamento {
  const s = criarSalvamentoInicial(new Date(T0))
  return {
    ...s,
    clima,
    horta: s.horta.map((c, i) =>
      i === 0 ? { ...c, semente: 'alface' as const, plantadoEm: new Date(T0).toISOString() } : c,
    ),
  }
}

describe('a chuva com o jogo fechado', () => {
  test('no começo do dia de chuva que passou, a chuva rega o que espera água', () => {
    const chuva = diaCom('chuva', 2)
    const comeco = T0 + (chuva - 1) * D
    const horta = chuvaComOJogoFechado(
      plantado(),
      JORNADA_ANTES_DAS_NUVENS,
      comeco - 1,
      comeco + 5 * MIN,
    )
    expect(horta?.[0]?.regadoEm).toBe(new Date(comeco).toISOString())
  })

  test('sem dia de chuva no meio, nada muda', () => {
    const sol = diaCom('sol', 2)
    const comeco = T0 + (sol - 1) * D
    expect(
      chuvaComOJogoFechado(plantado(), JORNADA_ANTES_DAS_NUVENS, comeco - 1, comeco + MIN),
    ).toBeNull()
  })

  test('com as Nuvens, vale o clima escolhido: chuva escolhida rega no primeiro dia', () => {
    const horta = chuvaComOJogoFechado(plantado('chuva'), JORNADA_COM_NUVENS, T0 + MIN, T0 + 2 * D)
    expect(horta?.[0]?.regadoEm).toBe(new Date(T0 + D).toISOString())
    expect(chuvaComOJogoFechado(plantado('sol'), JORNADA_COM_NUVENS, T0 + MIN, T0 + 9 * D)).toBe(
      null,
    )
  })

  test('confere no máximo os últimos dias do teto', () => {
    const agora = T0 + 1000 * D + MIN
    const horta = chuvaComOJogoFechado(plantado(), JORNADA_ANTES_DAS_NUVENS, T0 + MIN, agora)
    const regado = Date.parse(horta?.[0]?.regadoEm ?? '')
    expect(regado).toBeGreaterThanOrEqual(agora - JOGO_FECHADO.diasDeChuva * D)
  })
})

const ROTINA_DO_QUINDIM: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
  { c: 'voar-ate', a: 'geladeira' },
  { c: 'guardar' },
]

/** O Quindim com a rotina do amanhecer, a geladeira na casa e a alface madura no canteiro 2. */
function comLumi(rotina: CartaoDaRotina[]): Salvamento {
  const s = criarSalvamentoInicial(new Date(T0))
  const antes = new Date(T0 - CRESCIMENTO_MS.alface - 1000).toISOString()
  return {
    ...s,
    horta: s.horta.map((c, i) =>
      i === 1 ? { ...c, semente: 'alface' as const, plantadoEm: antes, regadoEm: antes } : c,
    ),
    lumis: { quindim: 1 },
    rotinas: { quindim: rotina },
    construcao: { ...s.construcao, casa: obraDeExemplo() },
    projetos: { ...PROJETOS_DE_EXEMPLO },
  }
}

describe('as rotinas dos Lumis com o jogo fechado', () => {
  test('o amanhecer que passou faz a rotina: colhe e guarda, "os Lumis guardaram tudo"', () => {
    const s = comLumi(ROTINA_DO_QUINDIM)
    const r = rotinasComOJogoFechado(s, [{ quando: 'quando-amanhecer', em: T0 }], TODOS, 0)
    expect(r.vezes).toHaveLength(1)
    expect(r.vezes[0]?.erro).toBeNull()
    expect(r.vezes[0]?.registro.at(-1)).toMatch(/^Guardou \d+ na geladeira\./)
    expect(r.salvamento.horta[1]?.semente).toBeNull()
    expect(r.salvamento).not.toBe(s)
  })

  test('só o QUANDO que passou: a rotina do amanhecer não roda no anoitecer', () => {
    const s = comLumi(ROTINA_DO_QUINDIM)
    const r = rotinasComOJogoFechado(s, [{ quando: 'quando-anoitecer', em: T0 }], TODOS, 0)
    expect(r.vezes).toEqual([])
    expect(r.salvamento).toBe(s)
  })

  test('sem o cartão na mão, a rotina para com o motivo e nada muda', () => {
    const s = comLumi(ROTINA_DO_QUINDIM)
    const semControle = new Set([...TODOS].filter((id) => id !== 'para-cada'))
    const r = rotinasComOJogoFechado(s, [{ quando: 'quando-amanhecer', em: T0 }], semControle, 0)
    expect(r.vezes[0]?.erro).toBeTruthy()
    expect(r.salvamento.horta).toEqual(s.horta)
  })
})

describe('os textos do jogo fechado, da horta e do humor', () => {
  test('o recado só fala do que aconteceu', () => {
    expect(falaDoJogoFechado(false, 0)).toBeNull()
    expect(falaDoJogoFechado(true, 0)).toContain('a chuva regou a horta')
    expect(falaDoJogoFechado(false, 1)).toContain('Um Lumi fez a rotina enquanto você estava fora')
    expect(falaDoJogoFechado(true, 2)).toContain('Os Lumis também fizeram as rotinas.')
    expect(falaDoJogoFechado(true, 1)?.match(/enquanto você estava fora/g)).toHaveLength(1)
  })

  test('quanto falta para colher, no tempo de verdade', () => {
    expect(textoDoTempo(0)).toBe('menos de um minuto')
    expect(textoDoTempo(MIN)).toBe('um minuto')
    expect(textoDoTempo(5 * MIN)).toBe('5 minutos')
    expect(textoDoTempo(60 * MIN)).toBe('uma hora')
    expect(textoDoTempo(61 * MIN)).toBe('uma hora e um minuto')
    expect(textoDoTempo(200 * MIN)).toBe('3 horas e 20 minutos')
    const regado = { ...plantado().horta[0]!, regadoEm: new Date(T0).toISOString() }
    expect(falaDeQuandoColhe(regado, T0, undefined)).toContain(
      'daqui a 4 horas, no tempo de verdade',
    )
    expect(falaDeQuandoColhe(regado, T0 + CRESCIMENTO_MS.alface, undefined)).toBe(
      'Já dá para colher.',
    )
    expect(falaDeQuandoColhe(plantado().horta[0]!, T0, undefined)).toBeNull()
  })

  test('a fala do humor ótimo vem quando ele chega, sem repetir na beira dos 60', () => {
    expect(deveFalarDoHumor(null, true, null, 0)).toBe(false)
    expect(deveFalarDoHumor(true, true, null, 0)).toBe(false)
    expect(deveFalarDoHumor(false, false, null, 0)).toBe(false)
    expect(deveFalarDoHumor(false, true, null, 0)).toBe(true)
    expect(deveFalarDoHumor(false, true, 0, 5 * MIN)).toBe(false)
    expect(deveFalarDoHumor(false, true, 0, HUMOR_OTIMO.falaACadaMs)).toBe(true)
  })

  test('os textos seguem as regras da criança e a boa-noite não promete crescer dormindo', () => {
    const textos = [
      falaDoJogoFechado(true, 2)!,
      falaDoJogoFechado(false, 1)!,
      falaDeQuandoColhe(
        { ...plantado().horta[0]!, regadoEm: new Date(T0).toISOString() },
        T0,
        undefined,
      )!,
      HUMOR_OTIMO.fala,
      HUMOR_OTIMO.explicacao,
      BOA_NOITE,
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/[—–!]/)
      expect(t.trim().endsWith('?')).toBe(false)
    }
    expect(BOA_NOITE).not.toMatch(/enquanto você dorme/)
    expect(BOA_NOITE).toContain('tempo de verdade')
  })
})
