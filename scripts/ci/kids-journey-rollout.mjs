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

// Diagnostics are generated locally. Never serialize an exception, command, API body or token.
const preflightFailures = new WeakMap()
const apiAuthorizationFailures = new WeakSet()
export function describeKidsJourneyRolloutFailure(error) {
  return {
    kind: 'kids-journey-rollout-failure',
    ...(preflightFailures.get(error) ?? {
      step: 'unclassified',
      reason: 'operation-failed',
    }),
  }
}

/** The returned value is the only barrier that authorizes the caller to deploy apps. */
export async function runKidsJourneyRollout(input, ports) {
  const { sha, mode } = input
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !['deploy', 'verify', 'preflight'].includes(mode))
    throw new Error('Onda staging inválida')
  const deadline = ports.now() + 30 * 60 * 1000
  const checkTime = () => {
    if (ports.now() >= deadline)
      throw new Error('Onda Kids excedeu o limite; retome explicitamente')
  }
  ports.log({ stage: 'preflight' })
  await ports.preflight()
  checkTime()
  if (mode === 'preflight') return { status: 'preflight' }
  if (mode === 'verify') {
    const state = await ports.remote('verify', 'active')
    if (state.status !== 'published' || !Number.isSafeInteger(state.version) || state.version < 1)
      throw new Error('Jornada ainda não publicada')
    return state
  }
  ports.log({ stage: 'members-deploy', sha })
  const members = await ports.deploy('members')
  await ports.waitRetired('members', members)
  checkTime()
  ports.log({ stage: 'members-migrate-initialize', deployment: members })
  await ports.remote('migrate', members)
  const initial = await ports.remote('initialize', members)
  if (!['initializing', 'already-published'].includes(initial.status))
    throw new Error('Inicialização inválida')
  ports.log({ stage: 'auth-deploy-and-retire', sha })
  const auth = await ports.deploy('auth')
  await ports.waitRetired('auth', auth)
  checkTime()
  if (initial.status === 'already-published') {
    if (!Number.isSafeInteger(initial.version) || initial.version < 1)
      throw new Error('Versão inválida')
    const confirmed = await ports.remote('verify', members)
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
    await ports.waitRetired('auth', auth)
    const next = await ports.remote('advance', members, { preparationId })
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
  await ports.waitRetired('auth', auth)
  ports.log({ stage: 'publish', preparationId })
  await ports.remote('publish', members, { preparationId })
  const confirmed = await ports.remote('initialize', members)
  if (
    confirmed.status !== 'already-published' ||
    !Number.isSafeInteger(confirmed.version) ||
    confirmed.version < 1
  )
    throw new Error('Publicação canônica ainda não confirmada')
  await ports.waitRetired('auth', auth)
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
    writeFileSync(join(dir, 'identity'), env.RAILWAY_SSH_PRIVATE_KEY, { mode: 0o600 })
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
  const exec = options.exec ?? execFileSync,
    doFetch = options.fetch ?? fetch
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const before = new Map()
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
  const gql = async (query, variables) => {
    const response = await doFetch('https://backboard.railway.com/graphql/v2', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RAILWAY_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 401 || response.status === 403) {
      const error = new Error('Railway GraphQL negou a credencial')
      apiAuthorizationFailures.add(error)
      throw error
    }
    if (!response.ok) throw new Error('Railway GraphQL indisponível')
    const result = await response.json()
    if (
      Array.isArray(result.errors) &&
      result.errors.some((error) => error?.message === 'Not Authorized')
    ) {
      const error = new Error('Railway GraphQL negou a credencial')
      apiAuthorizationFailures.add(error)
      throw error
    }
    if (result.errors || !result.data) throw new Error('Railway GraphQL recusou a operação')
    return result.data
  }
  const active = async (service) => {
    const data = await gql(
      'query($s:String!,$e:String!){serviceInstance(serviceId:$s,environmentId:$e){activeDeployments{id status meta}}}',
      { s: stagingJourney[service], e: stagingJourney.environment },
    )
    const rows = data.serviceInstance?.activeDeployments
    if (!Array.isArray(rows)) throw new Error('Inventário de deployments inválido')
    return rows
  }
  const deployment = async (id) =>
    (await gql('query($id:String!){deployment(id:$id){id status meta}}', { id })).deployment
  const single = async (service) => {
    const rows = await active(service)
    if (
      rows.length !== 1 ||
      rows[0].status !== 'SUCCESS' ||
      !uuidPattern.test(rows[0].id) ||
      !/^[a-f0-9]{40}$/.test(rows[0].meta?.commitHash ?? '')
    )
      throw new Error(`Deployment ${service} ativo não é único/saudável/versionado`)
    return rows[0]
  }
  const ssh = (service, args) =>
    cli([
      'ssh',
      '-p',
      stagingJourney.project,
      '-e',
      stagingJourney.environment,
      '-s',
      stagingJourney[service],
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
    const code = `const e=process.env;if(e.RAILWAY_ENVIRONMENT_ID!==${JSON.stringify(stagingJourney.environment)}||e.RAILWAY_SERVICE_ID!==${JSON.stringify(stagingJourney[service])}||e.RAILWAY_DEPLOYMENT_ID!==${JSON.stringify(current.id)}||e.RAILWAY_GIT_COMMIT_SHA!==${JSON.stringify(current.meta.commitHash)}||${JSON.stringify(required)}.some(k=>!e[k]))process.exit(1);console.log(JSON.stringify({nonce:${JSON.stringify(nonce)},bun:Bun.version}))`
    const reply = JSON.parse(ssh(service, ['bun', '-e', code]).trim())
    if (reply.nonce !== nonce || typeof reply.bun !== 'string' || !/^\d+\.\d+\.\d+/.test(reply.bun))
      throw new Error('Preflight SSH não executou no artefato esperado')
  }
  return {
    now: () => Date.now(),
    log: (value) => console.log(JSON.stringify(value)),
    async preflight() {
      let step = 'cli-version'
      try {
        if (cli(['--version']).trim() !== 'railway 5.62.1')
          throw new Error('CLI Railway deve ser5.62.1')
        step = 'openssh-version'
        exec('ssh', ['-V'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 })
        for (const service of ['members', 'auth']) {
          step = `${service}-inventory`
          const current = await single(service)
          before.set(service, [current.id])
          step = `${service}-probe`
          probe(service, current)
        }
      } catch (error) {
        if (error && (typeof error === 'object' || typeof error === 'function'))
          preflightFailures.set(error, {
            step,
            reason: apiAuthorizationFailures.has(error)
              ? 'api-authorization-rejected'
              : 'operation-failed',
          })
        throw error
      }
    },
    async deploy(service) {
      // Refresh immediately before the mutation; preflight may precede a long Members wave.
      before.set(service, [
        ...new Set([
          ...(before.get(service) ?? []),
          ...(await active(service)).map((item) => item.id),
        ]),
      ])
      const data = await gql(
        'mutation($s:String!,$e:String!,$c:String){serviceInstanceDeployV2(serviceId:$s,environmentId:$e,commitSha:$c)}',
        { s: stagingJourney[service], e: stagingJourney.environment, c: sha },
      )
      if (!uuidPattern.test(data.serviceInstanceDeployV2 ?? ''))
        throw new Error('Deployment não confirmado')
      return data.serviceInstanceDeployV2
    },
    async waitRetired(service, id) {
      for (let index = 0; index < 60; index++) {
        const current = await deployment(id)
        if (
          ['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED', 'CANCELED', 'CANCELLED'].includes(
            current?.status,
          )
        )
          throw new Error(`Deployment ${service} falhou`)
        if (current?.status === 'SUCCESS') {
          if (current.meta?.commitHash !== sha) throw new Error('SHA remoto divergente')
          const rows = await active(service)
          before.set(service, [
            ...new Set([
              ...(before.get(service) ?? []),
              ...rows.filter((item) => item.id !== id).map((item) => item.id),
            ]),
          ])
          const old = await Promise.all(
            (before.get(service) ?? []).filter((oldId) => oldId !== id).map(deployment),
          )
          if (
            rows.length === 1 &&
            rows[0].id === id &&
            old.every((item) => item?.status === 'REMOVED')
          ) {
            probe(service, current, true)
            return
          }
        }
        await sleep(10000)
      }
      throw new Error(`Antigos deployments ${service} ainda não retirados; não capturar coorte`)
    },
    async remote(action, id, input = {}) {
      const current = await single('members')
      if (id !== 'active' && (current.id !== id || current.meta.commitHash !== sha))
        throw new Error('Members mudou durante bootstrap')
      const nonce = randomBytes(16).toString('hex')
      const args = [
        'bun',
        'scripts/release/kids-journey-bootstrap.mjs',
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
      if (reply.kind !== 'kids-journey-rollout' || reply.nonce !== nonce)
        throw new Error('ACK bootstrap remoto inválido')
      const { kind: _, nonce: __, ...result } = reply
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
