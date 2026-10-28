import { describe, expect, test } from 'bun:test'
import {
  PERMISSOES_PADRAO,
  PermissoesDaFamiliaSchema,
  SemanaDaFamiliaParaOsPaisSchema,
  SemanaDaFamiliaSchema,
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
