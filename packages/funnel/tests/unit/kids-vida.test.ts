import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { textoDoResultado } from '../../src/content/resultado-conversa'
import { buildKidsResult } from '../../src/funnels/kids-vida'
import { BRANCHES, KIDS_ENGINES, profileLabels } from '../../src/funnels/kids-vida/engine'
import { buildNarrative } from '../../src/funnels/kids-vida/narrative'
import type { CompleteAnswers, KidsMode } from '../../src/funnels/kids-vida/types'
import { adminFunnelList, getFunnelByKey } from '../../src/funnels/registry'
import { buildFunnelSteps } from '../../src/server/admin'
import approved from '../fixtures/kids-vida-approved.json'
import { kidsJourney } from '../helpers/kids-vida'

const modes: KidsMode[] = ['desafio', 'comunidade']
const key = (mode: KidsMode) =>
  `kids/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}`
for (const mode of modes)
  describe(`Quiz de habilidades: ${mode}`, () => {
    const engine = KIDS_ENGINES[mode]
    const funnel = getFunnelByKey(key(mode))!
    test('registro, fotografias e admin preservam as variantes, agrupando apenas os marcos de Performance', () => {
      expect(funnel.content.quiz?.version).toBe(engine.version)
      expect(funnel.content.quiz?.total).toBe(10)
      expect(new Set(engine.steps.map((s) => s.key)).size).toBe(engine.steps.length)
      const definition = quizDefinition(funnel)!
      const info = adminFunnelList().find((f) => f.key === funnel.key)!
      for (const s of engine.steps) {
        const q = definition.questions.find((q) => q.id === s.key)!
        expect(q.title).toBe(s.titulo)
        expect(q.position).toBe(s.quizPosition! + 1)
        expect(q.displayPosition).toBe(s.quizPosition)
        expect(q.options).toEqual(s.opcoes.map(({ value, label }) => ({ value, label })))
        expect(info.answerLabels[s.key]).toContain(s.titulo)
        for (const o of s.opcoes) expect(info.answerOptions?.[s.key]?.[o.value]).toBe(o.label)
        expect(s.lastStep.length).toBeLessThanOrEqual(64)
        expect(s.eventName.length).toBeLessThanOrEqual(64)
      }
      const performance = buildFunnelSteps(funnel)
      expect(new Set(performance.map((s) => s.name)).size).toBe(performance.length)
      for (const age of ['m9', '9a12', '13a17']) {
        const own = performance.filter(
          (s) => s.branch === BRANCHES[age as keyof typeof BRANCHES] && !s.branchEntry,
        )
        expect(own).toHaveLength(9)
        expect(own[0]?.label).toStartWith('Pergunta 2')
        expect(own.at(-1)?.label).toStartWith('Pergunta 10')
        expect(own.some((s) => s.condicional)).toBe(false)
      }
      expect(info.perfilLabels['vida-13a17-expressar']).toBe('Comunicação · De 13 a 17 anos')
      expect(info.perfilLabels['m9-ideias']).toStartWith('(quiz anterior)')
      expect(info.answerLabels['cena']).toStartWith('(quiz anterior)')
    })
    test('cada idade e situação têm dez perguntas, requisitos verdadeiros e resultado legível', () => {
      for (const idade of ['m9', '9a12', '13a17'])
        for (const cena of [
          'comecar',
          'erro',
          'modelo',
          'explicar',
          'rotina',
          'vai_bem',
          'nao_sei',
        ])
          for (const prioridade of [
            'planejar',
            'persistir',
            'raciocinar',
            'expressar',
            'rotina',
            'explorar',
          ]) {
            const { answers, responses } = kidsJourney(mode, { idade, cena, prioridade })
            expect(responses).toHaveLength(11)
            const active = engine.activeSteps(answers)
            expect(active.map((s) => s.quizPosition)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
            for (const s of active)
              expect(s.titulo + ' ' + s.opcoes.map((o) => o.label).join(' ')).not.toMatch(
                /Chave do Farol|Desafio do Primeiro Jogo|Comunidade dos Criadores|treinamento|plataforma|aulas gravadas|R\$/i,
              )
            const result = buildKidsResult(mode, answers)!
            expect(result.perfil).toBe(`vida-${idade}-${prioridade}`)
            expect(profileLabels[result.perfil]).toBeTruthy()
            const text = textoDoResultado(result).join('\n')
            expect(text).not.toMatch(/undefined|NaN|você (escolheu|contou|reconheceu)/i)
            expect(text).toContain('computador com internet, mouse e teclado')
            expect(text).toContain('aulas gravadas e orientação por mensagens')
            expect(lintLightCopy(text)).toEqual([])
            expect(result.destino).toEndWith(idade === 'm9' ? '/oferta/criar-junto' : '/oferta')
          }
    })
    test('mantém integralmente os 29 resultados aprovados da proposta V5', () => {
      for (const sample of approved.filter((s) => s.mode === mode)) {
        const { answers } = kidsJourney(mode, sample.answers)
        expect(engine.normalize(answers)).toEqual(sample.answers)
        const r = buildNarrative(mode, engine.normalize(answers) as CompleteAnswers)
        const value = { title: r.title, reading: r.reading, cta: r.cta, href: r.href, fit: r.fit }
        expect(createHash('sha256').update(JSON.stringify(value)).digest('hex')).toBe(sample.sha256)
      }
    })
    test('trocas de idade, cena e prioridade invalidam apenas o que depende delas', () => {
      const complete = kidsJourney(mode).answers
      const age = engine.applyAnswer(complete, 'idade', '13_17')!
      expect(engine.isComplete(age)).toBe(false)
      expect(Object.keys(age).some((k) => k.startsWith('vida_9a12_'))).toBe(false)
      expect(age.genero).toBe('filho')
      const scene = engine.applyAnswer(complete, 'vida_9a12_cena', 'erro')!
      expect(engine.isComplete(scene)).toBe(false)
      expect(engine.normalize(scene).tentativas).toBeUndefined()
      expect(scene.vida_9a12_impacto_comecar).toBeUndefined()
      expect(scene.vida_9a12_prioridade).toBe('planejar')
      const goal = engine.applyAnswer(complete, 'vida_9a12_prioridade', 'expressar')!
      expect(engine.isComplete(goal)).toBe(false)
      expect(goal.vida_9a12_beneficio_planejar).toBeUndefined()
      expect(goal.vida_9a12_cena).toBe('comecar')
      expect(engine.isComplete(engine.applyAnswer(complete, 'genero', 'filha')!)).toBe(true)
    })
    test('recusa versão antiga, opções inválidas, avanço forjado e variante de outro percurso', () => {
      expect(engine.applyAnswer({}, 'idade', '9_12')).toBeNull()
      expect(engine.applyAnswer({}, 'genero', '<script>')).toBeNull()
      expect(engine.applyAnswer({ _quiz_version: 'old' }, 'genero', 'filho')).toBeNull()
      const complete = kidsJourney(mode).answers
      expect(engine.applyAnswer(complete, 'vida_9a12_impacto_erro', 'ajuda')).toBeNull()
      expect(engine.applyAnswer(complete, 'vida_m9_apoio', 'junto')).toBeNull()
      const adult = kidsJourney(mode, { idade: 'adulto' })
      expect(adult.responses).toHaveLength(2)
      expect(engine.isAdultExit(adult.answers)).toBe(true)
      expect(buildKidsResult(mode, adult.answers)).toBeNull()
    })
  })
