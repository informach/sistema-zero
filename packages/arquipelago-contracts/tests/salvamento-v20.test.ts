import { expect, test } from 'bun:test'
import { CasaDoIrmaoSchema, VERSAO_DAS_VISITAS } from '../src/familia'
import { MOVEIS, MOVEIS_NA_CASA_MAXIMO, type MovelNaObra } from '../src/moveis'
import {
  criarSalvamentoInicial,
  type ExposicaoDoFarol,
  migrarDaV19,
  migrarDaV20,
  migrarDaV21,
  migrarSalvamento,
  type ObraAteV19,
  SalvamentoV19Schema,
  SalvamentoV22Schema,
  VAGAS_DA_GALERIA_DO_FAROL,
  VERSAO_SALVAMENTO,
} from '../src/salvamento'
import { inicialV19 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-30T15:00:00Z')
const UUID = '7d3f2c1a-5b6e-4f80-9a1b-2c3d4e5f6a7b'
const OUTRO_UUID = '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d'

const obraAntiga = (): ObraAteV19 => ({
  paredes: [{ x: 6, z: -8, eixo: 'x', n: 4 }],
  aberturas: [{ tipo: 'porta', x: 7, z: -8, eixo: 'x' }],
  pisos: [{ x: 7, z: -7, tipo: 'ladrilho' }],
  objetos: [{ id: 'geladeira', x: 8, z: -7, giro: 1 }],
  cercas: [],
  caminhos: [],
  canteiros: [],
})

test('a lista dos móveis só cresce no fim: a ordem dos 21 primeiros nunca muda', () => {
  expect(VERSAO_SALVAMENTO).toBe(22)
  // Desde 31/10/2026 o café, a banca e a festa vêm depois deles (B7 e B9).
  expect(MOVEIS.slice(0, 21)).toEqual([
    'balcao-pia',
    'balcao',
    'armario-alto',
    'mesa-cozinha',
    'cadeira-cozinha',
    'prateleira-potes',
    'sofa',
    'poltrona',
    'mesinha-centro',
    'tapete',
    'estante-baixa',
    'luminaria-pe',
    'planta',
    'quadro',
    'banheira',
    'pia-banheiro',
    'espelho',
    'vaso-sanitario',
    'box-chuveiro',
    'tapetinho',
    'toalheiro',
  ])
})

test('a V19 continua estrita e migra sem móvel nem exposição, com casa e cabana', () => {
  const antiga = {
    ...inicialV19(AGORA),
    construcao: { casa: obraAntiga(), cabanas: { bosque: { ...obraAntiga(), objetos: [] } } },
    farol: { pagina: true, concluido: true },
  }
  const antes = structuredClone(antiga)
  expect(SalvamentoV19Schema.parse(antiga)).toEqual(antiga)
  const atual = migrarSalvamento(antiga)
  expect(atual).toEqual(migrarDaV21(migrarDaV20(migrarDaV19(antiga))))
  expect(atual?.versao).toBe(22)
  expect(atual?.construcao.casa).toEqual({ ...obraAntiga(), moveis: [] })
  expect(atual?.construcao.cabanas.bosque).toEqual({ ...obraAntiga(), objetos: [], moveis: [] })
  expect(atual?.farol).toEqual({ pagina: true, concluido: true, galeria: [] })
  expect(antiga).toEqual(antes)
  // A V19 não aceita os campos novos.
  const comMovel = { ...antiga.construcao.casa, moveis: [] }
  expect(
    SalvamentoV19Schema.safeParse({ ...antiga, construcao: { casa: comMovel, cabanas: {} } })
      .success,
  ).toBe(false)
  expect(
    SalvamentoV19Schema.safeParse({ ...antiga, farol: { ...antiga.farol, galeria: [] } }).success,
  ).toBe(false)
})

test('móveis e galeria atravessam o JSON, com as vagas vazias no lugar', () => {
  const s = criarSalvamentoInicial(AGORA)
  const moveis: MovelNaObra[] = [
    [0, -5, -3, 0],
    [MOVEIS.indexOf('quadro'), 7, -2, 3],
  ]
  const salvo = {
    ...s,
    construcao: { casa: { ...obraAntiga(), moveis }, cabanas: {} },
    farol: {
      pagina: true,
      concluido: true,
      galeria: [
        ['a', 'geladeira', 'pinta-123'] satisfies ExposicaoDoFarol,
        null,
        ['j', UUID] satisfies ExposicaoDoFarol,
        ['d', UUID] satisfies ExposicaoDoFarol,
      ],
    },
  }
  expect(migrarSalvamento(JSON.parse(JSON.stringify(salvo)))).toEqual(salvo)
})

test('fora da régua: móvel desconhecido, giro ou célula, móvel na cabana e casa cheia demais', () => {
  const s = criarSalvamentoInicial(AGORA)
  const comCasa = (moveis: unknown[]) =>
    SalvamentoV22Schema.safeParse({
      ...s,
      construcao: { casa: { ...obraAntiga(), moveis }, cabanas: {} },
    }).success
  expect(comCasa([[MOVEIS.length - 1, 0, 0, 3]])).toBe(true)
  for (const ruim of [
    [MOVEIS.length, 0, 0, 0],
    [-1, 0, 0, 0],
    [0, 0, 0, 4],
    [0, 61, 0, 0],
    [0, 0.5, 0, 0],
    [0, 0, 0],
    { id: 'sofa', x: 0, z: 0, giro: 0 },
  ])
    expect([ruim, comCasa([ruim])]).toEqual([ruim, false])
  const cheia = Array.from({ length: MOVEIS_NA_CASA_MAXIMO }, (): MovelNaObra => [0, 0, 0, 0])
  expect(comCasa(cheia)).toBe(true)
  expect(comCasa([...cheia, [0, 0, 0, 0]])).toBe(false)
  // Os móveis são da casa: a cabana guarda a lista vazia.
  const naCabana = (moveis: unknown[]) =>
    SalvamentoV22Schema.safeParse({
      ...s,
      construcao: { casa: null, cabanas: { bosque: { ...obraAntiga(), objetos: [], moveis } } },
    }).success
  expect(naCabana([])).toBe(true)
  expect(naCabana([[0, 0, 0, 0]])).toBe(false)
})

test('a galeria só se enche com o final concluído, sem repetir criação e com seis vagas', () => {
  const s = criarSalvamentoInicial(AGORA)
  const com = (farol: object) => SalvamentoV22Schema.safeParse({ ...s, farol }).success
  const fim = { pagina: true, concluido: true }
  expect(com({ ...fim, galeria: [['j', UUID]] })).toBe(true)
  expect(com({ pagina: true, concluido: false, galeria: [['j', UUID]] })).toBe(false)
  expect(com({ pagina: true, concluido: false, galeria: [null, null] })).toBe(true)
  expect(com({ ...fim, galeria: [['j', UUID], null, ['j', UUID]] })).toBe(false)
  // O mesmo id em tipos diferentes são criações diferentes.
  expect(
    com({
      ...fim,
      galeria: [
        ['j', UUID],
        ['d', UUID],
      ],
    }),
  ).toBe(true)
  const seis = Array.from({ length: VAGAS_DA_GALERIA_DO_FAROL }, () => null)
  expect(com({ ...fim, galeria: seis })).toBe(true)
  expect(com({ ...fim, galeria: [...seis, null] })).toBe(false)
  for (const ruim of [
    ['j', 'nao-e-uuid'],
    ['d', ''],
    ['a', 'sofa', 'x'],
    ['a', 'geladeira', ''],
    ['a', 'geladeira', 'x'.repeat(41)],
    ['x', UUID],
    ['j', UUID, OUTRO_UUID],
  ])
    expect([ruim, com({ ...fim, galeria: [ruim] })]).toEqual([ruim, false])
})

test('a visita aceita a obra com móveis e a de antes, que chega com a lista vazia', () => {
  const casa = {
    versao: VERSAO_DAS_VISITAS,
    perfilId: UUID,
    horta: [],
    completos: [],
    quarto: null,
  }
  const nova = { ...obraAntiga(), moveis: [[0, 1, 2, 3]] satisfies MovelNaObra[] }
  expect(CasaDoIrmaoSchema.parse({ ...casa, obra: nova }).obra).toEqual(nova)
  expect(CasaDoIrmaoSchema.parse({ ...casa, obra: obraAntiga() }).obra).toEqual({
    ...obraAntiga(),
    moveis: [],
  })
  expect(
    CasaDoIrmaoSchema.safeParse({ ...casa, obra: { ...nova, moveis: [[99, 0, 0, 0]] } }).success,
  ).toBe(false)
})

test('a V19 do staging chega à V20 com as chaves da obra e o bicho adotado acompanhando', async () => {
  const { migrarDaV19, BIT_DO_COMODO } = await import('../src')
  const v19 = inicialV19(AGORA)
  const obra = {
    paredes: [],
    aberturas: [],
    pisos: [{ x: 0, z: 0, tipo: 'ladrilho' as const }],
    objetos: [],
    cercas: [],
    caminhos: [],
    canteiros: [],
  }
  const adotado = {
    id: 'gato' as const,
    nome: 'Mingau',
    fase: 'filhote' as const,
    fome: 80,
    limpeza: 80,
    carinho: 80,
    diasCuidados: 0,
    diaCuidadoEm: null,
    truque: { sessoes: 0, ultimaEm: null, aprendido: false },
  }
  const v20 = migrarDaV20(
    migrarDaV19({
      ...v19,
      chaves: BIT_DO_COMODO.sala,
      companhia: 'quarto',
      construcao: { casa: obra, cabanas: {} },
      bichos: { ...v19.bichos, adotado },
    }),
  )
  expect(v20.chaves).toBe(BIT_DO_COMODO.sala | BIT_DO_COMODO.cozinha)
  expect(v20.companhia).toBe('adotado')
  // Sem bicho adotado, a companhia fica como estava.
  expect(migrarDaV20(migrarDaV19({ ...v19, companhia: 'quarto' })).companhia).toBe('quarto')
})
