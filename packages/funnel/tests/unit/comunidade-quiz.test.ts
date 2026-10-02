import { describe, expect, test } from 'bun:test'
import {
  activeCommunitySteps,
  applyCommunityAnswer,
  communityDecision,
  isCommunityQuizComplete,
  QUIZ_VERSION,
} from '../../src/funnels/comunidade-dos-criadores/quiz/engine'
import { QUIZ_ENTRY } from '../../src/funnels/comunidade-dos-criadores/quiz/entry-copy'
import { COMMUNITY_QUESTIONS } from '../../src/funnels/comunidade-dos-criadores/quiz/questions'
import { buildCommunityResult } from '../../src/funnels/comunidade-dos-criadores/quiz/result'
import { orderedOptions } from '../../src/islands/ComunidadeQuiz'
import type { QuizAnswers } from '../../src/lib/quiz-types'

export const communityAnswers = (patch: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: QUIZ_VERSION,
  _quiz_revision: 8,
  q1: '9_a_11',
  q2: 'jogar',
  q3: ['nao_sei'],
  q4: ['A'],
  q5: 'interesse',
  q6: 'pessoa',
  q7: 'pode_funcionar',
  q8: 'disponivel',
  ...patch,
})

describe('Comunidade: resultado completo e destinos', () => {
  test('entrada e perguntas falam com quem ainda não conhece o produto', () => {
    const copy = JSON.stringify([
      QUIZ_ENTRY,
      COMMUNITY_QUESTIONS.map((s) => ({ title: s.titulo, help: s.subtitulo, options: s.opcoes })),
    ])
    expect(copy).not.toMatch(/Comunidade|Estúdio|Pinta|Jornada|Recados|esse formato/i)
  })
  test('todas as combinações entregam orientação antes de mencionar o produto', () => {
    for (const q4 of [
      ['A'],
      ['B'],
      ['C'],
      ['D'],
      ['A', 'B'],
      ['C', 'D'],
      ['outro'],
      ['explorar'],
    ]) {
      const result = buildCommunityResult(
        communityAnswers({ q4, qt: 'iguais', qb: 'flexivel', qc: 'interativo' }),
      )!
      expect(
        JSON.stringify([result.reason, result.context, result.orientation, result.activity]),
      ).not.toMatch(/Comunidade|Estúdio|Pinta|Jornada|Recados/i)
      expect(result.introduction.paragraphs.join(' ')).toContain(
        'plataforma por assinatura do Sistema Zero Kids',
      )
    }
  })
  test('as quatro motivações levam às quatro páginas existentes', () => {
    for (const [profile, suffix] of [
      ['A', ''],
      ['B', '/criacao-de-jogos'],
      ['C', '/expressao-visual'],
      ['D', '/formacao-tecnologica'],
    ]) {
      const result = buildCommunityResult(
        communityAnswers({ q4: [profile!], qb: 'flexivel', qc: 'interativo' }),
      )!
      expect(result.offerPath).toBe(`/kids/comunidade-dos-criadores/oferta${suffix}`)
      expect(result.activity.steps).toHaveLength(3)
      expect(result.cta.length).toBeGreaterThan(0)
    }
  })
  test('exemplos para adolescentes mudam o convite, preservando a prioridade e o destino', () => {
    for (const profile of ['A', 'B', 'C', 'D']) {
      const choices = { q4: [profile], qb: 'flexivel', qc: 'interativo' }
      const younger = buildCommunityResult(communityAnswers(choices))!
      const older = buildCommunityResult(communityAnswers({ ...choices, q1: '12_a_14' }))!
      expect(older.activityVariant).toBe('adolescente')
      expect(older.activity.steps).toHaveLength(3)
      expect(older.activity.steps).not.toEqual(younger.activity.steps)
      expect(older.decision).toEqual(younger.decision)
      expect(older.offerPath).toBe(younger.offerPath)
    }
  })
  test('tentativa anterior de criar vira ponto de partida, em qualquer idade e perfil', () => {
    for (const q1 of ['9_a_11', '12_a_14']) {
      for (const profile of ['A', 'B', 'C', 'D'] as const) {
        const result = buildCommunityResult(
          communityAnswers({
            q1,
            q2: 'criar_jogo',
            q4: [profile],
            qb: 'flexivel',
            qc: 'interativo',
          }),
        )!
        expect(result.activityVariant).toBe('projeto_existente')
        expect(result.activity.steps).toHaveLength(3)
        expect(result.decision.profile).toBe(profile)
      }
    }
  })
  test('desenho sem jogos recebe atividade de desenho, inclusive com outro objetivo ou experiência anterior', () => {
    for (const q4 of [['C'], ['B', 'C'], ['C', 'D']]) {
      const result = buildCommunityResult(
        communityAnswers({
          q1: '12_a_14',
          q2: 'criar_jogo',
          q4,
          qt: 'iguais',
          qb: 'flexivel',
          qc: 'sem_jogos',
        }),
      )!
      expect(result.activityVariant).toBe('desenho_sem_jogos')
      expect(result.activity.steps?.join(' ')).not.toMatch(/jogos?|jogador|programa|tecla/i)
      expect(result.unmetConditions.map((c) => c.kind)).toContain('desenho')
      expect(result.cta).toBe('Conhecer a proposta e conferir seus requisitos')
    }
  })
  test('perguntas partem da situação, passam pela dificuldade e só então pedem a prioridade', () => {
    const keys = activeCommunitySteps(communityAnswers({ q4: ['B', 'C'] })).map((s) => s.key)
    expect(keys).toEqual(['q1', 'q2', 'q3', 'q6', 'q5', 'q4', 'qt', 'qb', 'qc', 'q7', 'q8'])
    const stages = activeCommunitySteps(communityAnswers({ q4: ['B', 'C'] })).map((s) => s.etapa)
    expect(stages).toEqual([
      'filho',
      'filho',
      'filho',
      'filho',
      'objetivos',
      'objetivos',
      'objetivos',
      'comeco',
      'comeco',
      'comeco',
      'comeco',
    ])
  })
  test('formato indefinido recebe demonstração da aula e ajuda não vira uma segunda resposta repetida', () => {
    for (const q6 of ['rever', 'pessoa', 'experimentar', 'varia', 'nao_observou']) {
      const result = buildCommunityResult(communityAnswers({ q5: 'ajuda', q6, q7: 'conhecer' }))!
      expect(result.format?.title).toBe('Veja como seu filho acompanha uma aula, passo a passo')
      expect(result.practicalConditions.some((c) => c.kind === 'formato')).toBe(false)
      expect(result.support.paragraphs.join(' ')).toContain('Preciso de ajuda')
      expect(result.support.paragraphs.join(' ')).toContain('pode exigir espera')
      expect(result.doubt).toBeNull()
    }
  })
  test('todas as observações de rotina mudam a orientação sem escolher um perfil pela criança', () => {
    const contexts = new Set<string>()
    for (const q2 of [
      'jogar',
      'desenhar',
      'criar_jogo',
      'investigar_programas',
      'videos',
      'outra',
      'variado',
      'nao_sei',
    ]) {
      const result = buildCommunityResult(
        communityAnswers({ q2, qb: 'flexivel', qc: 'interativo' }),
      )!
      contexts.add(result.context.join(' '))
      expect(result.decision.profile).toBe('A')
    }
    expect(contexts.size).toBe(8)
  })
  test('preferência por ao vivo é explicada; exigência permanece visível sem uma recomendação de formato', () => {
    const preference = buildCommunityResult(communityAnswers({ q7: 'prefere_ao_vivo' }))!
    const requirement = buildCommunityResult(communityAnswers({ q7: 'exige_ao_vivo' }))!
    expect(preference.format?.paragraphs.join(' ')).toContain('não há um professor ao vivo')
    expect(preference.unmetConditions).toHaveLength(0)
    expect(requirement.format).toBeNull()
    expect(requirement.unmetConditions.map((c) => c.kind)).toContain('formato')
    expect(requirement.cta).toBe('Conhecer a proposta e conferir seus requisitos')
  })
  test('a integração aparece uma vez no argumento visual ou numa resposta própria', () => {
    for (const profile of ['A', 'C']) {
      const result = buildCommunityResult(
        communityAnswers({ q4: [profile], q3: ['visual'], qc: 'ver_exemplo' }),
      )!
      const drawingSections =
        Number(result.visuals.includes('integracao')) +
        result.practicalConditions.filter((c) => c.kind === 'desenho').length
      expect(drawingSections).toBe(1)
    }
  })
  test('os seis pares empatados têm atividade própria, sem principal presumido', () => {
    const titles = new Set<string>()
    for (const pair of ['AB', 'AC', 'AD', 'BC', 'BD', 'CD']) {
      const result = buildCommunityResult(
        communityAnswers({ q4: pair.split(''), qt: 'iguais', qb: 'flexivel', qc: 'interativo' }),
      )!
      expect(result.decision.profile).toBeNull()
      expect(result.offerPath).toBe('/kids/comunidade-dos-criadores/oferta')
      expect(result.activity.steps).toHaveLength(3)
      titles.add(result.title)
    }
    expect(titles.size).toBe(6)
  })
  test('nenhuma condição é escondida e CTA respeita incompatibilidades transversais', () => {
    const result = buildCommunityResult(
      communityAnswers({
        q4: ['D'],
        q3: ['jogo', 'visual'],
        qb: 'roblox',
        qc: 'sem_jogos',
        q7: 'exige_ao_vivo',
        q8: 'celular_tablet',
      }),
    )!
    expect(result.conditions).toHaveLength(4)
    expect(result.conditions.every((c) => c.unmet)).toBe(true)
    expect(result.cta).toBe('Conhecer a proposta e conferir seus requisitos')
    expect(result.offerPath).toEndWith('/formacao-tecnologica')
    expect(result.bridge?.title).toBe('O que a Comunidade oferece')
  })
  test('todos os conjuntos válidos de interesses e objetivos geram texto sem placeholders', () => {
    const interests = ['jogo', 'visual', 'programacao', 'outro']
    const sets = Array.from({ length: 15 }, (_, n) =>
      interests.filter((_, i) => (n + 1) & (1 << i)),
    ).concat([['nao_sei'], ['nao_expressou']])
    const objectives = [
      ['A'],
      ['B'],
      ['C'],
      ['D'],
      ['outro'],
      ['explorar'],
      ...['AB', 'AC', 'AD', 'BC', 'BD', 'CD'].map((p) => p.split('')),
    ]
    for (const q3 of sets)
      for (const q4 of objectives) {
        const result = buildCommunityResult(
          communityAnswers({ q3, q4, qt: 'iguais', qb: 'flexivel', qc: 'interativo' }),
        )
        expect(result).not.toBeNull()
        expect(JSON.stringify(result)).not.toContain('{{')
      }
  })
  test('ordem de exibição é estável, mantém saídas ao final e orienta o desempate', () => {
    const q4 = COMMUNITY_QUESTIONS.find((q) => q.key === 'q4')!
    const first = orderedOptions(q4, 'sessao')
    expect(orderedOptions(q4, 'sessao')).toEqual(first)
    expect(first.slice(-2).map((o) => o.value)).toEqual(['outro', 'explorar'])
    const qt = activeCommunitySteps(communityAnswers({ q4: ['A', 'C'] })).find(
      (q) => q.key === 'qt',
    )!
    expect(orderedOptions(qt, 'sessao').map((o) => o.value)).toEqual([
      ...first.filter((o) => ['A', 'C'].includes(o.value)).map((o) => o.value),
      'iguais',
    ])
  })
})

describe('Comunidade: decisões explicáveis e ramos condicionais', () => {
  test('jogar não vira vontade de criar e não ativa exigência de ferramenta', () => {
    const a = communityAnswers()
    expect(communityDecision(a)?.profile).toBe('A')
    expect(activeCommunitySteps(a).map((s) => s.key)).not.toContain('qb')
  })
  test('empate preserva os dois objetivos sem fabricar principal', () => {
    const a = communityAnswers({ q4: ['C', 'D'], qt: 'iguais', qc: 'interativo' })
    expect(communityDecision(a)).toMatchObject({
      profile: null,
      state: 'misto_sem_prioridade',
      objectives: ['C', 'D'],
    })
    expect(communityDecision({ ...a, q4: ['D', 'C'] })).toEqual(communityDecision(a))
  })
  test('outra procura e exploração não viram A', () => {
    expect(communityDecision(communityAnswers({ q4: ['outro'] }))).toMatchObject({
      profile: null,
      state: 'fora_das_opcoes',
    })
    expect(communityDecision(communityAnswers({ q4: ['explorar'] }))).toMatchObject({
      profile: null,
      state: 'exploratorio',
    })
  })
  test('interesses combinados ativam qualificações fora do perfil B/C', () => {
    const a = communityAnswers({ q4: ['D'], q3: ['jogo', 'visual'], qb: 'roblox', qc: 'sem_jogos' })
    expect(communityDecision(a)).toMatchObject({ profile: 'D', unmet: ['ferramenta', 'desenho'] })
    const incomplete = { ...a }
    delete incomplete.qb
    expect(isCommunityQuizComplete(incomplete)).toBe(false)
  })
  test('preferir ao vivo e ferramenta desconhecida são pendências, não rejeições', () => {
    const a = communityAnswers({ q4: ['B'], qb: 'outra_especifica', q7: 'prefere_ao_vivo' })
    expect(communityDecision(a)).toMatchObject({
      adequacy: 'precisa_conferir',
      unmet: [],
      pending: ['ferramenta', 'formato'],
    })
  })
  test('todas as condições não atendidas permanecem presentes', () => {
    const a = communityAnswers({
      q3: ['jogo', 'visual'],
      qb: 'minecraft',
      qc: 'sem_jogos',
      q7: 'exige_ao_vivo',
      q8: 'celular_tablet',
    })
    expect(communityDecision(a)?.unmet).toEqual(['ferramenta', 'desenho', 'formato', 'computador'])
  })
  test('conjuntos inválidos e prioridade fora do par não completam', () => {
    for (const patch of [
      { q3: [] },
      { q3: ['nao_sei', 'visual'] },
      { q4: ['A', 'A'] },
      { q4: ['A', 'B', 'C'] },
      { q4: ['A', 'D'], qt: 'B' },
    ] as QuizAnswers[]) {
      expect(isCommunityQuizComplete(communityAnswers(patch))).toBe(false)
    }
  })
  test('editar objetivo invalida prioridade e descarta ramo que deixou de existir', () => {
    const before = communityAnswers({ q4: ['B', 'D'], qt: 'B', qb: 'roblox' })
    const next = applyCommunityAnswer(before, 'q4', ['D'])!
    expect(next.qt).toBeUndefined()
    expect(next.qb).toBeUndefined()
    expect(next.q5).toBe('interesse')
    expect(next._quiz_revision).toBe(9)
    expect(communityDecision(next)?.profile).toBe('D')
  })
  test('mesmo conjunto em outra ordem não apaga prioridade', () => {
    const before = communityAnswers({ q4: ['B', 'D'], qt: 'B', qb: 'flexivel' })
    expect(applyCommunityAnswer(before, 'q4', ['D', 'B'])?.qt).toBe('B')
  })
  test('ramos inativos não podem receber respostas nem interferir no resultado', () => {
    expect(applyCommunityAnswer(communityAnswers(), 'qb', 'roblox')).toBeNull()
    expect(
      communityDecision(communityAnswers({ qt: 'B', qb: 'roblox', qc: 'sem_jogos' }))?.unmet,
    ).toEqual([])
  })
  test('faixa e versão são verificadas e não produzem perfil incompleto', () => {
    for (const patch of [
      { q1: 'ate_8' },
      { q1: '15_mais' },
      { _quiz_version: 'antiga' },
    ] as QuizAnswers[]) {
      expect(communityDecision(communityAnswers(patch))).toBeNull()
    }
    expect(activeCommunitySteps({}).map((s) => s.key)).toEqual(['q1'])
  })
})
