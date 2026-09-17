import { describe, expect, test } from 'bun:test'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import {
  DESAFIO_VALUE_SCHEMA,
  desafioComputePerfil,
  desafioDesejoLabel,
  desafioRenderCorpo,
} from '../../src/funnels/desafio-primeiro-jogo/quiz'
import { getFunnel, isQuizComplete } from '../../src/funnels/registry'

const FULL_ANSWERS = {
  uso_digital_atual: 'joga_pronto',
  perfil_p1: 'foguete',
  perfil_p2: 'investigador',
  perfil_p3: 'foguete',
  perfil_p4: 'foguete',
  resultado_desejado: 'mostrar_criacao',
  apoio_para_comecar: 'projeto_curto',
}

describe('registro do funil Desafio', () => {
  test('resolve por audience/produto e preserva o contrato público de 30 dias', () => {
    const f = getFunnel('kids', 'desafio-primeiro-jogo')
    expect(f).toBe(DESAFIO_PRIMEIRO_JOGO)
    expect(f?.audience).toBe('kids')
    expect(f?.theme).toBe('kids')
    expect(f?.content.sales).toBeUndefined()
    expect(f?.lifetimeAccess).toBe(false)
    expect(f?.offerContract).toEqual({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      guaranteeDays: 7,
    })
  })
})

describe('desafioComputePerfil', () => {
  test('usa a maioria das quatro respostas de perfil', () => {
    expect(desafioComputePerfil(FULL_ANSWERS)).toBe('foguete')
  })

  test('usa a primeira resposta como desempate', () => {
    expect(
      desafioComputePerfil({
        perfil_p1: 'explorador',
        perfil_p2: 'investigador',
        perfil_p3: 'foguete',
        perfil_p4: 'especialista',
      }),
    ).toBe('explorador')
  })

  test('sem a primeira resposta retorna vazio', () => {
    expect(desafioComputePerfil({ perfil_p2: 'investigador' })).toBe('')
  })
})

describe('desafioRenderCorpo', () => {
  test('apresenta o perfil como uma leitura das respostas, não como diagnóstico', () => {
    const titles = Object.values(DESAFIO_PRIMEIRO_JOGO.content.result?.profiles ?? {}).map(
      (profile) => profile.titulo,
    )

    expect(titles).toHaveLength(4)
    for (const title of titles) expect(title).toStartWith('Pelas respostas,')
    expect(titles.join(' ')).not.toContain('aprender melhor')
  })

  test('interpola uso, desejo e apoio sem deixar marcadores', () => {
    const result = DESAFIO_PRIMEIRO_JOGO.content.result
    const secoes = result?.profiles.foguete?.secoes ?? []
    const bruto = [...secoes.map((s) => s.texto), result?.destaque ?? '', result?.fecho ?? ''].join(
      ' ',
    )
    const out = desafioRenderCorpo(bruto, FULL_ANSWERS)

    expect(out).toContain('jogar experiências que já estão prontas')
    expect(out).toContain('chamando a família para mostrar algo que criou')
    expect(out).toContain('um projeto curto, com uma chegada clara')
    expect(out).not.toMatch(/\{resposta_[^}]+\}/)
  })

  test('retoma o desejo no texto da oferta somente para valores conhecidos', () => {
    expect(desafioDesejoLabel('entender_tecnologia')).toBe(
      'entendendo melhor como a tecnologia funciona',
    )
    expect(desafioDesejoLabel('valor_forjado')).toBeNull()
  })
})

describe('DESAFIO_VALUE_SCHEMA', () => {
  test('aceita respostas previstas e rejeita valores desconhecidos', () => {
    expect(DESAFIO_VALUE_SCHEMA.uso_digital_atual.safeParse('joga_pronto').success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.perfil_p1.safeParse('explorador').success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.perfil_p4.safeParse('inexistente').success).toBe(false)
    expect(DESAFIO_VALUE_SCHEMA.resultado_desejado.safeParse('raciocinio').success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.apoio_para_comecar.safeParse('qualquer_coisa').success).toBe(false)
  })
})

describe('isQuizComplete (Desafio)', () => {
  const quiz = DESAFIO_PRIMEIRO_JOGO.content.quiz

  test('exige as sete respostas e não depende de campo derivado', () => {
    if (!quiz) throw new Error('Desafio deve ter quiz')
    expect(isQuizComplete(quiz, { perfil_p1: 'foguete' })).toBe(false)
    expect(isQuizComplete(quiz, FULL_ANSWERS)).toBe(true)

    const incompleto = { ...FULL_ANSWERS } as Record<string, string | number>
    delete incompleto.apoio_para_comecar
    expect(isQuizComplete(quiz, incompleto)).toBe(false)
  })
})
