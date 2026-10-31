import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  acaoEmCurso,
  encerraOTempo,
  FALA_DO_TEMPO_ACABANDO,
  FALA_DO_TEMPO_ACABOU,
  GRACA_DO_FIM_DO_TEMPO_MS,
} from '../src/sistemas/fim-do-tempo'
import { BOA_NOITE, fotoDoDia, lerFotoDoDia, resumoDoDia } from '../src/sistemas/resumo-do-dia'

const HOJE = '2026-10-30'
const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T09:00:00Z'))

describe('o fim do tempo no fim da ação (N07)', () => {
  test('corrida, balão, montaria, mergulho, barco ou painel contam como ação', () => {
    const parado = { corrida: null, modo: 'chao', painelAberto: null }
    expect(acaoEmCurso(parado)).toBe(false)
    expect(acaoEmCurso({ ...parado, corrida: { percurso: 'bosque-copas' } })).toBe(true)
    for (const modo of ['balao', 'montar', 'mergulho', 'barco'])
      expect(acaoEmCurso({ ...parado, modo })).toBe(true)
    expect(acaoEmCurso({ ...parado, painelAberto: 'bento' })).toBe(true)
  })

  test('sem ação encerra na hora; com ação, espera até o máximo', () => {
    expect(encerraOTempo(0, 0, false)).toBe(true)
    expect(encerraOTempo(0, GRACA_DO_FIM_DO_TEMPO_MS - 1, true)).toBe(false)
    expect(encerraOTempo(0, GRACA_DO_FIM_DO_TEMPO_MS, true)).toBe(true)
    for (const t of [FALA_DO_TEMPO_ACABANDO, FALA_DO_TEMPO_ACABOU]) expect(t).not.toMatch(/[—–!]/)
  })
})

describe('o resumo do dia (N06)', () => {
  test('um dia sem nada novo não tem linhas; só a boa-noite', () => {
    const s = inicial()
    expect(resumoDoDia(fotoDoDia(s, HOJE), s, HOJE)).toEqual([])
    expect(BOA_NOITE).not.toMatch(/[—–!]/)
  })

  test('conta o que ela fez de bom no dia, em frases curtas', () => {
    const antes = inicial()
    const foto = fotoDoDia(antes, HOJE)
    const depois = structuredClone(antes)
    depois.lumis = { pitanga: 1, quindim: 1 }
    depois.percursos = {
      'bosque-copas': [3, 20000] as [number, number],
    }
    depois.moradores.capi = {
      ...depois.moradores.capi,
      amizade: 120,
      pedido: { dia: HOJE, id: 'x', entregue: true },
    }
    depois.pontesVistas = ['bosque']
    depois.ilhasVisitadas = 2
    depois.chaves = 1
    const linhas = resumoDoDia(foto, depois, HOJE)
    expect(linhas).toEqual([
      '2 Lumis presos com a lanterna.',
      '2 estrelas novas nos percursos.',
      '1 pedido entregue: Capi.',
      '1 coração novo com Capi.',
      'A ponte para o Bosque dos Bichos ficou pronta.',
      '1 ilha visitada pela primeira vez.',
      '1 chave achada na sua ilha.',
    ])
    for (const l of linhas) expect(l).not.toMatch(/[—–!]/)
  })

  test('a foto guardada só vale no mesmo dia', () => {
    const f = fotoDoDia(inicial(), HOJE)
    expect(lerFotoDoDia(JSON.stringify(f), HOJE)).toEqual(f)
    expect(lerFotoDoDia(JSON.stringify(f), '2026-10-31')).toBeNull()
    expect(lerFotoDoDia('{quebrado', HOJE)).toBeNull()
    expect(lerFotoDoDia(null, HOJE)).toBeNull()
  })
})
