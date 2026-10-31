import { expect, test } from 'bun:test'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  ILHA_IDS,
  ilhaVisitada,
} from '@sistemazero/arquipelago-contracts'
import { observarDescoberta } from '../src/estado/exploracao'
import { criarLoja, type EstadoDoJogo } from '../src/estado/loja'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { type AreaDaDescoberta, registrarDescoberta } from '../src/sistemas/exploracao'
import { ilhasNoMapa, visitadasNoMapa } from '../src/sistemas/mapa'

const base = () => criarSalvamentoInicial(new Date('2026-10-30T10:00:00Z'))
const area: AreaDaDescoberta = { ilha: 'bosque', x: 80, z: 20, raio: 12, alturaMinima: 1 }
const dentro = { x: 80, y: 2, z: 20 }

test('presença apoiada registra uma vez, sem recompensa e sem mutar a entrada', () => {
  const s = base()
  const novo = registrarDescoberta(s, area, dentro, 2, true)
  expect(novo).toEqual({ ...s, ilhasVisitadas: 2 })
  expect(s.ilhasVisitadas).toBe(0)
  expect(registrarDescoberta(novo, area, dentro, 2, true)).toBe(novo)
  expect(novo.inventario).toBe(s.inventario)
})

test('posto sozinho, ponte, mar, voo e posição inválida não comprovam presença', () => {
  const s = base()
  expect(registrarDescoberta(s, area, dentro, 1, true)).toBe(s)
  expect(registrarDescoberta(s, area, dentro, 8, false)).toBe(s)
  for (const p of [
    { ...dentro, x: 92.01 },
    { ...dentro, y: 0 },
    { ...dentro, x: NaN },
    { ...dentro, z: Infinity },
    { ...dentro, y: NaN },
  ])
    expect(registrarDescoberta(s, area, p, 8, true)).toBe(s)
  expect(registrarDescoberta(s, area, { ...dentro, x: 92 }, 8, true).ilhasVisitadas).toBe(2)
})

test('Nuvens só registra no nível da ilha, nunca no mar abaixo', () => {
  const s = base()
  const nuvens = { ...area, ilha: 'nuvens' as const, alturaMinima: 8 }
  expect(registrarDescoberta(s, nuvens, dentro, 8, true)).toBe(s)
  expect(
    ilhaVisitada(
      registrarDescoberta(s, nuvens, { ...dentro, y: 9 }, 8, true).ilhasVisitadas,
      'nuvens',
    ),
  ).toBe(true)
})

test('mapa mantém acesso e descoberta separados, inclusive depois de mudar o posto', () => {
  expect(ilhasNoMapa(8, 'bosque').every((i) => i.aberta && !i.visitada)).toBe(true)
  const marcado = ilhasNoMapa(1, 'sua-ilha', 255)
  expect(marcado.every((i) => i.visitada)).toBe(true)
  expect(marcado.filter((i) => i.aberta)).toHaveLength(1)
  expect(visitadasNoMapa(255)).toBe(ILHA_IDS.length)
  expect(visitadasNoMapa(0)).toBe(0)
})

test('conflitos juntam visitas de sessões distintas sem perder nem duplicar itens', () => {
  const s = base()
  const a = { ...s, ilhasVisitadas: 3 }
  const b = { ...s, ilhasVisitadas: 5 }
  expect(conciliarSalvamento(s, a, b)).toEqual({ ...s, ilhasVisitadas: 7 })
  expect(conciliarSalvamento(s, b, a)).toEqual({ ...s, ilhasVisitadas: 7 })
  expect(
    conciliarSalvamento(s, { ...a, inventario: { milho: 2 } }, { ...b, inventario: { milho: 3 } }),
  ).toBeNull()
})

test('observador real não grava na pausa, visita, suporte, mar ou chão carregando', async () => {
  const plataforma = criarPlataformaFalsa({ persistir: false })
  let gravacoes = 0
  const loja = criarLoja({
    salvamento: base(),
    jornada: 8,
    quarto: await plataforma.lerQuarto(),
    avatar: await plataforma.lerAvatar(),
    acesso: AcessoSchema.parse((await plataforma.servico.buscar('/acesso')).corpo),
    aoMudar() {
      gravacoes++
    },
  })
  const pedidos = { teleporte: null, chaoChegando: new Set<string>() }
  const ver = () => observarDescoberta(loja, area, dentro, { noChao: true }, pedidos)
  const bloqueios: Partial<EstadoDoJogo>[] = [
    { menuAberto: true },
    { painelAberto: 'mapa' },
    { ferramentaAberta: true },
    { tempoAcabou: true },
    { tempoPausado: true },
    { tempoSincronizando: true },
    { salvamentoSituacao: 'conflito' },
    { salvamentoSituacao: 'erro-local' },
    { salvamentoSituacao: 'recusado' },
    { nadando: true },
    { modo: 'barco' },
    { modo: 'balao' },
    { modo: 'planar' },
    { acesso: { ...loja.getState().acesso, somenteLeitura: true } },
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
  ]
  for (const patch of bloqueios) {
    const antes = loja.getState()
    loja.setState(patch)
    ver()
    expect(loja.getState().salvamento.ilhasVisitadas).toBe(0)
    loja.setState(antes)
  }
  observarDescoberta(loja, area, dentro, { noChao: false }, pedidos)
  observarDescoberta(loja, area, dentro, { noChao: true }, { ...pedidos, teleporte: dentro })
  pedidos.chaoChegando.add('bosque')
  ver()
  expect(gravacoes).toBe(0)
  pedidos.chaoChegando.clear()
  ver()
  for (let i = 0; i < 1000; i++) ver()
  expect(gravacoes).toBe(1)
  expect(loja.getState().salvamento.ilhasVisitadas).toBe(2)
})
