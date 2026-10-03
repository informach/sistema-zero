import { describe, expect, test } from 'bun:test'
import { DESAFIO_PRIMEIRO_JOGO as funnel } from '../../src/funnels/desafio-primeiro-jogo'
import {
  activeDesafioSteps,
  applyDesafioAnswer,
  DESAFIO_QUIZ_VERSION,
  desafioDecision,
  isDesafioQuizComplete,
} from '../../src/funnels/desafio-primeiro-jogo/quiz/engine'
import { buildDesafioResult } from '../../src/funnels/desafio-primeiro-jogo/quiz/result'
import { isQuizComplete } from '../../src/funnels/registry'
import type { QuizAnswers } from '../../src/lib/quiz-types'

export const fixture = (override: QuizAnswers = {}): QuizAnswers => ({
  _quiz_version: DESAFIO_QUIZ_VERSION,
  _quiz_revision: 8,
  idade: '9_11',
  equipamento: 'disponivel',
  interesses: ['joga'],
  experiencia: 'primeira_vez',
  motivos: ['B'],
  duvida: 'ajuda',
  formato: 'gravado',
  abertura_criacao: 'conhecer',
  ...override,
})
const result = (override: QuizAnswers = {}) => buildDesafioResult(fixture(override))!
describe('Desafio Farol: orientação e encaminhamento', () => {
  test('contrato preservado e oito perguntas principais', () => {
    expect(funnel.offerContract).toEqual({
      pricingMode: 'one_time',
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      guaranteeDays: 7,
    })
    expect(activeDesafioSteps(fixture())).toHaveLength(8)
    expect(isQuizComplete(funnel.content.quiz!, fixture())).toBe(true)
  })
  test('A não infere vontade de criar por gostar de jogar', () => {
    const r = result({ motivos: ['A'] })
    expect(r.intro.join(' ')).toContain('ainda não contou que tenha pedido')
    expect(r.decision.offerPath).toEndWith('/tempo-de-tela')
  })
  test('B com tentativa interrompida orienta retomada e ajuda', () => {
    const r = result({ experiencia: 'interrompida', interesses: ['quer_criar'] })
    expect(r.decision.next).toBe('retomar_com_apoio')
    expect(r.bridge.join(' ')).toContain('não é preciso transferi-la')
    expect(r.doubt.paragraphs.join(' ')).toContain('Recados')
  })
  test('D que prefere ao vivo pode avaliar o gravado sem ser bloqueado', () => {
    const r = result({ motivos: ['D'], formato: 'prefere_ao_vivo' })
    expect(r.decision.unmet).toEqual([])
    expect(r.decision.offerPath).toEndWith('/iniciacao-tecnologica')
    expect(r.bridge.join(' ')).toContain('espera')
  })
  test('C preservado ao considerar programação, com limite de arte explícito no resultado', () => {
    const r = result({ motivos: ['C'], interesses: ['desenha'] })
    expect(r.decision.principal).toBe('C')
    expect(funnel.content.quiz!.computePerfil!(fixture({ motivos: ['C'] }))).toBe(
      'expressao-visual',
    )
    expect(r.decision.offerPath).toEndWith('/oferta')
    expect(r.conditions.join(' ')).toContain('não aprende a desenhar')
  })
  test('prioridade A e interesse C não fazem histórias virar gosto por desenho', () => {
    const r = result({ motivos: ['A', 'C'], prioridade: 'A', interesses: ['inventa_historias'] })
    expect(r.decision.principal).toBe('A')
    expect(r.intro.join(' ')).toContain('inventa personagens ou histórias')
    expect(r.intro.join(' ')).not.toContain('ele gosta de desenhar')
  })
  test('empate conserva motivos e não impõe principal', () => {
    const r = result({ motivos: ['B', 'D'], prioridade: 'iguais' })
    expect(r.decision.principal).toBeNull()
    expect(r.decision.motivos).toEqual(['B', 'D'])
    expect(
      funnel.content.quiz!.computePerfil!(fixture({ motivos: ['B', 'D'], prioridade: 'iguais' })),
    ).toBeNull()
  })
  test.each(['exploracao', 'outra_procura'])('%s não classifica pelo destino padrão', (motive) => {
    const r = result({ motivos: [motive] })
    expect(r.decision.principal).toBeNull()
    expect(r.copyFirst).toBe(true)
    expect(r.decision.offerPath).toEndWith('/oferta')
  })
  test('sem computador continua informativo e não recomenda compra', () => {
    const r = result({ equipamento: 'sem_computador' })
    expect(r.decision.unmet).toContain('computador')
    expect(r.showBridge).toBe(false)
    expect(r.primary.href).toEndWith('#requisitos')
  })
  test('computador compartilhado orienta horário sem reprovar', () => {
    const r = result({ equipamento: 'compartilhado' })
    expect(r.decision.unmet).toEqual([])
    expect(r.conditions.join(' ')).toContain('horário')
  })
  test('exigir ao vivo não encaminha a assinatura como solução', () => {
    const r = result({
      formato: 'exige_ao_vivo',
      abertura_criacao: 'outra_atividade',
      desencontro: 'desenho',
    })
    expect(r.decision.unmet).toContain('formato')
    expect(r.alternative).toBeNull()
    expect(r.conditions.join(' ')).toContain('também não substitui')
  })
  test.each([
    'desenho',
    'ferramenta_especifica',
    'avancado',
    'outro',
  ])('busca por outra atividade de %s não vira recomendação do Farol', (mismatch) => {
    const r = result({ abertura_criacao: 'outra_atividade', desencontro: mismatch })
    expect(r.decision.next).toBe('outra_atividade')
    expect(r.decision.unmet).toContain('projeto')
    expect(r.showBridge).toBe(false)
  })
  test('já cria independentemente recebe ressalva de nível', () => {
    const r = result({ experiencia: 'independente' })
    expect(r.decision.pending).toContain('nivel')
    expect(r.decision.next).toBe('conferir_condicoes')
  })
  test.each(['menos_9', '15_mais'])('idade %s termina com orientação informativa', (idade) => {
    const a = fixture({ idade })
    expect(activeDesafioSteps(a)).toHaveLength(1)
    expect(buildDesafioResult(a)).toBeNull()
  })
  test('trocar motivos limpa prioridade; considerar iniciação limpa busca alternativa', () => {
    const a = applyDesafioAnswer(fixture({ motivos: ['A', 'D'], prioridade: 'A' }), 'motivos', [
      'B',
      'C',
    ])!
    expect(a.prioridade).toBeUndefined()
    expect(isDesafioQuizComplete(a)).toBe(false)
    const b = applyDesafioAnswer(
      fixture({ abertura_criacao: 'outra_atividade', desencontro: 'desenho' }),
      'abertura_criacao',
      'conhecer',
    )!
    expect(b.desencontro).toBeUndefined()
    expect(isDesafioQuizComplete(b)).toBe(true)
  })
  test('mudança de idade limpa todas as perguntas que deixam de existir', () => {
    const a = applyDesafioAnswer(fixture(), 'idade', 'menos_9')!
    expect(a.motivos).toBeUndefined()
    expect(a.equipamento).toBeUndefined()
    expect(applyDesafioAnswer(a, 'motivos', ['B'])).toBeNull()
  })
  test('legado e incompleto não viram resultado novo por aproximação', () => {
    expect(desafioDecision({ perfil_p1: 'foguete', uso_digital_atual: 'joga_pronto' })).toBeNull()
    expect(desafioDecision(fixture({ _quiz_version: 'desafio-antigo' }))).toBeNull()
    expect(desafioDecision(fixture({ duvida: '' }))).toBeNull()
  })
  test.each([
    'nao_observei',
    'nao_sei',
  ])('%s tem convite sem inventar ausência de interesse', (interest) => {
    const r = result({ interesses: [interest] })
    expect(r.intro.join(' ')).not.toContain('Ele gosta de jogar')
    expect(r.intro.join(' ')).not.toContain('não tem interesses')
  })
  test('conversa pendente prevalece sobre tentativa interrompida', () => {
    const r = result({ experiencia: 'interrompida', abertura_criacao: 'conversar' })
    expect(r.decision.next).toBe('conversar_com_filho')
    expect(r.copyFirst).toBe(true)
  })
  test.each(['equipamento', 'formato'])('%s incerto pede conferência', (key) => {
    const r = result({ [key]: 'a_conferir' })
    expect(r.decision.adequacy).toBe('precisa_conferir')
    expect(r.decision.next).toBe('conferir_condicoes')
  })
  test('preserva múltiplos impedimentos e o motivo declarado', () => {
    const r = result({ equipamento: 'sem_computador', formato: 'exige_ao_vivo' })
    expect(r.decision.unmet).toEqual(['computador', 'formato'])
    expect(r.decision.principal).toBe('B')
    expect(r.conditions).toHaveLength(2)
  })
  test('desenho secundário não bloqueia o interesse em programação', () => {
    const r = result({ interesses: ['quer_criar', 'desenha'], motivos: ['B'] })
    expect(r.decision.unmet).toEqual([])
    expect(r.conditions.join(' ')).toContain('desenhos já vêm preparados')
  })
  test('rejeita duplicatas, exclusivas misturadas, terceira prioridade e desempate forjado', () => {
    for (const motives of [
      ['A', 'A'],
      ['exploracao', 'B'],
      ['A', 'B', 'C'],
    ])
      expect(applyDesafioAnswer(fixture(), 'motivos', motives)).toBeNull()
    expect(applyDesafioAnswer(fixture({ motivos: ['A', 'D'] }), 'prioridade', 'C')).toBeNull()
    expect(
      activeDesafioSteps(fixture({ motivos: ['A', 'D'], abertura_criacao: 'outra_atividade' })),
    ).toHaveLength(10)
  })
})
