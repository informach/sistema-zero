import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stagingJourney, uuidPattern } from '../release/kids-journey-bootstrap.mjs'
import {
  initialProductionApplicationIds,
  productionApplicationIds,
  resolveKidsJourneyTarget,
} from '../release/kids-journey-targets.mjs'
import { railwayReadQuery } from './railway-read-query.mjs'

// Deployment orchestration only; product/test execution budgets are independent.
export const STAGING_ROLLOUT_TIMEOUT_MS = 140 * 60 * 1000
export const STAGING_DEPLOYMENT_TIMEOUT_MS = 60 * 60 * 1000
export const STAGING_DEPLOYMENT_POLL_MS = 10000

// Diagnostics are generated locally. Never serialize an exception, command, API body or token.
const rolloutFailures = new WeakMap()
const apiFailures = new WeakMap()
const probeFailureReasons = new WeakMap()
const probeFailureSignals = new WeakMap()
const safeSshSignals = new Set([
  'auth',
  'authentication',
  'authorization',
  'denied',
  'deployment',
  'domain',
  'environment',
  'error',
  'expired',
  'failed',
  'forbidden',
  'host',
  'identity',
  'instance',
  'invalid',
  'key',
  'keys',
  'missing',
  'not',
  'permission',
  'project',
  'publickey',
  'registered',
  'service',
  'ssh',
  'target',
  'timeout',
  'token',
  'unauthorized',
  'unknown',
  'unreachable',
])
export function describeKidsJourneyRolloutFailure(error) {
  return {
    kind: 'kids-journey-rollout-failure',
    ...(rolloutFailures.get(error) ?? {
      step: 'unclassified',
      reason: 'operation-failed',
    }),
  }
}

function rolloutFailure(error, detail) {
  // A transport may reject with a primitive. Do not stringify it or lose the local phase.
  const failure =
    error && (typeof error === 'object' || typeof error === 'function')
      ? error
      : new Error('Operação Railway falhou')
  rolloutFailures.set(failure, detail)
  return failure
}

function failureDetails(error, reason = 'operation-failed') {
  return (
    apiFailures.get(error) ?? {
      reason: probeFailureReasons.get(error) ?? reason,
      ...(probeFailureSignals.has(error) ? { signals: probeFailureSignals.get(error) } : {}),
    }
  )
}

/** The returned value is the only barrier that authorizes the caller to deploy apps. */
export async function runKidsJourneyRollout(input, ports) {
  const { sha, mode } = input
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !['deploy', 'verify', 'preflight'].includes(mode))
    throw new Error('Onda staging inválida')
  const deadline = ports.now() + STAGING_ROLLOUT_TIMEOUT_MS
  const checkTime = () => {
    if (ports.now() >= deadline)
      throw new Error('Onda Kids excedeu o limite; retome explicitamente')
  }
  const bounded = async (operation) => {
    checkTime()
    const result = await operation()
    checkTime()
    return result
  }
  ports.log({ stage: 'preflight' })
  await bounded(() => ports.preflight(deadline))
  if (mode === 'preflight') return { status: 'preflight' }
  if (mode === 'verify') {
    const state = await bounded(() => ports.remote('verify', 'active', {}, deadline))
    if (state.status !== 'published' || !Number.isSafeInteger(state.version) || state.version < 1)
      throw new Error('Jornada ainda não publicada')
    return state
  }
  ports.log({ stage: 'members-deploy', sha })
  const members = await bounded(() => ports.deploy('members', deadline))
  await bounded(() => ports.waitRetired('members', members, deadline))
  ports.log({ stage: 'members-migrate-initialize', deployment: members })
  await bounded(() => ports.remote('migrate', members, {}, deadline))
  const initial = await bounded(() => ports.remote('initialize', members, {}, deadline))
  if (!['initializing', 'already-published'].includes(initial.status))
    throw new Error('Inicialização inválida')
  ports.log({ stage: 'auth-deploy-and-retire', sha })
  const auth = await bounded(() => ports.deploy('auth', deadline))
  await bounded(() => ports.waitRetired('auth', auth, deadline))
  if (initial.status === 'already-published') {
    if (!Number.isSafeInteger(initial.version) || initial.version < 1)
      throw new Error('Versão inválida')
    const confirmed = await bounded(() => ports.remote('verify', members, {}, deadline))
    if (
      confirmed.status !== 'published' ||
      !Number.isSafeInteger(confirmed.version) ||
      confirmed.version < 1
    )
      throw new Error('Publicação canônica ainda não confirmada')
    return confirmed
  }
  const preparationId = initial.preparationId
  if (initial.version !== 0 || !uuidPattern.test(preparationId ?? ''))
    throw new Error('Identificador de preparação inválido')
  let ready = false
  ports.log({ stage: 'canonical-capture', preparationId })
  let progress
  for (let index = 0; index < (input.maxAdvances ?? 10000); index++) {
    checkTime()
    await bounded(() => ports.waitRetired('auth', auth, deadline))
    const next = await bounded(() => ports.remote('advance', members, { preparationId }, deadline))
    if (next.preparationId !== preparationId)
      throw new Error('Identificador de preparação divergente')
    if (
      !['advanced', 'ready', 'published'].includes(next.status) ||
      !['capturing', 'preparing', 'ready', 'published'].includes(next.phase)
    )
      throw new Error('Preparação interrompida; não publicar')
    ports.log({ preparationId, phase: next.phase, processed: next.processed })
    if (next.phase === 'ready' || next.phase === 'published') {
      ready = true
      break
    }
    if (!/^[a-f0-9]{64}$/.test(next.progress ?? '') || next.progress === progress)
      throw new Error('Preparação sem progresso canônico; retome explicitamente')
    progress = next.progress
  }
  if (!ready) throw new Error('Preparação excedeu o limite; retome o mesmo identificador')
  checkTime()
  await bounded(() => ports.waitRetired('auth', auth, deadline))
  ports.log({ stage: 'publish', preparationId })
  await bounded(() => ports.remote('publish', members, { preparationId }, deadline))
  const confirmed = await bounded(() => ports.remote('initialize', members, {}, deadline))
  if (
    confirmed.status !== 'already-published' ||
    !Number.isSafeInteger(confirmed.version) ||
    confirmed.version < 1
  )
    throw new Error('Publicação canônica ainda não confirmada')
  await bounded(() => ports.waitRetired('auth', auth, deadline))
  return { status: 'published', version: confirmed.version }
}

/** Config apply can itself start deployments. Do not let it bypass the backend wave. */
export function validateBackendRolloutPlan(plan) {
  if (
    plan.kind !== 'railway.config.plan' ||
    plan.environmentId !== stagingJourney.environment ||
    !Array.isArray(plan.changeSet?.changes)
  )
    throw new Error('Plano de staging inválido')
  if (
    plan.changeSet.changes.some(
      (change) =>
        [
          'service.auth',
          'service.members',
          'service.admin',
          'service.community',
          'service.community-kids',
        ].includes(change.address) && ['build', 'deploy', 'source'].includes(change.field),
    )
  )
    throw new Error(
      'Mudança IaC Auth/Members/apps exige onda operacional própria; apply não pode antecipar bootstrap',
    )
}

/** Uses the actual OpenSSH transport selected by Railway5.62.1. Never disables host verification. */
export function prepareSsh(env) {
  if (!env.RAILWAY_SSH_PRIVATE_KEY || !env.RAILWAY_SSH_KNOWN_HOSTS || !env.RAILWAY_TOKEN)
    throw new Error(
      'Configure credencial API, identidade SSH cadastrada e known_hosts confiável antes do deploy',
    )
  if (
    !env.RAILWAY_SSH_KNOWN_HOSTS.split(/\r?\n/).some((line) =>
      /^ssh\.railway\.com (ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa) [A-Za-z0-9+/=]+$/.test(line),
    )
  )
    throw new Error('Hostkey Railway confiável ausente')
  const dir = mkdtempSync(join(tmpdir(), 'sz-kids-rollout-'))
  const sshDir = join(homedir(), '.ssh'),
    config = join(sshDir, 'config')
  const previous = existsSync(config)
    ? { bytes: readFileSync(config), mode: statSync(config).mode & 0o777 }
    : null
  const dispose = () => {
    try {
      if (previous) {
        writeFileSync(config, previous.bytes)
        chmodSync(config, previous.mode)
      } else rmSync(config, { force: true })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  try {
    mkdirSync(sshDir, { recursive: true, mode: 0o700 })
    // The staging secret lacks the terminal newline. OpenSSH rejects that otherwise valid
    // private key before it can authenticate.
    const privateKey = env.RAILWAY_SSH_PRIVATE_KEY.endsWith('\n')
      ? env.RAILWAY_SSH_PRIVATE_KEY
      : `${env.RAILWAY_SSH_PRIVATE_KEY}\n`
    writeFileSync(join(dir, 'identity'), privateKey, { mode: 0o600 })
    writeFileSync(join(dir, 'known_hosts'), env.RAILWAY_SSH_KNOWN_HOSTS, { mode: 0o600 })
    const quoted = join(dir, 'known_hosts').replaceAll('\\', '/').replaceAll('"', '\\"')
    writeFileSync(
      config,
      `Host ssh.railway.com\n  BatchMode yes\n  StrictHostKeyChecking yes\n  IdentitiesOnly yes\n  IdentityAgent none\n  UserKnownHostsFile "${quoted}"\n\n${previous?.bytes.toString() ?? ''}`,
      { mode: 0o600 },
    )
    chmodSync(config, 0o600)
    return { identity: join(dir, 'identity'), dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

export function createRailwayPorts(sha, env, identity, options = {}) {
  const targetName = options.target === undefined ? 'staging' : options.target
  const backendTarget = resolveKidsJourneyTarget(targetName)
  if (
    options.applications !== undefined &&
    (options.applications !== true || targetName !== 'production')
  )
    throw new Error('Aplicações exigem destino explícito de produção')
  const applications = options.applications ? productionApplicationIds(env) : null
  const target = applications ? { ...backendTarget, ...applications } : backendTarget
  const serviceKnown = (service) =>
    ['members', 'auth'].includes(service) || (applications && Object.hasOwn(applications, service))
  if (
    targetName === 'production' &&
    (env.RAILWAY_PROJECT_ID !== target.project ||
      env.RAILWAY_ENVIRONMENT_ID !== target.environment ||
      env.STAGING_ENV_ID !== undefined)
  )
    throw new Error('Contexto explícito de produção divergente')
  if (
    targetName === 'staging' &&
    ((env.RAILWAY_PROJECT_ID !== undefined && env.RAILWAY_PROJECT_ID !== target.project) ||
      (env.RAILWAY_ENVIRONMENT_ID !== undefined &&
        env.RAILWAY_ENVIRONMENT_ID !== target.environment))
  )
    throw new Error('Contexto de staging divergente; produção exige target explícito')
  const exec = options.exec ?? execFileSync,
    doFetch = options.fetch ?? fetch
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const now = options.now ?? (() => performance.now())
  const checkTime = (deadline) => {
    if (now() >= deadline) throw new Error('Onda Kids excedeu o limite; retome explicitamente')
  }
  const log = options.log ?? ((value) => console.log(JSON.stringify(value)))
  const before = new Map()
  const initialApplications = new Set()
  const adoptions = new Map()
  if (options.adoptDeployments !== undefined) {
    if (
      !options.adoptDeployments ||
      typeof options.adoptDeployments !== 'object' ||
      Array.isArray(options.adoptDeployments)
    )
      throw new Error('Adoção de deployment inválida')
    for (const [service, candidate] of Object.entries(options.adoptDeployments)) {
      if (
        !['members', 'auth'].includes(service) ||
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate) ||
        Object.keys(candidate).some(
          (key) => !['id', 'commitSha', 'imageDigest', 'previousIds'].includes(key),
        ) ||
        typeof candidate.id !== 'string' ||
        !uuidPattern.test(candidate.id) ||
        candidate.commitSha !== sha ||
        !/^[a-f0-9]{40}$/.test(candidate.commitSha ?? '') ||
        typeof candidate.imageDigest !== 'string' ||
        !/^sha256:[a-f0-9]{64}$/.test(candidate.imageDigest) ||
        !Array.isArray(candidate.previousIds) ||
        candidate.previousIds.length < 1 ||
        candidate.previousIds.length > 100 ||
        candidate.previousIds.some(
          (id) => typeof id !== 'string' || !uuidPattern.test(id) || id === candidate.id,
        ) ||
        new Set(candidate.previousIds).size !== candidate.previousIds.length
      )
        throw new Error('Adoção de deployment inválida')
      adoptions.set(service, { ...candidate, previousIds: [...candidate.previousIds] })
    }
  }
  const cliEnv = { ...env, RAILWAY_API_TOKEN: env.RAILWAY_TOKEN }
  delete cliEnv.RAILWAY_TOKEN
  delete cliEnv.RAILWAY_SSH_PRIVATE_KEY
  delete cliEnv.RAILWAY_SSH_KNOWN_HOSTS
  const cli = (args) =>
    exec('railway', args, {
      env: cliEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90000,
      maxBuffer: 262144,
    })
  const apiFailure = (reason, status) => {
    const error = new Error('Railway GraphQL recusou a operação')
    apiFailures.set(error, {
      reason,
      ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}),
    })
    return error
  }
  const gql = async (query, variables, deadline) => {
    // Only read-side polling has retries. The mutation path below stays single-attempt.
    if (Number.isFinite(deadline) && /^query\b/.test(query)) {
      try {
        return await railwayReadQuery(query, variables, {
          token: env.RAILWAY_TOKEN,
          deadline,
          fetch: doFetch,
          now,
          sleep,
          log,
        })
      } catch (error) {
        throw apiFailure(error.code ?? 'api-operation-rejected', error.httpStatus)
      }
    }
    const signal = AbortSignal.timeout(15000)
    let response
    try {
      response = await doFetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RAILWAY_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal,
      })
    } catch {
      throw apiFailure(signal.aborted ? 'api-timeout' : 'api-network-failed')
    }
    if (!response.ok) {
      const status = response.status
      const reason =
        status === 401 || status === 403
          ? 'api-authorization-rejected'
          : status === 408 || status === 504
            ? 'api-timeout'
            : status === 429
              ? 'api-rate-limited'
              : status >= 500 && status <= 599
                ? 'api-provider-unavailable'
                : 'api-http-rejected'
      throw apiFailure(reason, status)
    }
    let result
    try {
      result = await response.json()
    } catch {
      throw apiFailure(signal.aborted ? 'api-timeout' : 'api-response-invalid', response.status)
    }
    if (!result || typeof result !== 'object' || Array.isArray(result))
      throw apiFailure('api-response-invalid', response.status)
    if (result.errors) {
      // Exact known messages only. In particular, an unknown error is not evidence of a pause.
      const messages = Array.isArray(result.errors) ? result.errors.map((e) => e?.message) : []
      const reason = messages.includes('Not Authorized')
        ? 'api-authorization-rejected'
        : messages.includes('Commit not found')
          ? 'api-commit-not-found'
          : 'api-operation-rejected'
      throw apiFailure(reason, response.status)
    }
    if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data))
      throw apiFailure('api-response-invalid', response.status)
    return result.data
  }
  const active = async (service, deadline) => {
    const data = await gql(
      'query($s:String!,$e:String!){serviceInstance(serviceId:$s,environmentId:$e){activeDeployments{id status meta}}}',
      { s: target[service], e: target.environment },
      deadline,
    )
    const rows = data.serviceInstance?.activeDeployments
    if (!Array.isArray(rows)) throw new Error('Inventário de deployments inválido')
    return rows
  }
  const deployment = async (id, deadline) =>
    (
      await gql(
        'query($id:String!){deployment(id:$id){id projectId environmentId serviceId status meta}}',
        { id },
        deadline,
      )
    ).deployment
  const matchesContext = (current, service, id) =>
    current?.id === id &&
    current.projectId === target.project &&
    current.environmentId === target.environment &&
    current.serviceId === target[service]
  const requireNoPending = async (service, deadline) => {
    checkTime(deadline)
    const data = await gql(
      'query($input:DeploymentListInput!){deployments(input:$input,first:1){edges{node{id status}} pageInfo{hasNextPage endCursor}}}',
      {
        input: {
          projectId: target.project,
          environmentId: target.environment,
          serviceId: target[service],
          status: { notIn: ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'] },
        },
      },
      deadline,
    )
    checkTime(deadline)
    if (
      !Array.isArray(data.deployments?.edges) ||
      data.deployments.edges.length !== 0 ||
      data.deployments.pageInfo?.hasNextPage !== false
    )
      throw new Error('Outro deployment pendente impede a adoção')
  }
  const single = async (service) => {
    const rows = await active(service)
    if (
      rows.length !== 1 ||
      rows[0].status !== 'SUCCESS' ||
      !uuidPattern.test(rows[0].id) ||
      !/^[a-f0-9]{40}$/.test(rows[0].meta?.commitHash ?? '')
    )
      throw new Error(`Deployment ${service} ativo não é único/saudável/versionado`)
    if (targetName === 'production') {
      const current = await deployment(rows[0].id)
      if (
        !matchesContext(current, service, rows[0].id) ||
        current.status !== 'SUCCESS' ||
        current.meta?.commitHash !== rows[0].meta.commitHash
      )
        throw new Error('Identidade do deployment de produção divergente')
    }
    return rows[0]
  }
  const ssh = (service, args) =>
    cli([
      'ssh',
      '-p',
      target.project,
      '-e',
      target.environment,
      '-s',
      target[service],
      '-i',
      identity,
      '--',
      ...args,
    ])
  const probe = (service, current, requireAdmission = false) => {
    const nonce = randomBytes(16).toString('hex')
    const required = !requireAdmission
      ? []
      : service === 'members'
        ? [
            'DATABASE_URL',
            'AUTH_BASE_URL',
            'AUTH_INTERNAL_TOKEN',
            'MEMBERS_PROFILE_ADMISSION_TOKEN',
          ]
        : [
            'DATABASE_URL',
            'MEMBERS_BASE_URL',
            'MEMBERS_INTERNAL_TOKEN',
            'MEMBERS_PROFILE_ADMISSION_TOKEN',
          ]
    // Readonly and available in the OLD artifact; skipDeploys secrets need not exist there yet.
    // Report only check outcomes. A failed remote assertion would otherwise look exactly like
    // a rejected SSH connection, while printing environment values could expose credentials.
    const projectCheck =
      targetName === 'production'
        ? `project:e.RAILWAY_PROJECT_ID===${JSON.stringify(target.project)},`
        : ''
    const code = `const e=process.env;console.log(JSON.stringify({nonce:${JSON.stringify(nonce)},bun:Bun.version,checks:{${projectCheck}environment:e.RAILWAY_ENVIRONMENT_ID===${JSON.stringify(target.environment)},service:e.RAILWAY_SERVICE_ID===${JSON.stringify(target[service])},deployment:e.RAILWAY_DEPLOYMENT_ID===${JSON.stringify(current.id)},commit:e.RAILWAY_GIT_COMMIT_SHA===${JSON.stringify(current.meta.commitHash)},required:${JSON.stringify(required)}.every(k=>!!e[k])}}))`
    let output
    try {
      output = ssh(service, ['bun', '-e', code])
    } catch (error) {
      const diagnostic = `${String(error?.stderr ?? '')}\n${String(error?.stdout ?? '')}`
      const reason = /Permission denied \(publickey\)/i.test(diagnostic)
        ? 'ssh-identity-rejected'
        : /Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED/i.test(diagnostic)
          ? 'ssh-host-key-rejected'
          : /No target found|deployment not found/i.test(diagnostic)
            ? 'ssh-target-unavailable'
            : /not authorized|unauthorized|invalid token|token expired|authentication failed/i.test(
                  diagnostic,
                )
              ? 'ssh-auth-rejected'
              : /no ssh keys found|ssh key.*not registered/i.test(diagnostic)
                ? 'ssh-key-unavailable'
                : /timed out|connection refused|could not connect/i.test(diagnostic)
                  ? 'ssh-connection-failed'
                  : 'ssh-command-failed'
      const failure = new Error('Preflight SSH não executou no artefato esperado')
      probeFailureReasons.set(failure, reason)
      if (reason === 'ssh-command-failed') {
        const signals = [
          ...new Set(
            (diagnostic.toLowerCase().match(/[a-z_]+/g) ?? []).filter((word) =>
              safeSshSignals.has(word),
            ),
          ),
        ].sort()
        if (signals.length) probeFailureSignals.set(failure, signals)
      }
      throw failure
    }
    let reply
    try {
      reply = JSON.parse(output.trim())
    } catch {
      const failure = new Error('Preflight SSH não executou no artefato esperado')
      probeFailureReasons.set(failure, 'ssh-response-invalid')
      throw failure
    }
    if (
      reply?.nonce !== nonce ||
      typeof reply.bun !== 'string' ||
      !/^\d+\.\d+\.\d+/.test(reply.bun)
    ) {
      const failure = new Error('Preflight SSH não executou no artefato esperado')
      probeFailureReasons.set(failure, 'ssh-response-invalid')
      throw failure
    }
    const checks = ['environment', 'service', 'deployment', 'commit', 'required']
    if (targetName === 'production') checks.unshift('project')
    for (const check of checks) {
      if (reply.checks?.[check] === true) continue
      const failure = new Error('Preflight SSH encontrou identidade ou configuração divergente')
      probeFailureReasons.set(failure, `${check}-check-failed`)
      throw failure
    }
  }
  return {
    now,
    log,
    async requireNativeDisabled(services, deadline = Number.POSITIVE_INFINITY) {
      if (
        !applications ||
        !Array.isArray(services) ||
        services.some((service) => !Object.hasOwn(applications, service))
      )
        throw new Error('Inventário de triggers de produção inválido')
      for (const service of services) {
        checkTime(deadline)
        const data = await gql(
          'query($p:String!,$e:String!,$s:String!){serviceInstanceAutoDeployStatus(projectId:$p,environmentId:$e,serviceId:$s){enabled}}',
          { p: target.project, e: target.environment, s: target[service] },
        )
        checkTime(deadline)
        if (data.serviceInstanceAutoDeployStatus?.enabled !== false)
          throw new Error('Trigger nativo ativo ou desconhecido; nenhuma nova mutação permitida')
      }
    },
    async preflightApplications(services, deadline = Number.POSITIVE_INFINITY, initial = []) {
      if (
        !applications ||
        !Array.isArray(services) ||
        services.some((service) => !Object.hasOwn(applications, service))
      )
        throw new Error('Seleção de aplicações de produção inválida')
      if (
        !Array.isArray(initial) ||
        initial.length > 1 ||
        initial.some(
          (service) =>
            targetName !== 'production' ||
            service !== 'live-recorder' ||
            target[service] !== initialProductionApplicationIds[service] ||
            !services.includes(service),
        )
      )
        throw new Error('Primeira implantação permite somente o gravador de produção')
      for (const service of services) {
        checkTime(deadline)
        if (initial.includes(service)) {
          const rows = await active(service)
          if (rows.length !== 0)
            throw new Error('Gravador já tem deployment ativo; inicialização recusada')
          await requireNoPending(service, deadline)
          initialApplications.add(service)
          before.set(service, [])
          log({ stage: 'initial-application-preflight', service })
          continue
        }
        const current = await single(service)
        checkTime(deadline)
        await requireNoPending(service, deadline)
        before.set(service, [current.id])
      }
    },
    async preflight(deadline = Number.POSITIVE_INFINITY) {
      let step = 'cli-version'
      try {
        checkTime(deadline)
        if (cli(['--version']).trim() !== 'railway 5.62.1')
          throw new Error('CLI Railway deve ser5.62.1')
        step = 'openssh-version'
        exec('ssh', ['-V'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 })
        for (const service of ['members', 'auth']) {
          checkTime(deadline)
          step = `${service}-inventory`
          const current = await single(service)
          checkTime(deadline)
          before.set(service, [current.id])
          step = `${service}-probe`
          probe(service, current)
          checkTime(deadline)
        }
      } catch (error) {
        throw rolloutFailure(error, { step, ...failureDetails(error) })
      }
    },
    async deploy(service, deadline = Number.POSITIVE_INFINITY) {
      const label = serviceKnown(service) ? service : 'unknown-service'
      let step = `${label}-active-refresh`
      let mutationOutcome = 'not-attempted'
      try {
        if (!serviceKnown(service)) throw new Error('Serviço fora do registry da onda')
        checkTime(deadline)
        const adoption = adoptions.get(service)
        if (adoption) {
          step = `${label}-adoption-deployment`
          log({ stage: step, deployment: adoption.id, mutationOutcome })
          const current = await deployment(adoption.id)
          checkTime(deadline)
          if (
            !matchesContext(current, service, adoption.id) ||
            current.status !== 'SUCCESS' ||
            current.meta?.commitHash !== sha ||
            current.meta?.imageDigest !== adoption.imageDigest
          )
            throw new Error('Deployment existente não corresponde à adoção')
          step = `${label}-adoption-active`
          const rows = await active(service)
          checkTime(deadline)
          if (
            rows.length !== 1 ||
            rows[0].id !== adoption.id ||
            rows[0].status !== 'SUCCESS' ||
            rows[0].meta?.commitHash !== sha ||
            rows[0].meta?.imageDigest !== adoption.imageDigest
          )
            throw new Error('Deployment adotado não é o único ativo esperado')
          step = `${label}-adoption-pending`
          await requireNoPending(service, deadline)
          step = `${label}-adoption-predecessors`
          const old = await Promise.all(adoption.previousIds.map((oldId) => deployment(oldId)))
          checkTime(deadline)
          if (
            old.some(
              (item, index) =>
                !matchesContext(item, service, adoption.previousIds[index]) ||
                item.status !== 'REMOVED',
            )
          )
            throw new Error('Predecessores da adoção ainda não retirados')
          before.set(service, [
            ...new Set([...(before.get(service) ?? []), ...adoption.previousIds]),
          ])
          log({
            stage: `${label}-deployment-adopted`,
            deployment: adoption.id,
            adopted: true,
            mutationOutcome,
          })
          return adoption.id
        }
        log({ stage: step })
        // Refresh immediately before the mutation; preflight may precede a long Members wave.
        if (targetName === 'production' && !before.has(service))
          throw new Error('Preflight do serviço de produção ausente')
        const currentActive = await active(service)
        if (initialApplications.has(service) && currentActive.length !== 0)
          throw new Error('Deployment concorrente impede inicialização do gravador')
        before.set(service, [
          ...new Set([...(before.get(service) ?? []), ...currentActive.map((item) => item.id)]),
        ])
        checkTime(deadline)
        if (targetName === 'production') await requireNoPending(service, deadline)
        if (options.beforeDeploy) await options.beforeDeploy(service, deadline)
        checkTime(deadline)
        step = `${label}-deploy-mutation`
        mutationOutcome = 'unknown'
        log({ stage: step, mutationOutcome })
        const data = await gql(
          'mutation($s:String!,$e:String!,$c:String){serviceInstanceDeployV2(serviceId:$s,environmentId:$e,commitSha:$c)}',
          { s: target[service], e: target.environment, c: sha },
        )
        step = `${label}-deploy-ack`
        const id = data.serviceInstanceDeployV2
        if (typeof id !== 'string' || !uuidPattern.test(id))
          throw new Error('Deployment não confirmado')
        log({ stage: step, deployment: id, mutationOutcome: 'acknowledged' })
        return id
      } catch (error) {
        throw rolloutFailure(error, {
          step,
          ...failureDetails(error, step === `${label}-deploy-ack` ? 'invalid-ack' : undefined),
          // A failed request/invalid ACK cannot prove that no deployment was created.
          mutationOutcome,
        })
      }
    },
    async waitRetired(service, id, rolloutDeadline = Number.POSITIVE_INFINITY) {
      const label = serviceKnown(service) ? service : 'unknown-service'
      let step = `${label}-first-poll`
      let reason = 'operation-failed'
      let deploymentStatus
      const deadline = Math.min(rolloutDeadline, now() + STAGING_DEPLOYMENT_TIMEOUT_MS)
      const checkRetirementTime = () => {
        if (now() < deadline) return
        reason = 'retirement-timeout'
        throw new Error(`Antigos deployments ${service} ainda não retirados; não capturar coorte`)
      }
      try {
        if (!serviceKnown(service)) throw new Error('Serviço fora do registry da onda')
        log({
          stage: step,
          ...(typeof id === 'string' && uuidPattern.test(id) ? { deployment: id } : {}),
        })
        for (let index = 0; ; index++) {
          checkRetirementTime()
          step = `${label}-${index === 0 ? 'first-poll' : 'deployment-poll'}`
          const current = await deployment(id, deadline)
          checkRetirementTime()
          if (targetName === 'production' && !matchesContext(current, service, id))
            throw new Error('Identidade do deployment de produção divergente')
          if (
            ['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED', 'CANCELED', 'CANCELLED'].includes(
              current?.status,
            )
          ) {
            reason = 'deployment-failed'
            deploymentStatus = current.status
            throw new Error(`Deployment ${service} falhou`)
          }
          if (current?.status === 'SUCCESS') {
            if (current.meta?.commitHash !== sha) {
              reason = 'commit-mismatch'
              throw new Error('SHA remoto divergente')
            }
            step = `${label}-retirement-inventory`
            const rows = await active(service, deadline)
            checkRetirementTime()
            before.set(service, [
              ...new Set([
                ...(before.get(service) ?? []),
                ...rows.filter((item) => item.id !== id).map((item) => item.id),
              ]),
            ])
            step = `${label}-retirement-poll`
            const oldIds = (before.get(service) ?? []).filter((oldId) => oldId !== id)
            const old = await Promise.all(oldIds.map((oldId) => deployment(oldId, deadline)))
            checkRetirementTime()
            if (
              targetName === 'production' &&
              old.some((item, oldIndex) => !matchesContext(item, service, oldIds[oldIndex]))
            )
              throw new Error('Identidade do predecessor de produção divergente')
            if (
              rows.length === 1 &&
              rows[0].id === id &&
              (targetName !== 'production' ||
                (rows[0].status === 'SUCCESS' && rows[0].meta?.commitHash === sha)) &&
              old.every((item) => item?.status === 'REMOVED')
            ) {
              if (adoptions.has(service) || targetName === 'production') {
                await requireNoPending(service, deadline)
                checkRetirementTime()
              }
              step = `${label}-admission-probe`
              if (['members', 'auth'].includes(service)) probe(service, current, true)
              checkRetirementTime()
              return
            }
          }
          await sleep(Math.min(STAGING_DEPLOYMENT_POLL_MS, deadline - now()))
        }
      } catch (error) {
        let failure = error
        if (apiFailures.get(error)?.reason === 'read-deadline') {
          reason = 'retirement-timeout'
          failure = new Error(
            `Antigos deployments ${service} ainda não retirados; não capturar coorte`,
          )
        }
        throw rolloutFailure(failure, {
          step,
          ...failureDetails(failure, reason),
          mutationOutcome: 'acknowledged',
          ...(typeof id === 'string' && uuidPattern.test(id) ? { deployment: id } : {}),
          ...(deploymentStatus ? { deploymentStatus } : {}),
        })
      }
    },
    async remote(action, id, input = {}, deadline = Number.POSITIVE_INFINITY) {
      checkTime(deadline)
      const current = await single('members')
      checkTime(deadline)
      if (id !== 'active' && (current.id !== id || current.meta.commitHash !== sha))
        throw new Error('Members mudou durante bootstrap')
      const nonce = randomBytes(16).toString('hex')
      const args = [
        'bun',
        'scripts/release/kids-journey-bootstrap.mjs',
        ...(targetName === 'production' ? ['--target', 'production'] : []),
        action,
        current.meta.commitHash,
        current.id,
        nonce,
      ]
      if (input.preparationId) {
        if (!uuidPattern.test(input.preparationId)) throw new Error('Preparação inválida')
        args.push(input.preparationId)
      }
      const reply = JSON.parse(ssh('members', args).trim())
      checkTime(deadline)
      if (reply.kind !== 'kids-journey-rollout' || reply.nonce !== nonce)
        throw new Error('ACK bootstrap remoto inválido')
      if (
        targetName === 'production' &&
        (reply.target !== 'production' ||
          reply.project !== target.project ||
          reply.environment !== target.environment)
      )
        throw new Error('ACK bootstrap de produção divergente')
      const {
        kind: _,
        nonce: __,
        target: ___,
        project: ____,
        environment: _____,
        ...result
      } = reply
      return result
    },
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let ssh
  try {
    const [mode, sha] = process.argv.slice(2)
    if (
      process.argv.length !== 4 ||
      process.env.STAGING_ENV_ID !== stagingJourney.environment ||
      process.env.RAILWAY_PROJECT_ID !== stagingJourney.project
    )
      throw new Error('Somente staging explícito é permitido')
    if (mode === 'check-plan') {
      validateBackendRolloutPlan(JSON.parse(readFileSync(sha, 'utf8')))
      console.log('Plano IaC não antecipa a onda Auth/Members.')
    } else {
      ssh = prepareSsh(process.env)
      const result = await runKidsJourneyRollout(
        { mode, sha },
        createRailwayPorts(sha, process.env, ssh.identity),
      )
      console.log(JSON.stringify({ kind: 'kids-journey-release-barrier', ...result }))
    }
  } catch (error) {
    console.error(JSON.stringify(describeKidsJourneyRolloutFailure(error)))
    console.error(
      'Onda canônica Kids falhou. Apps não foram liberados por esta barreira; retome explicitamente o rollout.',
    )
    process.exitCode = 1
  } finally {
    ssh?.dispose()
  }
}
