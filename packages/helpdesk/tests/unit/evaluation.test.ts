import { expect, it } from 'bun:test'
import { DEFAULT_AUTOMATION_POLICY } from '@sistemazero/helpdesk-contracts'
import {
  artifactHash,
  EvaluationDatasetSchema,
  scoreEvaluation,
} from '../../src/application/ai/evaluation'
import { automationPolicyHash, pilotEvaluationValid } from '../../src/domain/ticket/automation'

const text = await Bun.file(
  new URL('../../evaluation/helpdesk-eval-v1.json', import.meta.url),
).text()
const dataset = EvaluationDatasetSchema.parse(JSON.parse(text))
const context = {
  model: 'synthetic',
  promptVersion: 'knowledge-answer-1',
  indexVersion: 1,
  policyHash: automationPolicyHash(DEFAULT_AUTOMATION_POLICY),
}
function fixture() {
  const output = JSON.stringify({
    evaluatedAt: new Date().toISOString(),
    datasetHash: artifactHash(text),
    bindingsHash: 'synthetic',
    context,
    results: dataset.cases.map((c) => ({
      id: c.id,
      decision: c.expectedDecision,
      reply: null,
      reason: null,
      retrievedArticleIds: c.expectedDecision === 'answer' ? ['source'] : [],
      acceptableArticleIds: c.expectedDecision === 'answer' ? ['source'] : [],
      durationMs: 100,
      knownCostUsd: 0,
      unknownAttempts: 1,
    })),
  })
  const reviews = {
    outputHash: artifactHash(output),
    reviewedBy: 'Synthetic test',
    deterministicPassed: true,
    cases: dataset.cases.map((c) => ({
      id: c.id,
      correct: true,
      criticalError: false,
      comment: 'Synthetic assertion, not editorial approval',
    })),
  }
  return { output, reviews }
}
it('conjunto congelado contém 100 casos únicos e relatório preserva custo desconhecido', () => {
  expect(dataset.cases).toHaveLength(100)
  const { output, reviews } = fixture(),
    result = scoreEvaluation(text, output, JSON.stringify(reviews))
  expect(result.report).toMatchObject({
    cases: 100,
    correctResponses: 100,
    answerableCases: 60,
    retrievedCases: 60,
  })
  expect(result.metrics.unknownAttempts).toBe(100)
  expect(result.metrics.recallAt6).toBe(1)
})
it('avaliação recusa revisão parcial e resultado alterado depois da revisão', () => {
  const { output, reviews } = fixture()
  expect(() => scoreEvaluation(text, `${output} `, JSON.stringify(reviews))).toThrow(
    'artefatos congelados',
  )
  reviews.cases.pop()
  expect(() => scoreEvaluation(text, output, JSON.stringify(reviews))).toThrow('exatamente um')
})
it('erro crítico e configuração distinta impedem piloto mesmo com nota alta', () => {
  const { output, reviews } = fixture()
  reviews.cases[0]!.criticalError = true
  const report = {
    ...scoreEvaluation(text, output, JSON.stringify(reviews)).report,
    id: crypto.randomUUID(),
    reviewedBy: 'admin',
    createdAt: new Date().toISOString(),
  }
  expect(pilotEvaluationValid(report, 'synthetic', new Date(), DEFAULT_AUTOMATION_POLICY)).toBe(
    false,
  )
  expect(
    pilotEvaluationValid({ ...report, criticalErrors: 0 }, 'synthetic', new Date(), {
      ...DEFAULT_AUTOMATION_POLICY,
      cohortPercent: 10,
    }),
  ).toBe(false)
})

it('reimportar uma avaliação vencida não renova sua validade e revisão parcial não libera piloto', () => {
  const { output, reviews } = fixture()
  const at = new Date('2026-10-16T12:00:00Z')
  const report = {
    ...scoreEvaluation(text, output, JSON.stringify(reviews)).report,
    id: crypto.randomUUID(),
    reviewedBy: 'admin',
    evaluatedAt: at.toISOString(),
    createdAt: at.toISOString(),
  }
  expect(pilotEvaluationValid(report, 'synthetic', at, DEFAULT_AUTOMATION_POLICY)).toBe(true)
  expect(
    pilotEvaluationValid(
      { ...report, evaluatedAt: '2026-09-01T00:00:00Z' },
      'synthetic',
      at,
      DEFAULT_AUTOMATION_POLICY,
    ),
  ).toBe(false)
  expect(
    pilotEvaluationValid(
      { ...report, evaluatedAt: '2026-10-17T00:00:00Z' },
      'synthetic',
      at,
      DEFAULT_AUTOMATION_POLICY,
    ),
  ).toBe(false)
  expect(
    pilotEvaluationValid({ ...report, cases: 101 }, 'synthetic', at, DEFAULT_AUTOMATION_POLICY),
  ).toBe(false)
})
