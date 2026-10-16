import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  artifactHash,
  EvaluationDatasetSchema,
  scoreEvaluation,
} from '../src/application/ai/evaluation'
import { KnowledgeAnswerService } from '../src/application/ai/knowledge-answer.service'
import { KNOWLEDGE_INDEX_VERSION } from '../src/domain/kb/chunking'
import {
  AUTOMATION_PROMPT_VERSION,
  automationPolicyHash,
  ineligibleReason,
} from '../src/domain/ticket/automation'
import { OpenRouterClient } from '../src/infrastructure/gateways/openrouter/openrouter-client'
import { DrizzleAiRunRepository } from '../src/infrastructure/persistence/drizzle/ai-run.repository'
import { DrizzleAutomationRepository } from '../src/infrastructure/persistence/drizzle/automation.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from '../src/infrastructure/persistence/drizzle/kb.repository'

const [mode, datasetPath, inputPath, outputPath, reportPath] = process.argv.slice(2)
if (!datasetPath || !inputPath || !outputPath || !['run', 'score'].includes(mode ?? ''))
  throw new Error(
    'run <dataset.json> <bindings.json> <output.json> | score <dataset.json> <output.json> <reviews.json> <report.json>',
  )
const datasetText = await Bun.file(datasetPath).text()
if (mode === 'score') {
  if (!reportPath) throw new Error('Informe o caminho do relatório')
  const result = scoreEvaluation(
    datasetText,
    await Bun.file(inputPath).text(),
    await Bun.file(outputPath).text(),
  )
  await Bun.write(reportPath, `${JSON.stringify(result.report, null, 2)}\n`)
  await Bun.write(`${reportPath}.metrics.json`, `${JSON.stringify(result.metrics, null, 2)}\n`)
  console.info(
    'Relatório calculado. Importação e ativação continuam sendo ações administrativas explícitas.',
  )
} else {
  const dataset = EvaluationDatasetSchema.parse(JSON.parse(datasetText)),
    bindingsText = await Bun.file(inputPath).text()
  const bindings = z.record(z.string(), z.array(z.string().uuid())).parse(JSON.parse(bindingsText))
  for (const c of dataset.cases)
    if (c.expectedDecision === 'answer' && !c.acceptableSourceKeys.some((k) => bindings[k]?.length))
      throw new Error(`Vincule fontes aprovadas para ${c.id}`)
  const config = z
    .object({
      DATABASE_URL: z.string().min(1),
      OPENROUTER_API_KEY: z.string().min(1),
      OPENROUTER_HELPDESK_MODEL: z.string().min(1),
      EVALUATION_MAX_COST_USD: z.coerce.number().positive(),
      EVALUATION_ATTEMPT_RESERVE_USD: z.coerce.number().positive(),
    })
    .parse(process.env)
  const db = createDbConnection(config.DATABASE_URL, {
    max: 2,
    ssl: process.env.DATABASE_SSL === 'true',
  })
  try {
    const repo = new DrizzleAutomationRepository(db.db, config.OPENROUTER_HELPDESK_MODEL),
      policy = (await repo.policy(new Date())).policy
    const kb = new DrizzleKbRepository(db.db),
      llm = new OpenRouterClient({
        apiKey: config.OPENROUTER_API_KEY,
        model: config.OPENROUTER_HELPDESK_MODEL,
        referer: null,
        maxTokens: 1500,
        timeoutMs: 29000,
      })
    let spent = 0
    const output = {
      evaluatedAt: new Date().toISOString(),
      datasetHash: artifactHash(datasetText),
      bindingsHash: artifactHash(bindingsText),
      context: {
        model: config.OPENROUTER_HELPDESK_MODEL,
        promptVersion: AUTOMATION_PROMPT_VERSION,
        indexVersion: KNOWLEDGE_INDEX_VERSION,
        policyHash: automationPolicyHash(policy),
      },
      results: [] as Array<{
        id: string
        decision: 'answer' | 'handoff'
        reply: string | null
        reason: string | null
        retrievedArticleIds: string[]
        acceptableArticleIds: string[]
        durationMs: number
        knownCostUsd: number
        unknownAttempts: number
      }>,
    }
    for (const c of dataset.cases) {
      let retrievedArticleIds: string[] = []
      const answers = new KnowledgeAnswerService(
        llm,
        {
          search: async (input, at) => {
            const rows = await kb.search(input, at)
            retrievedArticleIds = rows.map((r) => r.articleId)
            return rows
          },
        },
        new DrizzleAiRunRepository(db.db),
        12000,
        () => new Date(),
        randomUUID,
      )
      const started = performance.now(),
        acceptableArticleIds = c.acceptableSourceKeys.flatMap((k) => bindings[k] ?? [])
      const reason = ineligibleReason(
        {
          source: 'portal',
          gmailThreadId: null,
          triage: 'human',
          humanTakeover: false,
          category: c.category,
          requesterAccountId: randomUUID(),
        },
        c.question,
        policy,
      )
      let decision: 'answer' | 'handoff' = 'handoff',
        reply: string | null = null,
        resultReason: string | null = reason,
        knownCostUsd = 0,
        unknownAttempts = 0
      if (!reason)
        try {
          const run = await answers.answer({
            query: c.question,
            thread: c.thread,
            audience: c.audience,
            product: c.product,
            ticketId: null,
            generation: null,
            purpose: 'test',
            limit: 6,
            maxAttempts: 1,
            deadline: new Date(Date.now() + 30000),
            beforeAttempt: async () => {
              if (spent + config.EVALUATION_ATTEMPT_RESERVE_USD > config.EVALUATION_MAX_COST_USD)
                throw new Error('Evaluation budget exhausted')
              spent += config.EVALUATION_ATTEMPT_RESERVE_USD
            },
            onAttempt: async (attempt) => {
              if (attempt.outcome === 'started') unknownAttempts++
              else if (attempt.costUsd !== null) {
                knownCostUsd += attempt.costUsd
                spent += attempt.costUsd - config.EVALUATION_ATTEMPT_RESERVE_USD
                unknownAttempts = Math.max(0, unknownAttempts - 1)
              }
            },
          })
          decision = run.coverage === 'covered' && run.reply ? 'answer' : 'handoff'
          reply = run.reply
          resultReason = run.reason
        } catch {
          resultReason = 'provider_failure_or_budget'
        }
      output.results.push({
        id: c.id,
        decision,
        reply,
        reason: resultReason,
        retrievedArticleIds,
        acceptableArticleIds,
        durationMs: performance.now() - started,
        knownCostUsd,
        unknownAttempts,
      })
      await Bun.write(outputPath, `${JSON.stringify(output, null, 2)}\n`)
    }
    const raw = await Bun.file(outputPath).text()
    await Bun.write(
      `${outputPath}.reviews-template.json`,
      `${JSON.stringify(
        {
          outputHash: artifactHash(raw),
          reviewedBy: '',
          deterministicPassed: false,
          cases: dataset.cases.map((c) => ({
            id: c.id,
            correct: false,
            criticalError: false,
            comment: '',
          })),
        },
        null,
        2,
      )}\n`,
    )
    console.info(
      `Concluídos ${output.results.length} casos. Nenhuma resposta foi enviada e nenhuma política foi ativada.`,
    )
  } finally {
    await db.close()
  }
}
