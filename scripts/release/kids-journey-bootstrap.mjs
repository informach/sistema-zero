import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { kidsJourneyTargets, resolveKidsJourneyTarget } from './kids-journey-targets.mjs'

export const stagingJourney = kidsJourneyTargets.staging
export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const actions = new Set(['migrate', 'initialize', 'advance', 'publish', 'verify'])

export function validateRemoteContext(input, env) {
  const target = resolveKidsJourneyTarget(input.target)
  if (
    !actions.has(input.action) ||
    !/^[a-f0-9]{40}$/.test(input.sha ?? '') ||
    !uuidPattern.test(input.deployment ?? '') ||
    !/^[a-f0-9]{32}$/.test(input.nonce ?? '')
  )
    throw new Error('Contexto remoto inválido')
  if (
    (input.target === 'production' && env.RAILWAY_PROJECT_ID !== target.project) ||
    env.RAILWAY_ENVIRONMENT_ID !== target.environment ||
    env.RAILWAY_SERVICE_ID !== target.members ||
    env.RAILWAY_DEPLOYMENT_ID !== input.deployment ||
    env.RAILWAY_GIT_COMMIT_SHA !== input.sha
  )
    throw new Error('Artefato/SHA/deployment/ambiente Members divergente')
  if (
    [
      'DATABASE_URL',
      'AUTH_BASE_URL',
      'AUTH_INTERNAL_TOKEN',
      'MEMBERS_PROFILE_ADMISSION_TOKEN',
    ].some((key) => !env[key])
  )
    throw new Error('Configuração Members de bootstrap incompleta')
  if (['advance', 'publish'].includes(input.action) && !uuidPattern.test(input.preparationId ?? ''))
    throw new Error('Identificador de preparação inválido')
}

/** CLI output is a closed receipt, never forwarded diagnostics, policy, owners or environment. */
export function parseBootstrapOutput(output, action, preparationId) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean)
  if (!lines.length || lines.length > 20) throw new Error('Recibo bootstrap ausente/inválido')
  let last
  for (const line of lines) {
    const value = JSON.parse(line)
    if (!value || typeof value !== 'object') throw new Error('Recibo bootstrap inválido')
    if (action === 'initialize') {
      if (
        value.status === 'already-published' &&
        Number.isSafeInteger(value.version) &&
        value.version >= 1
      )
        last = { status: value.status, version: value.version }
      else if (
        value.status === 'initializing' &&
        value.version === 0 &&
        uuidPattern.test(value.preparationId ?? '')
      )
        last = { status: value.status, version: 0, preparationId: value.preparationId }
      else throw new Error('Estado inicial bootstrap inválido')
    } else if (action === 'advance') {
      if (
        value.preparationId !== preparationId ||
        !['advanced', 'ready', 'published'].includes(value.status) ||
        !['capturing', 'preparing', 'ready', 'published'].includes(value.phase) ||
        !Number.isSafeInteger(value.processed) ||
        value.processed < 0
      )
        throw new Error('Avanço bootstrap recusado ou preparação divergente')
      last = { status: value.status, preparationId, phase: value.phase, processed: value.processed }
    } else {
      if (!['published', 'already-published'].includes(value.status))
        throw new Error('Publicação bootstrap recusada')
      if (
        value.status === 'published' &&
        (!Number.isSafeInteger(value.version) || value.version < 1)
      )
        throw new Error('Versão publicada inválida')
      last = {
        status: value.status,
        ...(value.version === undefined ? {} : { version: value.version }),
      }
    }
  }
  return last
}

async function readJourney(read) {
  // Imported only inside the deployed Bun artifact, never in the Node CI orchestrator.
  const { createDbConnection } = await import(
    '../../packages/members/src/infrastructure/persistence/drizzle/db.ts'
  )
  const { DrizzleKidsJourneyRepository } = await import(
    '../../packages/members/src/infrastructure/persistence/drizzle/kids-journey.repository.ts'
  )
  const connection = createDbConnection(process.env.DATABASE_URL, { max: 1 })
  try {
    return await read(new DrizzleKidsJourneyRepository(connection.db))
  } finally {
    await connection.close()
  }
}

const readPublished = () =>
  readJourney(async (repository) => {
    const { policy } = await repository.readSnapshot([])
    return { phase: policy.phase, version: policy.version }
  })

export function preparationProgress(preparation, id) {
  if (
    !preparation ||
    preparation.id !== id ||
    preparation.origin !== 'seed' ||
    preparation.expectedVersion !== 0
  )
    throw new Error('Preparação canônica divergente')
  const {
    status,
    captureStage,
    captureCursor,
    authCapture,
    cursor,
    upperBound,
    processed,
    cohortHash,
  } = preparation
  // Cursor identities remain private; only a digest leaves the container.
  return createHash('sha256')
    .update(
      JSON.stringify({
        status,
        captureStage,
        captureCursor,
        authCapture,
        cursor,
        upperBound,
        processed,
        cohortHash,
      }),
    )
    .digest('hex')
}

export async function runRemoteBootstrap(input, env = process.env, ports = {}) {
  validateRemoteContext(input, env)
  const exec =
    ports.exec ??
    ((args) =>
      execFileSync('bun', args, {
        cwd: '/app',
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000,
        maxBuffer: 262144,
      }))
  let result
  if (input.action === 'verify') {
    const policy = await (ports.readPublished ?? readPublished)()
    if (policy.phase !== 'published' || !Number.isSafeInteger(policy.version) || policy.version < 1)
      throw new Error('Jornada ainda não publicada')
    result = { status: 'published', version: policy.version }
  } else if (input.action === 'migrate') {
    await exec(['run', '--filter', '@sistemazero/members', 'db:migrate'])
    result = { status: 'migrated' }
  } else {
    const args = [
      'run',
      'packages/members/scripts/bootstrap-kids-journey.ts',
      input.action,
      '--confirm-rollout-order',
    ]
    if (input.preparationId) args.push('--preparation', input.preparationId)
    if (input.action === 'advance') args.push('--steps', '20')
    result = parseBootstrapOutput(await exec(args), input.action, input.preparationId)
    if (input.action === 'advance') {
      const current = await (
        ports.readPreparation ??
        ((id) => readJourney((repository) => repository.getPreparation(id)))
      )(input.preparationId)
      result.progress = preparationProgress(current, input.preparationId)
    }
  }
  return {
    kind: 'kids-journey-rollout',
    nonce: input.nonce,
    ...(input.target === 'production'
      ? {
          target: 'production',
          project: env.RAILWAY_PROJECT_ID,
          environment: env.RAILWAY_ENVIRONMENT_ID,
        }
      : {}),
    ...result,
  }
}

export function parseBootstrapArguments(args) {
  const explicit = args[0] === '--target'
  const target = explicit ? args[1] : 'staging'
  resolveKidsJourneyTarget(target)
  const values = explicit ? args.slice(2) : args
  if (values.length < 4 || values.length > 5) throw new Error('Argumentos bootstrap inválidos')
  const [action, sha, deployment, nonce, preparationId] = values
  return { action, sha, deployment, nonce, preparationId, ...(explicit ? { target } : {}) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(
      JSON.stringify(await runRemoteBootstrap(parseBootstrapArguments(process.argv.slice(2)))),
    )
  } catch {
    // Child errors can contain database configuration. Never forward stdout/stderr or the error object.
    console.error(
      'Bootstrap Kids falhou; apps não devem ser liberados. Retome a mesma preparação explicitamente.',
    )
    process.exitCode = 1
  }
}
