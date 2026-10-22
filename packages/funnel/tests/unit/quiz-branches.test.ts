import { describe, expect, test } from 'bun:test'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import type { SelecaoStep } from '../../src/content/quiz-config'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import { DESAFIO_ADULTO } from '../../src/funnels/desafio-adulto'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import { NO_COMANDO_DA_IA } from '../../src/funnels/no-comando-da-ia'
import {
  adminFunnelList,
  branchEventName,
  FUNNELS,
  type FunnelDef,
  quizHeadlineId,
  quizPathWithHeadline,
} from '../../src/funnels/registry'
import { buildFunnelSteps, stepConversions } from '../../src/server/admin'

const pergunta = (key: string, extra: Partial<SelecaoStep> = {}): SelecaoStep => ({
  id: 1,
  key,
  lastStep: `teste_${key}`,
  eventName: `respondeu_teste_${key}`,
  tipo: 'selecao',
  etapa: 'rotina',
  titulo: `Pergunta ${key}`,
  rotuloCurto: key,
  opcoes: [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ],
  ...extra,
})

/** Um quiz com duas perguntas comuns, dois ramos (um com extra) e uma saída sem perguntas. */
const RAMIFICADO: FunnelDef = {
  ...COMUNIDADE_DOS_CRIADORES,
  content: {
    ...COMUNIDADE_DOS_CRIADORES.content,
    quiz: {
      version: 'teste-ramos',
      steps: [
        pergunta('genero'),
        pergunta('idade'),
        pergunta('a1', { ramo: 'grande' }),
        pergunta('a2', { ramo: 'grande' }),
        pergunta('a_extra', { ramo: 'grande', condicional: true }),
        pergunta('b1', { ramo: 'pequeno' }),
      ],
      total: 4,
      valueSchema: {},
      branches: { grande: '9 a 17', pequeno: 'Menor de 9', saida: '18 ou mais' },
    },
  },
}

describe('quiz com ramos', () => {
  test('as definições do NCI e do Desafio não mudam com a infraestrutura de ramos', () => {
    // Fixadas em 20/10/2026: uma mudança aqui abriria uma versão nova do quiz para quem está
    // respondendo agora (o 409 "O quiz mudou"). A do Desafio mudou DE PROPÓSITO em 21/10/2026, duas
    // vezes: a `desafio-farol-v4` (faixa de 9 a 17) e, no mesmo dia, a `desafio-farol-v5` em
    // conversa, com ramos; o Desafio adulto ganhou o quiz `desafio-adulto-v1`.
    expect(quizDefinition(NO_COMANDO_DA_IA)?.id).toBe(
      '641511fefceeb108ac29ae2c4eee0ccf599671ff6d977cf4c728cea7651add81',
    )
    expect(quizDefinition(DESAFIO_PRIMEIRO_JOGO)?.id).toBe(
      'e54f34c626e16bf74eb64f63c446a9d768522d819676d422f34dbe747e023cff',
    )
    expect(quizDefinition(DESAFIO_ADULTO)?.id).toBe(
      'be346c4e5e47109b36826fda2c7c380a4ad498be01ce04b25806525c7bee87f3',
    )
  })

  test('a fotografia numera cada ramo a partir das perguntas comuns e marca ramo e extra', () => {
    const questions = quizDefinition(RAMIFICADO)!.questions
    const byId = Object.fromEntries(questions.map((q) => [q.id, q]))
    expect(byId.idade).toMatchObject({ position: 2 })
    expect(byId.idade?.branch).toBeUndefined()
    expect(byId.a1).toMatchObject({ position: 3, branch: '9 a 17', shortLabel: 'a1' })
    expect(byId.a_extra).toMatchObject({ position: 5, branch: '9 a 17', conditional: true })
    expect(byId.b1).toMatchObject({ position: 3, branch: 'Menor de 9' })
  })

  test('Performance: cada ramo tem a sua cadeia, e o resultado compara com a soma dos ramos', () => {
    const steps = buildFunnelSteps(RAMIFICADO)
    const names = steps.map((s) => s.name)
    expect(names.slice(0, 11)).toEqual([
      'entrou_landing',
      'respondeu_teste_genero',
      'respondeu_teste_idade',
      branchEventName('grande'),
      'respondeu_teste_a1',
      'respondeu_teste_a2',
      'respondeu_teste_a_extra',
      branchEventName('pequeno'),
      'respondeu_teste_b1',
      branchEventName('saida'),
      'viu_resultado',
    ])
    const label = (name: string) => steps.find((s) => s.name === name)?.label
    expect(label('respondeu_teste_idade')).toBe('Pergunta 2 · idade')
    expect(label(branchEventName('grande'))).toBe('Ramo · 9 a 17')
    expect(label('respondeu_teste_a2')).toBe('Pergunta 4 · a2')
    expect(label('respondeu_teste_b1')).toBe('Pergunta 3 · b1')
    expect(label('respondeu_teste_a_extra')).toBe('Extra · a_extra')
    expect(label(branchEventName('saida'))).toBe('Saída · 18 ou mais')

    const counts: Record<string, number> = {
      entrou_landing: 100,
      respondeu_teste_genero: 80,
      respondeu_teste_idade: 80,
      [branchEventName('grande')]: 50,
      respondeu_teste_a1: 40,
      respondeu_teste_a2: 30,
      respondeu_teste_a_extra: 6,
      [branchEventName('pequeno')]: 20,
      respondeu_teste_b1: 10,
      [branchEventName('saida')]: 10,
      viu_resultado: 20,
    }
    const conv = Object.fromEntries(
      stepConversions(steps, (name) => counts[name] ?? 0).map((c) => [c.step.name, c.fromPrev]),
    )
    // As entradas dos ramos comparam com a última pergunta comum (80).
    expect(conv[branchEventName('grande')]).toBeCloseTo(50 / 80)
    expect(conv[branchEventName('pequeno')]).toBeCloseTo(20 / 80)
    expect(conv[branchEventName('saida')]).toBeCloseTo(10 / 80)
    // Dentro do ramo, cada pergunta compara com a anterior do mesmo ramo; a extra não vira base.
    expect(conv.respondeu_teste_a1).toBeCloseTo(40 / 50)
    expect(conv.respondeu_teste_a_extra).toBeCloseTo(6 / 30)
    expect(conv.respondeu_teste_b1).toBeCloseTo(10 / 20)
    // O resultado compara com a soma do fim dos ramos com perguntas (30 + 10), sem a saída.
    expect(conv.viu_resultado).toBeCloseTo(20 / 40)
  })

  test('Performance de quiz sem ramos continua igual', () => {
    const steps = buildFunnelSteps(DESAFIO_ADULTO)
    expect(steps.some((s) => s.branch || s.branchEntry)).toBe(false)
    const quizSteps = DESAFIO_ADULTO.content.quiz?.steps ?? []
    expect(steps.slice(1, 1 + quizSteps.length).map((s) => s.name)).toEqual(
      quizSteps.map((s) => s.eventName),
    )
  })

  test('Desafio Kids: entrada, um ramo de cada lado e a saída de 18 ou mais', () => {
    const names = buildFunnelSteps(DESAFIO_PRIMEIRO_JOGO).map((s) => s.name)
    const i = (name: string) => names.indexOf(name)
    expect(i('respondeu_desafio_v5_idade')).toBeGreaterThan(i('respondeu_desafio_v5_genero'))
    expect(i(branchEventName('9a17'))).toBeGreaterThan(i('respondeu_desafio_v5_idade'))
    expect(i('respondeu_desafio_v5_sintese')).toBeGreaterThan(i(branchEventName('9a17')))
    expect(i(branchEventName('m9'))).toBeGreaterThan(i('respondeu_desafio_v5_sintese'))
    expect(i('respondeu_desafio_v5_m9_sintese')).toBeGreaterThan(i(branchEventName('m9')))
    expect(i(branchEventName('adulto'))).toBeGreaterThan(i('respondeu_desafio_v5_m9_sintese'))
    expect(i('viu_resultado')).toBeGreaterThan(i(branchEventName('adulto')))
    const info = adminFunnelList().find((f) => f.key === DESAFIO_PRIMEIRO_JOGO.key)
    expect(info?.quiz?.branches?.map((b) => b.id)).toEqual(['9a17', 'm9', 'adulto'])
    expect(info?.quiz?.headlines.map((h) => h.id)).toEqual(['padrao', 'tela'])
    // As respostas da v4 seguem legíveis em Respostas.
    expect(info?.answerLabels.abertura_criacao).toStartWith('(quiz anterior) ')
    expect(info?.perfilLabels['m9-ideias']).toBeTruthy()
    const adulto = adminFunnelList().find((f) => f.key === DESAFIO_ADULTO.key)
    expect(adulto?.quiz?.headlines.map((h) => h.id)).toEqual(['padrao', 'ideia'])
    expect(adulto?.perfilLabels['desafio-adulto-ideia']).toBeTruthy()
  })

  test('manchete genérica: só os ids que o quiz declara, o padrão sem parâmetro', () => {
    const quiz = COMUNIDADE_DOS_CRIADORES.content.quiz
    expect(quizHeadlineId(quiz, 'tela')).toBe('tela')
    expect(quizHeadlineId(quiz, '<script>')).toBe(quiz?.defaultHeadline)
    expect(quizHeadlineId(quiz, null)).toBe(quiz?.defaultHeadline)
    expect(quizHeadlineId(NO_COMANDO_DA_IA.content.quiz, 'tela')).toBeUndefined()
    expect(quizHeadlineId(DESAFIO_PRIMEIRO_JOGO.content.quiz, 'tela')).toBe('tela')
    expect(quizPathWithHeadline('/kids/x', quiz, 'tela')).toBe('/kids/x/quiz?manchete=tela')
    expect(quizPathWithHeadline('/kids/x', quiz, quiz?.defaultHeadline)).toBe('/kids/x/quiz')
    expect(quizPathWithHeadline('/kids/x', quiz, 'outra')).toBe('/kids/x/quiz')
  })

  test('/admin: opções das versões antigas continuam legíveis numa chave repetida', () => {
    for (const info of adminFunnelList()) {
      const quiz = FUNNELS[info.key]?.content.quiz
      for (const step of quiz?.legacySteps ?? []) {
        if (step.tipo !== 'selecao') continue
        for (const o of step.opcoes) expect(info.answerOptions?.[step.key]?.[o.value]).toBeDefined()
      }
      for (const step of quiz?.steps ?? []) {
        if (step.tipo !== 'selecao') continue
        for (const o of step.opcoes) expect(info.answerOptions?.[step.key]?.[o.value]).toBe(o.label)
      }
    }
  })
})
