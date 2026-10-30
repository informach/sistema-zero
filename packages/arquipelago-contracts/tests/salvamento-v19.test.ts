import { expect, test } from 'bun:test'
import {
  BIT_DA_SEGREDO_MAXIMO,
  BIT_DO_COMODO,
  COMODOS_DA_IRIS,
  chaveAchada,
  juntarMapas,
  MAPA_VAZIO,
  MAPAS_DAS_ILHAS,
} from '../src/exploracao'
import {
  criarSalvamentoInicial,
  migrarDaV18,
  migrarDaV19,
  migrarSalvamento,
  PERCURSOS,
  SalvamentoV18Schema,
  SalvamentoV20Schema,
} from '../src/salvamento'
import { inicialV18 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-30T12:00:00Z')
const percurso = { estrelas: { chegada: true, tempo: false, vagalumes: true }, melhorTempoMs: 9000 }

test('V18 continua estrita e migra sem presumir chave, segredo, mapa ou companhia', () => {
  const antiga = { ...inicialV18(AGORA), ilhasVisitadas: 9 }
  const antes = structuredClone(antiga)
  expect(SalvamentoV18Schema.parse(antiga)).toEqual(antiga)
  expect(migrarDaV18(antiga)).toEqual({
    ...antiga,
    versao: 19,
    chaves: 0,
    segredos: 0,
    mapa: {},
    companhia: 'quarto',
  })
  expect(migrarSalvamento(antiga)).toEqual(migrarDaV19(migrarDaV18(antiga)))
  expect(antiga).toEqual(antes)
  for (const campo of [{ chaves: 0 }, { segredos: 0 }, { mapa: {} }, { companhia: 'quarto' }])
    expect(SalvamentoV18Schema.safeParse({ ...antiga, ...campo }).success).toBe(false)
  // Os percursos novos não entram numa V18.
  expect(
    SalvamentoV18Schema.safeParse({ ...antiga, percursos: { 'praia-pedras': percurso } }).success,
  ).toBe(false)
})

test('os campos novos da V19 atravessam JSON', () => {
  const s = criarSalvamentoInicial(AGORA)
  const cheio = {
    ...s,
    percursos: Object.fromEntries(PERCURSOS.map((p) => [p, percurso])),
    chaves: 15,
    segredos: BIT_DA_SEGREDO_MAXIMO * 2 - 1,
    mapa: Object.fromEntries(MAPAS_DAS_ILHAS.map((id) => [id, '0123456789abcdef'])),
    companhia: 'adotado' as const,
  }
  expect(migrarSalvamento(JSON.parse(JSON.stringify(cheio)))).toEqual(cheio)
})

test('valores fora da régua são recusados', () => {
  const s = criarSalvamentoInicial(AGORA)
  const ruins = [
    { chaves: 16 },
    { chaves: -1 },
    { chaves: 1.5 },
    { segredos: BIT_DA_SEGREDO_MAXIMO * 2 },
    { mapa: { farol: MAPA_VAZIO } },
    { mapa: { bosque: 'FFFFFFFFFFFFFFFF' } },
    { mapa: { bosque: 'fff' } },
    { companhia: 'gato' },
    { percursos: { 'praia-inventada': percurso } },
  ]
  for (const ruim of ruins)
    expect(SalvamentoV20Schema.safeParse({ ...s, ...ruim }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 21 })).toBeNull()
})

test('cada cômodo tem um bit fixo e o mapa junta as células das duas sessões', () => {
  expect(BIT_DO_COMODO).toEqual({ cozinha: 1, sala: 2, banheiro: 4, quintal: 8 })
  for (const comodo of COMODOS_DA_IRIS) {
    expect(chaveAchada(BIT_DO_COMODO[comodo], comodo)).toBe(true)
    expect(chaveAchada(15 & ~BIT_DO_COMODO[comodo], comodo)).toBe(false)
  }
  expect(juntarMapas('000000000000000f', 'f000000000000000')).toBe('f00000000000000f')
  expect(juntarMapas(undefined, '0000000000000001')).toBe('0000000000000001')
  expect(juntarMapas(undefined, undefined)).toBe(MAPA_VAZIO)
})
