import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SHA = /^[a-f0-9]{40}$/
const HASH = /^[a-f0-9]{64}$/
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const EPOCH = '.github/staging-deploy-epoch-v1.json'
// Criado após a fotografia histórica; o primeiro deploy é provado em etapa própria da onda.
const postBootstrapServices = Object.freeze({
  'arquipelago-api': 'ee19a264-7708-471a-adf9-c9db1cfdb9a2',
})
// An exhausted bound is a refusal, never permission to truncate the baseline history.
const MAX_PAGES = 20
const failureCodes = new Set([
  'validation',
  'github-unavailable',
  'github-http',
  'github-json',
  'github-repository',
  'github-page',
  'github-pagination',
])
class StagingBaselineError extends Error {
  constructor(message, code) {
    super(`staging baseline: ${message}`)
    this.code = code
  }
}
export function baselineFailureCode(error) {
  return error instanceof StagingBaselineError && failureCodes.has(error.code)
    ? error.code
    : 'unexpected'
}
const fail = (message, code = 'validation') => {
  throw new StagingBaselineError(message, code)
}
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const positive = (value) => Number.isSafeInteger(value) && value > 0

export function configuredServiceIds(workflowText, env = {}) {
  const map = /declare -A SVC_ID=\(([\s\S]*?)\n\s*\)/.exec(workflowText)?.[1]
  if (!map) fail('service map unavailable')
  const ids = {}
  for (const line of map.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const entry = /^\s*\[([a-z][a-z0-9-]*)\]=([a-f0-9-]+)\s*$/i.exec(line)
    if (!entry || !UUID.test(entry[2]) || ids[entry[1]]) fail('invalid service map')
    ids[entry[1]] = entry[2]
  }
  if (!Object.keys(ids).length) fail('empty service map')
  for (const [name, variable] of [
    ['helpdesk', 'HELPDESK_SERVICE_ID'],
    ['helpdesk-app', 'HELPDESK_APP_SERVICE_ID'],
    ['live-recorder', 'LIVE_RECORDER_SERVICE_ID'],
  ]) {
    if (!env[variable]) continue
    if (!UUID.test(env[variable]) || ids[name]) fail('invalid optional service ID')
    ids[name] = env[variable]
  }
  if (new Set(Object.values(ids)).size !== Object.keys(ids).length) fail('duplicate service ID')
  return ids
}

export function deriveActivationSha(currentSha, git) {
  if (!SHA.test(currentSha)) fail('invalid current SHA')
  const lines = git(['log', '--format=%H', '--diff-filter=A', currentSha, '--', EPOCH])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
  if (lines.length !== 1 || !SHA.test(lines[0]))
    fail('policy epoch introduction is unavailable or ambiguous')
  return lines[0]
}

function bootstrapRecord(value, configured) {
  // Root reviews these external receipts; this helper does not query live providers.
  if (
    !object(configured) ||
    Object.entries(configured).some(
      ([name, id]) => !/^[a-z][a-z0-9-]*$/.test(name) || typeof id !== 'string' || !UUID.test(id),
    ) ||
    new Set(Object.values(configured)).size !== Object.keys(configured).length
  )
    fail('invalid configured service identities')
  if (
    !object(value) ||
    value.version !== 1 ||
    !SHA.test(value.headSha) ||
    !object(value.ci) ||
    !positive(value.ci.runId) ||
    !positive(value.ci.attempt) ||
    !positive(value.ci.jobId)
  )
    fail('verified bootstrap required')
  const coverage = value.coverage
  if (
    !object(coverage) ||
    !Array.isArray(coverage.ciServices) ||
    !coverage.ciServices.length ||
    !Array.isArray(coverage.extraServices) ||
    !HASH.test(coverage.ciReceiptSha256) ||
    (coverage.extraServices.length && !HASH.test(coverage.extraReceiptSha256))
  )
    fail('bootstrap reconciliation receipts required')
  for (const [name, id] of Object.entries(postBootstrapServices)) {
    if (configured[name] !== undefined && configured[name] !== id)
      fail('post-bootstrap service identity diverged')
  }
  const required = Object.keys(configured)
    .filter((name) => !Object.hasOwn(postBootstrapServices, name))
    .sort()
  const covered = [...coverage.ciServices, ...coverage.extraServices]
  if (
    !required.length ||
    covered.some((name) => typeof name !== 'string') ||
    new Set(covered).size !== covered.length ||
    JSON.stringify([...covered].sort()) !== JSON.stringify(required)
  )
    fail('bootstrap coverage does not match configured services')
  if (
    !object(value.ready) ||
    !HASH.test(value.ready.receiptSha256) ||
    !Array.isArray(value.ready.services) ||
    value.ready.services.length !== required.length
  )
    fail('bootstrap readiness receipt required')
  const seen = new Set()
  const deploymentIds = new Set()
  for (const service of value.ready.services) {
    if (
      !object(service) ||
      typeof service.name !== 'string' ||
      !Object.hasOwn(configured, service.name) ||
      seen.has(service.name) ||
      typeof service.serviceId !== 'string' ||
      !UUID.test(service.serviceId) ||
      configured[service.name] !== service.serviceId ||
      !UUID.test(service.deploymentId) ||
      deploymentIds.has(service.deploymentId) ||
      service.commitSha !== value.headSha ||
      service.status !== 'SUCCESS'
    )
      fail('invalid bootstrap readiness coverage')
    seen.add(service.name)
    deploymentIds.add(service.deploymentId)
  }
  if (seen.size !== required.length) fail('incomplete bootstrap readiness coverage')
  return value
}

function runRecord(run) {
  if (
    !object(run) ||
    !positive(run.id) ||
    run.path !== '.github/workflows/ci.yml' ||
    !positive(run.run_attempt) ||
    !SHA.test(run.head_sha) ||
    typeof run.event !== 'string' ||
    typeof run.head_branch !== 'string' ||
    typeof run.status !== 'string' ||
    !(run.conclusion === null || typeof run.conclusion === 'string')
  )
    fail('malformed GitHub run metadata')
  return run
}

async function call(label, fn, ...args) {
  try {
    return await fn(...args)
  } catch (error) {
    if (error instanceof StagingBaselineError) throw error
    fail(`GitHub API failed (${label})`, 'github-unavailable')
  }
}

async function ancestry(deps, older, newer) {
  let result
  try {
    result = await deps.isAncestor(older, newer)
  } catch {
    fail('Git ancestry unavailable')
  }
  if (typeof result !== 'boolean') fail('malformed Git ancestry result')
  return result
}

async function pages(label, getPage, field) {
  const result = []
  const seen = new Set()
  let page = 1
  let totalCount
  for (let count = 0; count < MAX_PAGES; count++) {
    const response = await call(label, getPage, page)
    if (
      !object(response) ||
      !Array.isArray(response[field]) ||
      !(response.nextPage === null || response.nextPage === page + 1)
    )
      fail(`malformed ${label} pagination`)
    if (response.totalCount !== undefined) {
      if (
        !Number.isSafeInteger(response.totalCount) ||
        response.totalCount < 0 ||
        (totalCount !== undefined && totalCount !== response.totalCount)
      )
        fail(`inconsistent ${label} pagination count`)
      totalCount = response.totalCount
    }
    for (const item of response[field]) {
      if (!object(item) || !positive(item.id) || seen.has(item.id))
        fail(`incomplete or duplicate ${label} records`)
      seen.add(item.id)
      result.push(item)
    }
    if (response.nextPage === null) {
      if (totalCount !== undefined && totalCount !== result.length)
        fail(`incomplete ${label} pagination`)
      return result
    }
    page = response.nextPage
  }
  fail(`${label} pagination bound exceeded`)
}

async function successfulJobs(run, deps) {
  const jobs = await pages('jobs', (page) => deps.listJobs(run.id, run.run_attempt, page), 'jobs')
  const ci = jobs.filter((job) => job.name === 'ci')
  const deploy = jobs.filter((job) => job.name === 'deploy-staging')
  if (ci.length !== 1 || deploy.length !== 1) fail('CI/deploy job metadata missing or ambiguous')
  for (const job of [...ci, ...deploy]) {
    if (
      !positive(job.id) ||
      job.run_id !== run.id ||
      job.run_attempt !== run.run_attempt ||
      job.head_sha !== run.head_sha ||
      typeof job.status !== 'string' ||
      !(job.conclusion === null || typeof job.conclusion === 'string')
    )
      fail('job attempt or head mismatch')
  }
  if ([...ci, ...deploy].some((job) => job.status !== 'completed' || job.conclusion !== 'success'))
    return null
  if (
    typeof deploy[0].completed_at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(deploy[0].completed_at) ||
    !Number.isFinite(Date.parse(deploy[0].completed_at))
  )
    fail('deployment completion time unavailable')
  return deploy[0]
}

export async function resolveBefore(context, deps) {
  if (context.eventName === 'workflow_dispatch') {
    if (context.beforeInput !== undefined && typeof context.beforeInput !== 'string')
      fail('invalid dispatch before input')
    return { before: context.beforeInput ?? '', source: 'dispatch' }
  }
  if (
    context.eventName !== 'push' ||
    !SHA.test(context.currentSha) ||
    !SHA.test(context.activationSha) ||
    !positive(context.currentRunId)
  )
    fail('invalid push context')
  const bootstrap = bootstrapRecord(context.bootstrap, context.configuredServices ?? {})
  if (
    !(await ancestry(deps, bootstrap.headSha, context.currentSha)) ||
    !(await ancestry(deps, context.activationSha, context.currentSha))
  )
    fail('bootstrap/epoch is not ancestral to checkout')
  const original = runRecord(await call('bootstrap run', deps.getRun, bootstrap.ci.runId))
  if (
    original.id !== bootstrap.ci.runId ||
    original.run_attempt !== bootstrap.ci.attempt ||
    original.head_sha !== bootstrap.headSha ||
    original.event !== 'push' ||
    original.head_branch !== 'staging' ||
    original.status !== 'completed' ||
    original.conclusion !== 'success' ||
    original.id === context.currentRunId
  )
    fail('bootstrap CI identity is not verified successful')
  const originalDeploy = await successfulJobs(original, deps)
  if (!originalDeploy || originalDeploy.id !== bootstrap.ci.jobId)
    fail('bootstrap deploy identity is not verified successful')
  let best = {
    before: bootstrap.headSha,
    source: 'bootstrap',
    runId: original.id,
    attempt: original.run_attempt,
    jobId: originalDeploy.id,
    activationSha: context.activationSha,
  }
  let completed = Date.parse(originalDeploy.completed_at)
  const runs = await pages('runs', deps.listRuns, 'runs')
  for (const value of runs) {
    const run = runRecord(value)
    if (
      run.id === context.currentRunId ||
      run.id === original.id ||
      run.event !== 'push' ||
      run.head_branch !== 'staging' ||
      run.status !== 'completed' ||
      run.conclusion !== 'success'
    )
      continue
    if (
      !(await ancestry(deps, run.head_sha, context.currentSha)) ||
      !(await ancestry(deps, context.activationSha, run.head_sha)) ||
      !(await ancestry(deps, bootstrap.headSha, run.head_sha))
    )
      continue
    const deploy = await successfulJobs(run, deps)
    if (!deploy) continue
    const time = Date.parse(deploy.completed_at)
    if (time === completed && run.head_sha !== best.before)
      fail('ambiguous successful wave ordering')
    if (time > completed) {
      completed = time
      best = {
        before: run.head_sha,
        source: 'ci-deploy',
        runId: run.id,
        attempt: run.run_attempt,
        jobId: deploy.id,
        activationSha: context.activationSha,
      }
    }
  }
  return best
}

export function createGitHubApi(repository, token, fetchImpl = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || typeof token !== 'string' || !token)
    fail('GitHub repository/read credential required')
  const repositoryUrl = `https://api.github.com/repos/${repository}`
  const base = `${repositoryUrl}/actions/`
  async function requestJson(url) {
    let response
    try {
      response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      fail('GitHub request unavailable', 'github-unavailable')
    }
    if (!response.ok) fail(`GitHub request HTTP ${response.status}`, 'github-http')
    let data
    try {
      data = await response.json()
    } catch {
      fail('GitHub response is not JSON', 'github-json')
    }
    return { data, response }
  }
  // GitHub's Link header canonicalizes /repos/owner/name to /repositories/id.
  // Bind that ID to authenticated metadata for this exact repository once.
  let repositoryIdentity
  function canonicalBase() {
    repositoryIdentity ??= requestJson(repositoryUrl).then(({ data }) => {
      if (
        !object(data) ||
        !positive(data.id) ||
        typeof data.full_name !== 'string' ||
        data.full_name.toLowerCase() !== repository.toLowerCase()
      )
        fail('GitHub repository identity mismatch', 'github-repository')
      return `https://api.github.com/repositories/${data.id}/actions/`
    })
    return repositoryIdentity
  }
  async function request(path, field, page) {
    const canonical = await canonicalBase()
    const { data, response } = await requestJson(base + path)
    if (!field) return data
    if (
      !object(data) ||
      !Array.isArray(data[field]) ||
      !Number.isSafeInteger(data.total_count) ||
      data.total_count < data[field].length
    )
      fail('GitHub page body malformed', 'github-page')
    const link = response.headers.get('link') ?? ''
    if (
      link &&
      !/^\s*(<[^>]+>;\s*rel="(?:next|prev|first|last)"\s*)(,\s*<[^>]+>;\s*rel="(?:next|prev|first|last)"\s*)*$/.test(
        link,
      )
    )
      fail('GitHub pagination header malformed', 'github-pagination')
    if ([...link.matchAll(/rel="next"/g)].length > 1)
      fail('GitHub pagination next link ambiguous', 'github-pagination')
    const next = /<([^>]+)>;\s*rel="next"/.exec(link)?.[1]
    let nextPage = null
    if (next) {
      let url
      try {
        url = new URL(next)
      } catch {
        fail('GitHub pagination link malformed', 'github-pagination')
      }
      const originalUrl = new URL(base + path)
      const canonicalUrl = new URL(canonical + path)
      const expectedQuery = new URLSearchParams(originalUrl.searchParams)
      expectedQuery.set('page', String(page + 1))
      if (
        url.origin !== originalUrl.origin ||
        (url.pathname !== originalUrl.pathname && url.pathname !== canonicalUrl.pathname) ||
        url.username ||
        url.password ||
        url.hash ||
        url.searchParams.size !== expectedQuery.size ||
        [...expectedQuery].some(
          ([key, value]) =>
            url.searchParams.getAll(key).length !== 1 || url.searchParams.get(key) !== value,
        )
      )
        fail('GitHub pagination target invalid', 'github-pagination')
      nextPage = Number(url.searchParams.get('page'))
      if (!positive(nextPage) || nextPage !== page + 1)
        fail('GitHub pagination does not advance', 'github-pagination')
    }
    return {
      [field === 'workflow_runs' ? 'runs' : 'jobs']: data[field],
      nextPage,
      totalCount: data.total_count,
    }
  }
  return {
    getRun: (id) => request(`runs/${id}`),
    listRuns: (page) =>
      request(
        `workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=${page}`,
        'workflow_runs',
        page,
      ),
    listJobs: (id, attempt, page) =>
      request(`runs/${id}/attempts/${attempt}/jobs?per_page=100&page=${page}`, 'jobs', page),
  }
}

function gitRead(args) {
  const child = spawnSync('git', args, { encoding: 'utf8', timeout: 15_000, windowsHide: true })
  if (child.error || child.status !== 0) fail('Git read failed')
  return child.stdout
}

export async function runCli(env = process.env) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
  const context = {
    eventName: env.GITHUB_EVENT_NAME,
    beforeInput: event.inputs?.before_sha,
    currentSha: env.GITHUB_SHA,
    currentRunId: Number(env.GITHUB_RUN_ID),
  }
  let dependencies
  if (context.eventName === 'push') {
    if (
      gitRead(['rev-parse', 'HEAD']).trim() !== context.currentSha ||
      gitRead(['rev-parse', '--is-shallow-repository']).trim() !== 'false'
    )
      fail('exact full-history checkout required')
    const epoch = JSON.parse(readFileSync(EPOCH, 'utf8'))
    if (epoch.version !== 1 || epoch.protocol !== 'coherent-staging-baseline-v1')
      fail('policy epoch invalid')
    context.activationSha = deriveActivationSha(context.currentSha, gitRead)
    if (
      gitRead(['rev-parse', `${context.activationSha}:${EPOCH}`]).trim() !==
      gitRead(['rev-parse', `${context.currentSha}:${EPOCH}`]).trim()
    )
      fail('policy epoch blob changed after introduction')
    context.configuredServices = configuredServiceIds(
      readFileSync('.github/workflows/ci.yml', 'utf8'),
      env,
    )
    try {
      context.bootstrap = JSON.parse(
        readFileSync('.github/staging-deploy-bootstrap-v1.json', 'utf8'),
      )
    } catch {
      fail('reviewed reconciled bootstrap file required')
    }
    const api = createGitHubApi(env.GITHUB_REPOSITORY, env.GH_TOKEN ?? env.GITHUB_TOKEN)
    dependencies = {
      ...api,
      isAncestor: (older, newer) => {
        const child = spawnSync('git', ['merge-base', '--is-ancestor', older, newer], {
          timeout: 15_000,
          windowsHide: true,
        })
        if (child.error || ![0, 1].includes(child.status)) fail('Git ancestry read failed')
        return child.status === 0
      },
    }
  }
  const result = await resolveBefore(context, dependencies)
  // Dispatch input may contain newlines: preserve it without injecting outputs.
  let delimiter
  do {
    delimiter = `staging_before_${randomUUID()}`
  } while (result.before.split(/\r?\n/).includes(delimiter))
  const output = `selector=${JSON.stringify(result)}\nbefore<<${delimiter}\n${result.before}\n${delimiter}\n`
  if (!env.GITHUB_OUTPUT) fail('GitHub output destination required')
  appendFileSync(resolve(env.GITHUB_OUTPUT), output)
  console.log(`Staging selector baseline: ${result.source}; before=${result.before}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli().catch((error) => {
    console.error(
      `Staging baseline refused before provider access [${baselineFailureCode(error)}]; check bootstrap, Git history and GitHub read metadata.`,
    )
    process.exitCode = 1
  })
}
