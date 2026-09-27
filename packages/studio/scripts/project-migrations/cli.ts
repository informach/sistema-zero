import { mkdir, rename } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { captureCorpus } from './capture'
import { canonical } from './content'
import { applyPlan, type BatchAdapter, rollbackPlan } from './engine'
import { type BatchPlan, type Corpus, makePlan } from './plan'
import {
  assertCandidate,
  compareAndSwapRows,
  inventoryRows,
  putObject,
  readObjects,
  validateRowChanges,
} from './railway'
import { simulate } from './simulate'
import { assertTarget, migrationTarget } from './target'

const [command, ...args] = process.argv.slice(2)
const option = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const target = migrationTarget(option('--environment'))
const root = resolve(import.meta.dir, '../../../..')
const cache = resolve(root, '.cache/jogo-2d')
const directory = resolve(option('--directory') ?? `${cache}/${target.environment}/batch`)
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
    target: plan.target,
    sourceHash: plan.sourceHash,
    documents: plan.documents,
    assets: plan.assets,
    changedRows: plan.rows.length,
    changedObjects: plan.objects.length,
    backupObjects: plan.backups.length,
    failures: plan.failures,
  }
}
if (command === 'preflight') {
  await readObjects(target, [])
  await inventoryRows(target)
  const candidate = option('--candidate')
  if (candidate) await assertCandidate(target, candidate)
  console.log(`Destino, buckets e schema conferidos em ${target.environment}, sem gravação`)
} else if (command === 'capture') {
  if (await Bun.file(resolve(directory, 'corpus.json')).exists())
    throw new Error('Este diretório já contém um inventário; use um diretório novo')
  await save('corpus.json', await captureCorpus(target))
  console.log('Inventário completo salvo, sem escrita remota')
} else if (command === 'plan') {
  const corpus = (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus
  assertTarget(corpus.target, target)
  const plan = await makePlan(corpus)
  await save('plan.json', plan)
  await save('report.json', summary(plan))
  console.log(JSON.stringify(summary(plan), null, 2))
  if (plan.failures.length) process.exitCode = 1
} else if (command === 'simulate') {
  const corpus = (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus
  assertTarget(corpus.target, target)
  const report = await simulate(corpus)
  await save('simulation.json', report)
  console.log(JSON.stringify(report, null, 2))
} else if (command === 'check-remote') {
  const plan = (await Bun.file(resolve(directory, 'plan.json')).json()) as BatchPlan
  assertTarget(plan.target, target)
  if (plan.failures.length)
    throw new Error('Resolva as pendências do plano antes da conferência remota')
  const checked = await validateRowChanges(target, plan.rows)
  console.log(`Comparação e tipos SQL conferidos em ${checked} registros, sem gravação`)
} else if (command === 'apply' || command === 'rollback') {
  const candidate = option('--candidate')
  if (!candidate) throw new Error('Informe --candidate com o SHA completo implantado no destino')
  const plan = (await Bun.file(resolve(directory, 'plan.json')).json()) as BatchPlan
  const corpus = (await Bun.file(resolve(directory, 'corpus.json')).json()) as Corpus
  assertTarget(plan.target, target)
  assertTarget(corpus.target, target)
  const rebuilt = await makePlan(corpus)
  if (canonical(plan) !== canonical(rebuilt))
    throw new Error('O plano mudou desde a simulação; revise a diferença antes de aplicar')
  const adapter: BatchAdapter = {
    target,
    assertCandidate: () => assertCandidate(target, candidate),
    rows: () => inventoryRows(target),
    objects: (refs) => readObjects(target, refs),
    put: (object, etag) => putObject(target, object, etag),
    swap: (changes, sources) => compareAndSwapRows(target, changes, sources),
    progress: console.log,
  }
  if (command === 'apply') await applyPlan(plan, adapter)
  else await rollbackPlan(plan, adapter)
  await save(`${command}-result.json`, {
    ...summary(plan),
    candidate,
    completedAt: new Date().toISOString(),
  })
  console.log(`${command} concluído em ${target.environment}`)
} else {
  throw new Error(
    'Uso: bun scripts/project-migrations/cli.ts preflight|capture|plan|simulate|check-remote|apply|rollback --environment staging|production [--directory caminho] [--candidate sha]',
  )
}
