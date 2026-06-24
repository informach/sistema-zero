import { describe, expect, test } from 'bun:test'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import {
  DESAFIO_VALUE_SCHEMA,
  desafioComputePerfil,
  desafioDerive,
  desafioRenderCorpo,
} from '../../src/funnels/desafio-primeiro-jogo/quiz'
import { getFunnel, isQuizComplete } from '../../src/funnels/registry'

// Conjunto completo de respostas do quiz do Desafio (10 perguntas + derivados da P6).
const FULL_ANSWERS = {
  perfil_p1: 'foguete',
  horas_tela_passiva_dia: 3,
  foco_onde: 'jogos',
  ja_largou: 'sim',
  maior_incomodo: 'consome_nao_cria',
  dias_por_semana: 5,
  horas_ano_calculadas: 780,
  incomodo_tempo_tela: 8,
  visualizacao: 'mostrar_familia',
  o_que_pesa: 'terminar',
  o_que_quer: 'criar_proprio',
}

describe('registro do funil Desafio', () => {
  test('resolve por audience/produto e é kids com tema kids', () => {
    const f = getFunnel('kids', 'desafio-primeiro-jogo')
    expect(f).toBe(DESAFIO_PRIMEIRO_JOGO)
    expect(f?.audience).toBe('kids')
    expect(f?.theme).toBe('kids')
    // Oferta tem layout próprio → sem `sales` (a rota despacha o body do Desafio).
    expect(f?.content.sales).toBeUndefined()
  })
})

describe('desafioDerive', () => {
  test('horas/ano = horas/dia × dias/semana × 52', () => {
    expect(desafioDerive({ horas_tela_passiva_dia: 3, dias_por_semana: 5 })).toEqual({
      horas_ano_calculadas: 780,
    })
  })
  test('sem os dois campos → não deriva', () => {
    expect(desafioDerive({ horas_tela_passiva_dia: 3 })).toEqual({})
    expect(desafioDerive({})).toEqual({})
  })
})

describe('desafioComputePerfil', () => {
  test('perfil = a própria resposta da P1', () => {
    expect(desafioComputePerfil({ perfil_p1: 'investigador' })).toBe('investigador')
  })
  test('sem P1 → string vazia (resultado.astro redireciona ao quiz)', () => {
    expect(desafioComputePerfil({})).toBe('')
  })
})

describe('desafioRenderCorpo', () => {
  test('interpola {resposta_p3}/{resposta_p5}/{resultado} e não deixa marcadores', () => {
    const corpo = DESAFIO_PRIMEIRO_JOGO.content.result?.profiles.foguete?.corpo ?? ''
    const out = desafioRenderCorpo(corpo, FULL_ANSWERS)
    expect(out).toContain('jogos')
    expect(out).toContain('quase nada disso vira algo criado por ele') // rótulo da P5
    expect(out).toContain('780') // horas/ano formatado
    expect(out).not.toContain('{resposta_p3}')
    expect(out).not.toContain('{resposta_p5}')
    expect(out).not.toContain('{resultado}')
  })
})

describe('DESAFIO_VALUE_SCHEMA', () => {
  test('valida enums e tetos numéricos', () => {
    expect(DESAFIO_VALUE_SCHEMA.perfil_p1.safeParse('explorador').success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.perfil_p1.safeParse('inexistente').success).toBe(false)
    expect(DESAFIO_VALUE_SCHEMA.horas_tela_passiva_dia.safeParse(3).success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.horas_tela_passiva_dia.safeParse(25).success).toBe(false)
    expect(DESAFIO_VALUE_SCHEMA.incomodo_tempo_tela.safeParse(0).success).toBe(false)
    expect(DESAFIO_VALUE_SCHEMA.incomodo_tempo_tela.safeParse(10).success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.ja_largou.safeParse('sim').success).toBe(true)
    expect(DESAFIO_VALUE_SCHEMA.ja_largou.safeParse('talvez').success).toBe(false)
  })
})

describe('isQuizComplete (Desafio, com os tipos novos)', () => {
  const quiz = DESAFIO_PRIMEIRO_JOGO.content.quiz
  test('só completo com todas as respostas + derivados da calculadora', () => {
    if (!quiz) throw new Error('Desafio deve ter quiz')
    expect(isQuizComplete(quiz, { perfil_p1: 'foguete' })).toBe(false)
    // Falta o resultado/2º campo da calculadora (P6).
    const semCalc = { ...FULL_ANSWERS } as Record<string, string | number>
    delete semCalc.dias_por_semana
    delete semCalc.horas_ano_calculadas
    expect(isQuizComplete(quiz, semCalc)).toBe(false)
    expect(isQuizComplete(quiz, FULL_ANSWERS)).toBe(true)
  })
})
