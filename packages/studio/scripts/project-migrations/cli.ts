import { mkdir, rename } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { captureCorpus } from './capture'
import { canonical } from './content'
import { applyPlan, rollbackPlan } from './engine'
import { type BatchPlan, type Corpus, makePlan } from './plan'
import {
  assertStagingCandidate,
  compareAndSwapRows,
  inventoryRows,
  putObject,
  readObjects,
  validateRowChanges,
} from './railway'
import { simulate } from './simulate'

const [command, ...args] = process.argv.slice(2)
const option = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const root = resolve(import.meta.dir, '../../../..')
const cache = resolve(root, '.cache/jogo-2d')
const directory = resolve(option('--directory') ?? `${cache}/batch`)
const within = relative(cache, directory)
if (within.startsWith('..') || isAbsolute(within))
  throw new Error('Corpus privado deve ficar em .cache/jogo-2d, ignorado pelo Git')
await mkdir(directory, { recursive: true })
async function save(name: string, value: unknown): Promise<void> {
  const target = resolve(directory, name)
  await Bun.write(`${target}.tmp`, JSON.stringify(value))
  await rename(`${target}.tmp`, target)
}
function summary(plan: BatchPlan) {
  return {
    environment: plan.environment,
    sourceHash: plan.sourceHash,
    documents: plan.documents,
    assets: plan.assets,
    changedRows: plan.rows.length,
    changedObjects: plan.objects.length,
    backupObjects: plan.backups.length,
    failures: plan.failures,
  }
}
if (command === 'capture') {
  if (await Bun.file(resolve(directory, 'corpus.json')).exists())
    throw new Error('Este diretório já contém um inventário; use um diretório novo')
  await save('corpus.json', await captureCorpus())
  console.log('Inventário completo salvo, sem escrita remota')
} else if (command === 'plan') {
  const corpus = (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus
  const plan = await makePlan(corpus)
  await save('plan.json', plan)
  await save('report.json', summary(plan))
  console.log(JSON.stringify(summary(plan), null, 2))
  if (plan.failures.length) process.exitCode = 1
} else if (command === 'simulate') {
  const report = await simulate(
    (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus,
  )
  await save('simulation.json', report)
  console.log(JSON.stringify(report, null, 2))
} else if (command === 'check-remote') {
  const plan = (await Bun.file(resolve(directory, 'plan.json')).json()) as BatchPlan
  if (plan.failures.length)
    throw new Error('Resolva as pendências do plano antes da conferência remota')
  const checked = await validateRowChanges(plan.rows)
  console.log(`Comparação e tipos SQL conferidos em ${checked} registros, sem gravação`)
} else if (command === 'apply' || command === 'rollback') {
  const candidate = option('--candidate')
  if (!candidate) throw new Error('Informe --candidate com o commit implantado em staging')
  const plan = (await Bun.file(resolve(directory, 'plan.json')).json()) as BatchPlan
  const corpus = (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus
  const rebuilt = await makePlan(corpus)
  if (canonical(plan) !== canonical(rebuilt))
    throw new Error('O plano mudou desde a simulação; revise a diferença antes de aplicar')
  const adapter = {
    assertCandidate: () => assertStagingCandidate(candidate),
    rows: inventoryRows,
    objects: readObjects,
    put: putObject,
    swap: compareAndSwapRows,
    progress: console.log,
  }
  if (command === 'apply') await applyPlan(plan, adapter)
  else await rollbackPlan(plan, adapter)
  await save(`${command}-result.json`, {
    ...summary(plan),
    candidate,
    completedAt: new Date().toISOString(),
  })
  console.log(`${command} concluído em staging`)
} else {
  throw new Error(
    'Uso: bun scripts/project-migrations/cli.ts capture|plan|simulate|check-remote|apply|rollback [--directory caminho] [--candidate sha]',
  )
}
