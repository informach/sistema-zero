import { describe, expect, test } from 'bun:test'
import {
  AulasConcluidasDosMembrosSchema,
  type CasaDoIrmao,
  CasaDoIrmaoSchema,
  type IrmaosDoJogador,
  IrmaosDoJogadorSchema,
  IrmaosParaOJogoSchema,
  OBJETOS_DA_CASA,
  PERMISSOES_PADRAO,
  PermissoesDaFamiliaSchema,
  QuartoDosMembrosSchema,
  SemanaDaFamiliaParaOsPaisSchema,
  SemanaDaFamiliaSchema,
  VERSAO_DAS_VISITAS,
} from '../src'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const crianca = {
  perfilId: A,
  desafios: { aprovados: 3, deIlhasAnteriores: 1 },
  objetos: { pinta: 1, molda: 0 },
  tempoLivre: { segundos: 5400, dias: 4 },
}
const semana = {
  algumaCriancaVe: true,
  inicio: '2026-10-22',
  fim: '2026-10-28',
  limiteDiarioMinutos: 30,
  criancas: [crianca],
  aindaSemJogo: [B],
}

describe('a semana da família', () => {
  test('o resumo do serviço passa; dado que falta é null, nunca zero inventado', () => {
    expect(SemanaDaFamiliaSchema.parse(semana)).toEqual(semana)
    const semJornada = { ...crianca, desafios: { aprovados: 2, deIlhasAnteriores: null } }
    expect(SemanaDaFamiliaSchema.safeParse({ ...semana, criancas: [semJornada] }).success).toBe(
      true,
    )
    const semDesafios = { ...crianca, desafios: null }
    expect(SemanaDaFamiliaSchema.safeParse({ ...semana, criancas: [semDesafios] }).success).toBe(
      true,
    )
  })

  test('recusa número negativo, mais de 7 dias jogados e campo a mais', () => {
    const errado = (c: unknown) =>
      SemanaDaFamiliaSchema.safeParse({ ...semana, criancas: [c] }).success
    expect(errado({ ...crianca, tempoLivre: { segundos: -1, dias: 1 } })).toBe(false)
    expect(errado({ ...crianca, tempoLivre: { segundos: 10, dias: 8 } })).toBe(false)
    expect(errado({ ...crianca, nome: 'Lia' })).toBe(false)
    expect(SemanaDaFamiliaSchema.safeParse({ ...semana, inicio: '22/10/2026' }).success).toBe(false)
  })

  test('para os pais: cada criança com o nome da plataforma', () => {
    const paraOsPais = {
      ...semana,
      criancas: [{ ...crianca, nome: 'Lia' }],
      aindaSemJogo: [{ perfilId: B, nome: 'Tom' }],
    }
    expect(SemanaDaFamiliaParaOsPaisSchema.parse(paraOsPais)).toEqual(paraOsPais)
    expect(SemanaDaFamiliaParaOsPaisSchema.safeParse(semana).success).toBe(false)
    expect(
      SemanaDaFamiliaParaOsPaisSchema.safeParse({
        ...paraOsPais,
        criancas: [{ ...crianca, nome: 'Lia', extra: 1 }],
      }).success,
    ).toBe(false)
  })
})

describe('as permissões de visita', () => {
  test('o padrão restringe: irmãos sim; outras crianças e fotos no Clube, não', () => {
    expect(PERMISSOES_PADRAO).toEqual({
      visitasDeIrmaos: true,
      visitasDeOutrasCriancas: false,
      fotosNoClube: false,
    })
    expect(Object.isFrozen(PERMISSOES_PADRAO)).toBe(true)
  })

  test('as três chaves, todas obrigatórias e só booleanas', () => {
    expect(PermissoesDaFamiliaSchema.safeParse(PERMISSOES_PADRAO).success).toBe(true)
    expect(PermissoesDaFamiliaSchema.safeParse({ visitasDeIrmaos: true }).success).toBe(false)
    expect(
      PermissoesDaFamiliaSchema.safeParse({ ...PERMISSOES_PADRAO, fotosNoClube: 'sim' }).success,
    ).toBe(false)
    expect(PermissoesDaFamiliaSchema.safeParse({ ...PERMISSOES_PADRAO, chat: true }).success).toBe(
      false,
    )
  })
})

describe('a volta ao curso (29/10/2026)', () => {
  test('vem com os dias, sem leitura (null) ou ausente (serviço antigo)', () => {
    for (const voltaAoCurso of [{ dias: 2 }, null, undefined]) {
      const c = { ...crianca, voltaAoCurso }
      expect(SemanaDaFamiliaSchema.safeParse({ ...semana, criancas: [c] }).success).toBe(true)
    }
    for (const voltaAoCurso of [{ dias: 8 }, { dias: -1 }, { dias: 1, horas: 3 }]) {
      const c = { ...crianca, voltaAoCurso }
      expect(SemanaDaFamiliaSchema.safeParse({ ...semana, criancas: [c] }).success).toBe(false)
    }
  })

  test('as aulas concluídas que o Members manda: horas em ISO, uma linha por pessoa', () => {
    const ok = {
      usuarios: [
        { userId: A, concluidasEm: ['2026-10-27T14:00:00.000Z', '2026-10-28T09:30:00-03:00'] },
        { userId: B, concluidasEm: [] },
      ],
    }
    expect(AulasConcluidasDosMembrosSchema.parse(ok)).toEqual(ok)
    const semHora = { usuarios: [{ userId: A, concluidasEm: ['2026-10-27'] }] }
    expect(AulasConcluidasDosMembrosSchema.safeParse(semHora).success).toBe(false)
    const aMais = { usuarios: [{ userId: A, concluidasEm: [], aulas: 1 }] }
    expect(AulasConcluidasDosMembrosSchema.safeParse(aMais).success).toBe(false)
  })
})

describe('recordes da família e visitas (fase3-12)', () => {
  const recorde = {
    estrelas: { chegada: true, tempo: false, vagalumes: true },
    melhorTempoMs: 61_000,
  }
  const irmao = { perfilId: B, percursos: { 'bosque-copas': recorde }, temCasa: true }
  const irmaos = {
    versao: VERSAO_DAS_VISITAS,
    situacao: 'ok',
    irmaos: [irmao],
  } satisfies IrmaosDoJogador

  test('os irmãos vêm sem nome do serviço e com nome do BFF', () => {
    expect(IrmaosDoJogadorSchema.parse(irmaos)).toEqual(irmaos)
    expect(
      IrmaosDoJogadorSchema.safeParse({ ...irmaos, irmaos: [{ ...irmao, nome: 'Ana' }] }).success,
    ).toBe(false)
    const comNome = { ...irmaos, irmaos: [{ ...irmao, nome: 'Ana' }] }
    expect(IrmaosParaOJogoSchema.parse(comNome)).toEqual(comNome)
    expect(IrmaosParaOJogoSchema.safeParse(irmaos).success).toBe(false)
  })

  test('recusa versão desconhecida, situação fora da lista e percurso inventado', () => {
    expect(IrmaosDoJogadorSchema.safeParse({ ...irmaos, versao: 2 }).success).toBe(false)
    expect(IrmaosDoJogadorSchema.safeParse({ ...irmaos, situacao: 'talvez' }).success).toBe(false)
    expect(
      IrmaosDoJogadorSchema.safeParse({
        ...irmaos,
        irmaos: [{ perfilId: B, percursos: { 'pico-gelado': recorde }, temCasa: false }],
      }).success,
    ).toBe(false)
    expect(
      IrmaosDoJogadorSchema.parse({ versao: 1, situacao: 'desligado', irmaos: [] }).irmaos,
    ).toEqual([])
  })

  test('a casa do irmão leva só a obra, a horta, os objetos com aparência e o quarto', () => {
    const casa = {
      versao: VERSAO_DAS_VISITAS,
      perfilId: B,
      obra: null,
      horta: [{ id: 'c1', semente: 'alface', plantadoEm: '2026-10-29T12:00:00Z', regadoEm: null }],
      completos: ['geladeira'],
      quarto: { theme: 'padrao', placedItems: [{ itemId: 'cama', x: 0, y: 1, rot: 0 }], pet: null },
    } satisfies CasaDoIrmao
    expect(CasaDoIrmaoSchema.parse(casa)).toEqual(casa)
    expect(CasaDoIrmaoSchema.safeParse({ ...casa, inventario: {} }).success).toBe(false)
    expect(CasaDoIrmaoSchema.safeParse({ ...casa, completos: ['nave'] }).success).toBe(false)
    expect(
      CasaDoIrmaoSchema.parse({ ...casa, completos: [...OBJETOS_DA_CASA] }).completos,
    ).toHaveLength(OBJETOS_DA_CASA.length)
  })

  test('o quarto do irmão é o da plataforma ou null quando não abriu, nunca faltando', () => {
    const casa = {
      versao: VERSAO_DAS_VISITAS,
      perfilId: B,
      obra: null,
      horta: [],
      completos: [],
      quarto: null,
    } satisfies CasaDoIrmao
    expect(CasaDoIrmaoSchema.parse(casa).quarto).toBeNull()
    const { quarto: _, ...semQuarto } = casa
    expect(CasaDoIrmaoSchema.safeParse(semQuarto).success).toBe(false)
    const torto = { theme: 'padrao', placedItems: [{ itemId: '', x: 0, y: 0 }], pet: null }
    expect(CasaDoIrmaoSchema.safeParse({ ...casa, quarto: torto }).success).toBe(false)
  })

  test('o Members manda o quarto de um perfil e mais nada', () => {
    const quarto = { theme: 'espaco', placedItems: [], pet: 'pet-gato', floor: 'madeira' }
    expect(QuartoDosMembrosSchema.parse({ quarto })).toEqual({ quarto })
    expect(QuartoDosMembrosSchema.safeParse({ quarto, saldo: 3 }).success).toBe(false)
    expect(QuartoDosMembrosSchema.safeParse({}).success).toBe(false)
  })
})
