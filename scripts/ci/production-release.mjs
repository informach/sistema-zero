import { execFileSync } from 'node:child_process'
import {
  appendFileSync,
  closeSync,
  fsyncSync,
  ftruncateSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { pathToFileURL } from 'node:url'
import { kidsJourneyTargets, productionApplicationIds } from '../release/kids-journey-targets.mjs'
import {
  createRailwayPorts,
  describeKidsJourneyRolloutFailure,
  prepareSsh,
  runKidsJourneyRollout,
} from './kids-journey-rollout.mjs'
import { runConfig, validateProductionRolloutPlan } from './railway-config.mjs'

const shaPattern = /^[a-f0-9]{40}$/
export const productionCiJobs = Object.freeze([
  'ci',
  'desktop-windows',
  'studio-storage-macos',
  'community-kids-e2e',
  'studio-e2e-chromium-1',
  'studio-e2e-chromium-2',
  'studio-e2e-chromium-3',
  'studio-e2e-firefox',
  'studio-e2e-webkit',
])

async function pages(get, path, field) {
  const rows = []
  for (let page = 1; page <= 20; page++) {
    const value = await get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`)
    const items = field ? value[field] : value
    if (!Array.isArray(items)) throw new Error('Resposta GitHub inválida')
    rows.push(...items)
    if (field) {
      if (!Number.isSafeInteger(value.total_count) || value.total_count < rows.length)
        throw new Error('Contagem GitHub inválida')
      if (rows.length === value.total_count) return rows
    } else if (items.length < 100) return rows
    if (items.length === 0) throw new Error('Paginação GitHub incompleta')
  }
  throw new Error('Limite de paginação GitHub excedido')
}

/** No Railway provider is touched until the promoted tree, CI attempt and PR plan are proven. */
export async function resolveProductionSource(sha, get) {
  if (!shaPattern.test(sha ?? '')) throw new Error('SHA completo obrigatório')
  const main = await get('/commits/main')
  if (main.sha !== sha || !shaPattern.test(main.commit?.tree?.sha ?? ''))
    throw new Error('Main difere do SHA aprovado')
  const prs = await pages(get, `/commits/${sha}/pulls`)
  const eligible = prs.filter(
    (pr) =>
      pr.merged_at &&
      pr.merge_commit_sha === sha &&
      pr.base?.ref === 'main' &&
      pr.head?.repo?.full_name === 'informach/sistema-zero',
  )
  if (eligible.length !== 1 || !shaPattern.test(eligible[0].head?.sha ?? ''))
    throw new Error('PR interno promovido único não encontrado')
  const pr = eligible[0]
  const head = await get(`/commits/${pr.head.sha}`)
  if (head.sha !== pr.head.sha || head.commit?.tree?.sha !== main.commit.tree.sha)
    throw new Error('Árvore promovida difere da árvore aprovada no PR')
  const runs = await pages(
    get,
    `/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,
    'workflow_runs',
  )
  const run = runs
    .filter(
      (candidate) =>
        candidate.path === '.github/workflows/ci.yml' &&
        candidate.event === 'pull_request' &&
        candidate.head_sha === pr.head.sha &&
        (candidate.pull_requests?.some((pull) => pull.number === pr.number) ||
          // GitHub can clear this association after merge. The exact internal
          // branch/repository still bind this run to the already-proven PR head.
          (Array.isArray(candidate.pull_requests) &&
            candidate.pull_requests.length === 0 &&
            typeof pr.head.ref === 'string' &&
            pr.head.ref.length > 0 &&
            candidate.head_branch === pr.head.ref &&
            candidate.head_repository?.full_name === 'informach/sistema-zero')),
    )
    .sort((a, b) => b.id - a.id)[0]
  if (
    !run ||
    !Number.isSafeInteger(run.id) ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.status !== 'completed' ||
    run.conclusion !== 'success'
  )
    throw new Error('Última tentativa CI do PR não está verde')
  const jobs = await pages(get, `/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs')
  for (const name of productionCiJobs) {
    const matches = jobs.filter((job) => job.name === name)
    if (
      matches.length !== 1 ||
      matches[0].status !== 'completed' ||
      matches[0].conclusion !== 'success' ||
      matches[0].run_id !== run.id
    )
      throw new Error('Nove jobs da mesma tentativa CI não foram qualificados')
  }
  const name = `railway-production-plan-${pr.head.sha}`
  const artifacts = await pages(get, `/actions/artifacts?name=${name}`, 'artifacts')
  for (const artifact of artifacts
    .filter(
      (entry) =>
        entry.name === name &&
        entry.expired === false &&
        entry.workflow_run?.head_sha === pr.head.sha,
    )
    .sort((a, b) => b.id - a.id)) {
    const planRun = await get(`/actions/runs/${artifact.workflow_run.id}`)
    if (
      planRun.path !== '.github/workflows/railway-config.yml' ||
      planRun.event !== 'pull_request' ||
      planRun.head_sha !== pr.head.sha ||
      planRun.status !== 'completed' ||
      planRun.conclusion !== 'success'
    )
      continue
    if (!Number.isSafeInteger(artifact.id) || !Number.isSafeInteger(planRun.id))
      throw new Error('Identidade do plano inválida')
    return {
      kind: 'production-promoted-source',
      sha,
      approvedHead: pr.head.sha,
      tree: main.commit.tree.sha,
      ci: { run: run.id, attempt: run.run_attempt, passedJobs: productionCiJobs.length },
      planArtifact: { id: artifact.id, run: planRun.id },
    }
  }
  throw new Error('Plano aprovado do mesmo PR não encontrado')
}

export function selectProductionServices(csv, ids) {
  if (typeof csv !== 'string' || !csv.trim() || csv === 'all')
    throw new Error('Onda explícita obrigatória')
  const selected = csv.split(',').map((value) => value.trim())
  if (
    selected.some((value) => !Object.hasOwn(ids, value)) ||
    new Set(selected).size !== selected.length
  )
    throw new Error('Serviço desconhecido ou duplicado')
  if (selected.includes('members') !== selected.includes('auth'))
    throw new Error('Members e Auth devem participar juntos da onda canônica')
  return selected
}

/** A first deployment is deliberate and closed to the already provisioned recorder. */
export function selectInitialProductionApplications(value, services) {
  if (value === undefined || value === false || value === 'false' || value === '') return []
  if ((value !== true && value !== 'true') || !services.includes('live-recorder'))
    throw new Error('Inicialização explícita permite somente o gravador selecionado')
  return ['live-recorder']
}

/** One owner; apps cannot be scheduled by this function before the V1 result. */
export async function runProductionRelease(input, ports) {
  if (!shaPattern.test(input.sha ?? '')) throw new Error('SHA inválido')
  const services = selectProductionServices(input.services, ports.ids)
  const initialApplications = selectInitialProductionApplications(
    input.initializeRecorder,
    services,
  )
  validateProductionRolloutPlan(input.plan)
  const deadline = ports.now() + 175 * 60 * 1000
  const bounded = async (operation) => {
    if (ports.now() >= deadline) throw new Error('Onda produção excedeu o prazo')
    const value = await operation()
    if (ports.now() >= deadline) throw new Error('Onda produção excedeu o prazo')
    return value
  }
  await bounded(() => ports.checkSource())
  await bounded(() => ports.backend.requireNativeDisabled(Object.keys(ports.ids), deadline))
  await bounded(() => ports.backend.preflightApplications(services, deadline, initialApplications))
  await bounded(() => ports.backend.preflight(deadline))
  // This operation is readonly: nonempty config is refused above and again by runConfig.
  await bounded(() => ports.checkConfiguration())
  const mode = services.includes('members') ? 'deploy' : 'verify'
  const barrier = await bounded(() =>
    runKidsJourneyRollout({ mode, sha: input.sha }, ports.backend),
  )
  if (
    barrier.status !== 'published' ||
    !Number.isSafeInteger(barrier.version) ||
    barrier.version < 1
  )
    throw new Error('Barreira canônica de produção ausente')
  ports.log({ stage: 'BACKEND_BARRIER_PASSED', publishedVersion: barrier.version })
  const apps = services.filter((name) => !['members', 'auth'].includes(name))
  // Queue, build, healthcheck and retirement share this budget, as in staging.
  // Keep the whole-wave deadline authoritative even after a long backend barrier.
  const appDeadline = Math.min(deadline, ports.now() + 60 * 60 * 1000)
  const deployments = []
  let dispatchFailure
  try {
    for (const name of apps) {
      if (ports.now() >= appDeadline) throw new Error('Onda de apps excedeu o prazo')
      deployments.push({ name, id: await ports.backend.deploy(name, appDeadline) })
    }
  } catch (error) {
    dispatchFailure = error
  }
  // Wait for every ACK we own even if another owned operation fails. No cancel/retry.
  const results = await Promise.allSettled(
    deployments.map(({ name, id }) => ports.backend.waitRetired(name, id, appDeadline)),
  )
  if (dispatchFailure) throw dispatchFailure
  const failure = results.find((result) => result.status === 'rejected')
  if (failure) throw failure.reason
  await bounded(() => ports.checkSource())
  await bounded(() => ports.backend.requireNativeDisabled(Object.keys(ports.ids), deadline))
  return {
    state: 'PRODUCTION_WAVE_PASSED',
    sha: input.sha,
    target: 'production',
    environment: kidsJourneyTargets.production.environment,
    publishedVersion: barrier.version,
    deployments,
    initialApplications,
  }
}

function githubReader(env) {
  if (!env.GH_TOKEN || env.GITHUB_REPOSITORY !== 'informach/sistema-zero')
    throw new Error('Contexto GitHub inválido')
  return async (path) => {
    const response = await fetch(`https://api.github.com/repos/informach/sistema-zero${path}`, {
      headers: {
        authorization: `Bearer ${env.GH_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('Leitura GitHub recusada')
    return response.json()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let ssh
  let record
  let persist
  try {
    const [mode, sha, services, planPath] = process.argv.slice(2)
    if (
      !['source', 'deploy'].includes(mode) ||
      (mode === 'source' ? process.argv.length !== 4 : process.argv.length !== 6) ||
      process.env.GITHUB_REF !== 'refs/heads/main'
    )
      throw new Error('Dispatch explícito de main obrigatório')
    if (
      !shaPattern.test(sha ?? '') ||
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000 }).trim() !== sha
    )
      throw new Error('Checkout difere do SHA aprovado')
    const get = githubReader(process.env)
    const source = await resolveProductionSource(sha, get)
    if (mode === 'source') {
      if (!process.env.GITHUB_OUTPUT) throw new Error('Saída GitHub ausente')
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `plan_id=${source.planArtifact.id}\nplan_run=${source.planArtifact.run}\n`,
      )
      console.log(JSON.stringify(source))
    } else {
      const ids = productionApplicationIds(process.env)
      const selected = selectProductionServices(services, ids)
      const initialApplications = selectInitialProductionApplications(
        process.env.INITIALIZE_RECORDER,
        selected,
      )
      const plan = JSON.parse(readFileSync(planPath, 'utf8'))
      validateProductionRolloutPlan(plan)
      record = {
        kind: 'production-owned-release',
        source,
        state: 'PREPARING',
        initialApplications,
        events: [],
      }
      writeFileSync('production-manifest.json', JSON.stringify(record), { flag: 'wx', mode: 0o600 })
      persist = () => {
        const fd = openSync('production-manifest.json', 'r+')
        try {
          const text = `${JSON.stringify(record, null, 2)}\n`
          writeFileSync(fd, text)
          ftruncateSync(fd, Buffer.byteLength(text))
          fsyncSync(fd)
        } finally {
          closeSync(fd)
        }
      }
      const log = (event) => {
        if (record.events.length >= 20000) throw new Error('Limite do journal excedido')
        record.events.push({ ...event, at: new Date().toISOString() })
        persist()
      }
      const freshMain = async () => {
        if ((await get('/commits/main')).sha !== sha)
          throw new Error('Main avançou; parar novas mutações')
      }
      ssh = prepareSsh(process.env)
      const backend = createRailwayPorts(sha, process.env, ssh.identity, {
        target: 'production',
        applications: true,
        log,
        async beforeDeploy(service, deadline) {
          await freshMain()
          await backend.requireNativeDisabled([service], deadline)
        },
      })
      const result = await runProductionRelease(
        { sha, services, plan, initializeRecorder: process.env.INITIALIZE_RECORDER },
        {
          ids,
          backend,
          now: backend.now,
          log,
          checkSource: freshMain,
          checkConfiguration: () => runConfig('check', 'production', planPath),
        },
      )
      Object.assign(record, result)
      persist()
      console.log(JSON.stringify(result))
    }
  } catch (error) {
    if (record && persist) {
      record.state = 'FAILED'
      record.failure = describeKidsJourneyRolloutFailure(error)
      persist()
    }
    console.error(
      JSON.stringify({
        kind: 'production-release-refused',
        ...describeKidsJourneyRolloutFailure(error),
      }),
    )
    process.exitCode = 1
  } finally {
    ssh?.dispose()
  }
}
