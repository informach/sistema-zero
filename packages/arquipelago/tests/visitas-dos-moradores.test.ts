import { describe, expect, test } from 'bun:test'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  type QuartoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { lojaDosConvidados } from '../src/estado/convidados'
import { criarLoja } from '../src/estado/loja'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { aconchegoDosComodos } from '../src/sistemas/construcao/aconchego'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { encontroNaCasa, MORADORES_CONVIDAVEIS } from '../src/sistemas/visitas-dos-moradores'

const dia = '2026-10-29'
function dados() {
  const s = criarSalvamentoInicial(new Date(`${dia}T12:00:00Z`))
  s.casa.portaNova = true
  for (const quem of MORADORES_CONVIDAVEIS) s.moradores[quem].conversaEm = dia
  const quarto: QuartoDoJogo = {
    theme: 'padrao',
    pet: null,
    placedItems: [
      { itemId: 'planta', x: 0, y: 0 },
      { itemId: 'cacto', x: 3, y: 0 },
      { itemId: 'vela', x: 5, y: 0 },
      { itemId: 'luminaria', x: 7, y: 0 },
      { itemId: 'vaso-flores', x: 9, y: 0 },
    ],
  }
  return { s, quarto }
}
describe('moradores convidados pelo aconchego', () => {
  test('recebe uma visita e até três na festa sem mudar save ou quarto', () => {
    const { s, quarto } = dados()
    const antes = JSON.stringify({ s, quarto })
    const visita = encontroNaCasa(s, quarto, 7, 'perfil', dia, 'visita')
    const festa = encontroNaCasa(s, quarto, 7, 'perfil', dia, 'festa')
    expect(visita.motivo).toBe('pronto')
    expect(visita.convidados).toHaveLength(1)
    expect(festa.convidados).toHaveLength(3)
    expect(festa.pontos).toBeGreaterThanOrEqual(22)
    expect(encontroNaCasa(s, quarto, 7, 'perfil', dia, 'festa')).toEqual(festa)
    expect(JSON.stringify({ s, quarto })).toBe(antes)
    for (const c of festa.convidados) {
      expect(c.x).toBeGreaterThan(-6)
      expect(c.x).toBeLessThan(6)
      expect(c.z).toBeLessThan(-1)
      expect(c.z).toBeGreaterThan(-6)
      for (const outro of festa.convidados)
        if (outro !== c) expect(Math.hypot(c.x - outro.x, c.z - outro.z)).toBeGreaterThanOrEqual(3)
    }
  })
  test('não convida morador desconhecido ou de ilha ainda fechada', () => {
    const { s, quarto } = dados()
    expect(encontroNaCasa(s, quarto, 1, 'p', dia, 'visita').motivo).toBe('amizade')
    expect(encontroNaCasa(s, quarto, 2, 'p', dia, 'festa').convidados.map((c) => c.quem)).toEqual([
      'capi',
    ])
    s.moradores.capi.conversaEm = null
    expect(encontroNaCasa(s, quarto, 2, 'p', dia, 'visita').motivo).toBe('amizade')
    s.casa.portaNova = false
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'festa').motivo).toBe('casa')
  })
  test('casa lotada e porta obstruída não recebem, mesmo com pontos', () => {
    const { s, quarto } = dados()
    quarto.placedItems.push({ itemId: 'planta', x: 8, y: 7 })
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'festa').motivo).toBe('espaco')
    quarto.placedItems = Array.from({ length: 96 }, (_, i) => ({
      itemId: 'planta',
      x: i % 12,
      y: Math.floor(i / 12),
    }))
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'visita').convidados).toEqual([])
  })
  test('parede separando a porta dos cômodos não vira passagem para convidados', () => {
    const { s, quarto } = dados()
    s.construcao.casa = structuredClone(LOTE_DA_CASA.obraInicial)
    s.construcao.casa.paredes.push({ x: -6, z: -2, eixo: 'x', n: 12 })
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'visita').convidados).toEqual([])
    s.construcao.casa.aberturas.push({ tipo: 'porta', x: 1, z: -2, eixo: 'x' })
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'visita').convidados).toHaveLength(1)
  })
  test('não aparece no corpo do avatar e casa pouco arrumada não libera festa', () => {
    const { s, quarto } = dados()
    const primeiro = encontroNaCasa(s, quarto, 7, 'p', dia, 'visita').convidados[0]!
    const r = encontroNaCasa(s, quarto, 7, 'p', dia, 'visita', primeiro)
    expect(r.convidados.every((c) => Math.hypot(c.x - primeiro.x, c.z - primeiro.z) >= 2)).toBe(
      true,
    )
    const vazio = encontroNaCasa(s, { ...quarto, placedItems: [] }, 7, 'p', dia, 'festa')
    expect(vazio.motivo).toBe('aconchego')
  })
  test('duas salas abaixo de 22 não juntam seus pontos para liberar festa', () => {
    const { s, quarto } = dados()
    s.construcao.casa = structuredClone(LOTE_DA_CASA.obraInicial)
    s.construcao.casa.paredes.push({ x: 0, z: -8, eixo: 'z', n: 8 })
    s.construcao.casa.aberturas.push({ tipo: 'porta', x: 0, z: -4, eixo: 'z' })
    quarto.placedItems = [
      { itemId: 'planta', x: 0, y: 0 },
      { itemId: 'planta', x: 7, y: 0 },
    ]
    const salas = aconchegoDosComodos(s.construcao.casa, LOTE_DA_CASA, s.projetos, quarto)
    expect(salas).toHaveLength(2)
    expect(salas.reduce((soma, sala) => soma + sala.total, 0)).toBeGreaterThanOrEqual(22)
    expect(salas.every((sala) => sala.total < 22)).toBe(true)
    expect(encontroNaCasa(s, quarto, 7, 'p', dia, 'festa').motivo).toBe('aconchego')
  })
  test('o estado é por montagem e recusa suporte, visitas e interrupções', async () => {
    const { s, quarto } = dados()
    const p = criarPlataformaFalsa({ posicao: 7 })
    const loja = criarLoja({
      salvamento: s,
      quarto,
      jornada: 7,
      avatar: await p.lerAvatar(),
      acesso: AcessoSchema.parse((await p.servico.buscar('/acesso')).corpo),
      aoMudar() {
        throw new Error('Presença não grava')
      },
    })
    const visitas = lojaDosConvidados(loja)
    expect(visitas.getState().convidar('festa', 'p')).toBe(true)
    visitas.getState().dispensar()
    expect(visitas.getState().tipo).toBe('descanso')
    for (const patch of [
      { tempoAcabou: true },
      { tempoPausado: true },
      { tempoSincronizando: true },
      { salvamentoSituacao: 'conflito' as const },
      { dentroDeCasa: false },
      { painelAberto: 'construir' },
      {
        visita: {
          perfilId: 'outro',
          nome: 'Visita de teste',
          obra: null,
          horta: [],
          completos: [],
          quarto: null,
        },
      },
      { acesso: { ...loja.getState().acesso, somenteLeitura: true } },
    ]) {
      const anterior = loja.getState()
      loja.setState(patch)
      expect(visitas.getState().convidar('festa', 'p')).toBe(false)
      loja.setState(anterior)
    }
    expect(loja.getState().salvamento).toBe(s)
  })
})
