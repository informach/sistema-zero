import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  PYTHON_LANGUAGE_LIMITS,
  type PythonLanguageCommand,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import {
  StudioPythonLanguageOpenSchema,
  StudioPythonLanguageStartSchema,
} from '@sistemazero/core/studio/python-language-authorization'
import {
  createPythonLanguageBootstrap,
  STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES,
  type StudioPythonLanguageBootstrap,
} from '@sistemazero/core/studio/python-language-bootstrap'
import { z } from 'zod'

const sha = /^[a-f0-9]{64}$/
const identity = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const responseRecord = z.record(z.string(), z.unknown())
const sessions = z.object({ sessionId: z.string().regex(/^[a-f0-9]{32}$/) })
const symbols = z.array(z.object({ name: z.string() }))
const diagnostics = z.array(
  z.object({ code: z.union([z.string(), z.number()]), source: z.literal('Pyright') }),
)
const hover = z.object({ text: z.string() })

export const REMOTE_QUALIFICATION_LIMITS = Object.freeze({
  workMs: 240_000,
  cleanupMs: 60_000,
  totalMs: 300_000,
  admissionMs: 5_000,
  // One fixed fixture, no load escalation/retry if cancellation loses the race.
  cancelLines: 7_000,
})

export function parseRemoteQualificationOptions(args: readonly string[]) {
  const [mode, ...flags] = args
  assert(mode === 'preflight' || mode === 'run', 'Choose preflight or run explicitly')
  const names = [
    'environment',
    'base-url',
    'bootstrap',
    'manifest-sha256',
    'profile-id',
    'release-id',
    'out',
  ]
  const fields = new Map<string, string>()
  for (const flag of flags) {
    const match = /^--([a-z0-9-]+)=(.+)$/.exec(flag)
    assert(match && names.includes(match[1]!) && !fields.has(match[1]!), 'Invalid arguments')
    fields.set(match[1]!, match[2]!)
  }
  assert.equal(fields.size, names.length, 'All public inputs are required')
  const get = (name: string) => fields.get(name)!
  assert.equal(get('environment'), 'staging', 'This qualifier admits staging explicitly only')
  const url = new URL(get('base-url'))
  assert(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    'An explicit HTTPS origin is required',
  )
  assert(sha.test(get('manifest-sha256')), 'An exact manifest SHA256 is required')
  assert(
    identity.test(get('profile-id')) && identity.test(get('release-id')),
    'Invalid release pin',
  )
  return Object.freeze({
    mode,
    environment: 'staging' as const,
    baseUrl: url.origin,
    bootstrapPath: resolve(get('bootstrap')),
    manifestSha256: get('manifest-sha256'),
    profileId: get('profile-id'),
    releaseId: get('release-id'),
    directory: resolve(get('out')),
  })
}
export type RemoteQualificationOptions = ReturnType<typeof parseRemoteQualificationOptions>

export async function pinRemoteQualificationBootstrap(
  raw: unknown,
  pins: Pick<RemoteQualificationOptions, 'manifestSha256' | 'profileId' | 'releaseId'>,
) {
  const bootstrap = await createPythonLanguageBootstrap(raw)
  const release = bootstrap.runtimeRelease
  assert.equal(release.manifestSha256, pins.manifestSha256, 'Manifest pin mismatch')
  assert.equal(release.profileId, pins.profileId, 'Profile pin mismatch')
  assert.equal(release.releaseId, pins.releaseId, 'Release pin mismatch')
  assert(
    release.manifest.python?.providedModules.some(
      (item) => item.descriptor.importName === 'sz_audio',
    ),
    'This qualification requires the actual release providing sz_audio',
  )
  return bootstrap
}

const SOURCE =
  'import turtle\nimport math\nfrom sz_audio import play as tocar\n' +
  'root: float = math.sqrt(4)\nvoice: int = tocar("click.wav", volume=0.5)\n' +
  'pen = turtle.Turtle()\npen.forward(10)\n'
type Check = { stage: string; status: number; passed: boolean }
type OwnedSession = { id: string; closeAcknowledged: boolean; retired: boolean }
export interface RemoteQualificationReceipt {
  kind: 'python-language-remote-api'
  state: 'RUNNING' | 'API_PASSED' | 'FAILED' | 'PREFLIGHT_PASSED'
  environment: 'staging'
  baseUrl: string
  manifestSha256: string
  profileId: string
  releaseId: string
  bootstrapSha256: string
  fixtureSha256: string
  owner: string
  projectId: string
  startedAt: string
  completedAt?: string
  elapsedMs?: number
  stage: string
  checks: Check[]
  sessions: OwnedSession[]
  failures: { stage: string; kind: 'operation' | 'cleanup' | 'receipt' }[]
  remoteOutcomeUnknown: boolean
  cancellationQualified: boolean
  cancellation: 'not-attempted' | 'target-cancelled' | 'target-completed-first'
  physicalCleanupVerified: false
  hostedUiVerified: false
  contextualAuthorizationVerified: false
  deployedVersionVerified: false
  overallQualified: false
  sourceExecutionRequested: false
  limits: typeof REMOTE_QUALIFICATION_LIMITS
}

export async function createRemoteQualificationReceipt(
  options: RemoteQualificationOptions,
  bootstrap: StudioPythonLanguageBootstrap,
): Promise<RemoteQualificationReceipt> {
  return {
    kind: 'python-language-remote-api',
    state: 'RUNNING',
    environment: options.environment,
    baseUrl: options.baseUrl,
    manifestSha256: options.manifestSha256,
    profileId: options.profileId,
    releaseId: options.releaseId,
    bootstrapSha256: await sha256Hex(canonicalJson(bootstrap)),
    fixtureSha256: await sha256Hex(SOURCE),
    owner: randomBytes(32).toString('hex'),
    projectId: `qa-language-${randomUUID()}`,
    startedAt: new Date().toISOString(),
    stage: 'prepared',
    checks: [],
    sessions: [],
    failures: [],
    remoteOutcomeUnknown: false,
    cancellationQualified: false,
    cancellation: 'not-attempted',
    physicalCleanupVerified: false,
    hostedUiVerified: false,
    contextualAuthorizationVerified: false,
    deployedVersionVerified: false,
    overallQualified: false,
    sourceExecutionRequested: false,
    limits: REMOTE_QUALIFICATION_LIMITS,
  }
}

/** A new directory and RUNNING receipt are reserved before any remote call. */
export async function reserveRemoteQualificationOutput(
  directory: string,
  bootstrap: StudioPythonLanguageBootstrap,
  receipt: RemoteQualificationReceipt,
) {
  await mkdir(directory) // Parent must exist. Never reuse an earlier qualification directory.
  const file = await open(resolve(directory, 'receipt.json'), 'wx')
  let pending = Promise.resolve()
  function checkpoint() {
    const text = `${JSON.stringify(receipt, null, 2)}\n`
    const write = pending.then(async () => {
      await file.truncate(0)
      await file.write(text, 0, 'utf8')
      await file.sync()
    })
    // Each caller receives its own failure. The queue still lets cleanup record later evidence.
    pending = write.then(
      () => {},
      () => {},
    )
    return write
  }
  try {
    await checkpoint()
    await writeFile(resolve(directory, 'bootstrap.json'), `${canonicalJson(bootstrap)}\n`, {
      flag: 'wx',
    })
  } catch (error) {
    await file.close()
    throw error
  }
  return {
    checkpoint,
    close: async () => {
      await pending
      await file.close()
    },
  }
}

/** Transport injection is an inert test boundary, not a replacement for hosted qualification. */
export async function qualifyRemoteLanguage(input: {
  options: RemoteQualificationOptions
  bootstrap: StudioPythonLanguageBootstrap
  token: string
  receipt: RemoteQualificationReceipt
  checkpoint(): Promise<void>
  request?: (request: Request) => Promise<Response>
  signal?: AbortSignal
}) {
  const { options, bootstrap, token, receipt, checkpoint } = input
  const request = input.request ?? ((request: Request) => fetch(request))
  const binding = randomBytes(32).toString('hex'),
    wrongBinding = randomBytes(32).toString('hex')
  const began = Date.now(),
    errors: unknown[] = []
  const workController = new AbortController(),
    totalController = new AbortController()
  const workTimer = setTimeout(() => workController.abort(), REMOTE_QUALIFICATION_LIMITS.workMs)
  const totalTimer = setTimeout(() => totalController.abort(), REMOTE_QUALIFICATION_LIMITS.totalMs)
  const work = AbortSignal.any([
    workController.signal,
    totalController.signal,
    ...(input.signal ? [input.signal] : []),
  ])
  const base = `/v1/python-language/${receipt.owner}`
  const sessionPath = (id: string) => `${base}/${id}`
  const fail = (stage: string, error: unknown, kind: 'operation' | 'cleanup' | 'receipt') => {
    errors.push(error)
    receipt.failures.push({ stage, kind }) // Never serialize provider errors, headers or bodies.
  }
  async function persist(cleanup = false) {
    try {
      await checkpoint()
    } catch (error) {
      if (!cleanup) throw error
      fail('cleanup-receipt', error, 'receipt')
    }
  }
  let cleanupSignal: AbortSignal | undefined
  async function exchange(
    stage: string,
    path: string,
    spec: {
      method?: 'GET' | 'POST' | 'DELETE'
      body?: unknown
      operation?: string
      contextBinding?: string
      anonymous?: boolean
      timeout?: number
      cleanup?: boolean
      acquire?: boolean
    } = {},
  ) {
    receipt.stage = stage
    await persist(spec.cleanup)
    const signal = AbortSignal.any([
      spec.cleanup ? cleanupSignal! : work,
      AbortSignal.timeout(spec.timeout ?? REMOTE_QUALIFICATION_LIMITS.admissionMs),
    ])
    signal.throwIfAborted()
    let response: Response | undefined
    // A lost Open response may have reserved an unknown ID. Never claim its cleanup.
    if (spec.acquire) receipt.remoteOutcomeUnknown = true
    await persist(spec.cleanup)
    const exchangeErrors: unknown[] = []
    let result: { status: number; body: Record<string, unknown>; check: Check } | undefined
    try {
      response = await request(
        new Request(`${options.baseUrl}${path}`, {
          method: spec.method ?? 'GET',
          redirect: 'error',
          cache: 'no-store',
          signal,
          headers: {
            ...(spec.anonymous ? {} : { authorization: `Bearer ${token}` }),
            ...(spec.body === undefined ? {} : { 'content-type': 'application/json' }),
            ...(spec.operation
              ? {
                  'x-studio-python-operation': spec.operation,
                  'x-studio-python-binding': spec.contextBinding ?? binding,
                }
              : {}),
          },
          ...(spec.body === undefined ? {} : { body: JSON.stringify(spec.body) }),
        }),
      )
      assert(response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      const body = responseRecord.parse(
        await readJsonBodyWithLimit(
          response,
          spec.operation ? PYTHON_LANGUAGE_LIMITS.maxResponseBytes : 4096,
          signal,
        ),
      )
      if (spec.acquire) {
        const acquired = sessions.safeParse(body)
        if (acquired.success) {
          if (!receipt.sessions.some((entry) => entry.id === acquired.data.sessionId))
            receipt.sessions.push({
              id: acquired.data.sessionId,
              closeAcknowledged: false,
              retired: false,
            })
          receipt.remoteOutcomeUnknown = false
        } else if (response.status >= 400 && response.status < 500) {
          receipt.remoteOutcomeUnknown = false
        }
      }
      const check = { stage, status: response.status, passed: false }
      receipt.checks.push(check)
      await persist(spec.cleanup)
      result = { status: response.status, body, check }
    } catch (error) {
      exchangeErrors.push(error)
    } finally {
      if (response?.body && !response.body.locked) {
        try {
          await response.body.cancel()
        } catch (error) {
          exchangeErrors.push(error)
        }
      }
    }
    if (exchangeErrors.length === 1) throw exchangeErrors[0]
    if (exchangeErrors.length)
      throw new AggregateError(exchangeErrors, 'Response and cleanup failed')
    assert(result)
    return result
  }
  function accept(result: Awaited<ReturnType<typeof exchange>>, condition: boolean) {
    assert(condition, 'Remote assertion failed')
    result.check.passed = true
  }
  async function expectError(
    stage: string,
    path: string,
    spec: Parameters<typeof exchange>[2],
    status: number,
    error: string,
  ) {
    const result = await exchange(stage, path, spec)
    accept(result, result.status === status && result.body.error === error)
  }
  let commandSequence = 0
  async function command(id: string, command: PythonLanguageCommand) {
    const current = parsePythonLanguageCommand(command)
    const result = await exchange(current.id, sessionPath(id), {
      method: 'POST',
      body: current,
      operation: current.kind,
      timeout: PYTHON_LANGUAGE_LIMITS.requestTimeoutMs,
    })
    accept(
      result,
      result.status === 200 && result.body.version === 1 && result.body.id === current.id,
    )
    return result.body
  }
  const nextId = (label: string) => `${label}_${++commandSequence}`
  try {
    assert(
      token.length >= 32 && token.length <= 4096 && !/[\r\n]/.test(token),
      'Invalid credential',
    )
    await expectError(
      'anonymous-auth',
      '/qa-language-unknown',
      { anonymous: true },
      401,
      'unauthorized',
    )
    await expectError('token-auth', '/qa-language-unknown', {}, 404, 'not-found')
    await expectError(
      'missing-release',
      `${base}/open`,
      {
        method: 'POST',
        body: { projectId: receipt.projectId, binding },
        acquire: true,
      },
      400,
      'invalid-request',
    )
    await expectError(
      'forged-release',
      `${base}/open`,
      {
        method: 'POST',
        acquire: true,
        body: {
          projectId: receipt.projectId,
          binding,
          runtimeRelease: {
            ...bootstrap.runtimeRelease,
            manifestSha256:
              bootstrap.runtimeRelease.manifestSha256 === '0'.repeat(64)
                ? '1'.repeat(64)
                : '0'.repeat(64),
          },
        },
      },
      400,
      'invalid-configuration',
    )
    const openBody = StudioPythonLanguageOpenSchema.parse({
      projectId: receipt.projectId,
      binding,
      runtimeRelease: bootstrap.runtimeRelease,
    })
    for (let n = 0; n < 2; n++) {
      const opened = await exchange(`reserve-${n + 1}`, `${base}/open`, {
        method: 'POST',
        body: openBody,
        acquire: true,
      })
      accept(
        opened,
        opened.status === 200 &&
          opened.body.version === 1 &&
          opened.body.projectId === receipt.projectId &&
          sessions.safeParse(opened.body).success,
      )
    }
    await expectError(
      'owner-quota',
      `${base}/open`,
      { method: 'POST', body: openBody, acquire: true },
      429,
      'session-limit',
    )
    const id = receipt.sessions[0]!.id
    await expectError(
      'wrong-start-binding',
      `${sessionPath(id)}/start`,
      {
        method: 'POST',
        body: StudioPythonLanguageStartSchema.parse({ binding: wrongBinding }),
      },
      410,
      'expired',
    )
    const started = await exchange('start', `${sessionPath(id)}/start`, {
      method: 'POST',
      body: StudioPythonLanguageStartSchema.parse({ binding }),
      timeout: PYTHON_LANGUAGE_LIMITS.startupTimeoutMs,
    })
    accept(started, started.status === 200 && started.body.ready === true)
    await expectError(
      'wrong-command-binding',
      sessionPath(id),
      {
        method: 'POST',
        body: parsePythonLanguageCommand({
          version: 1,
          id: 'wrong_binding',
          kind: 'query',
          method: 'symbols',
          revision: 1,
          path: 'main.py',
          documentVersion: 1,
        }),
        operation: 'query',
        contextBinding: wrongBinding,
      },
      410,
      'expired',
    )
    let revision = 0
    async function sync(
      source: string,
      changes: { path: string; version: number; source: string }[] = [],
    ) {
      const current = ++revision
      const reply = await command(id, {
        version: 1,
        id: nextId('sync'),
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: current - 1,
        revision: current,
        changes: [{ path: 'main.py', version: current, source }, ...changes],
      })
      assert(reply.kind === 'synced' && reply.revision === current)
    }
    async function query(method: 'completions' | 'hover' | 'diagnostics', offset?: number) {
      const reply = await command(id, {
        version: 1,
        id: nextId(method),
        kind: 'query',
        method,
        path: 'main.py',
        revision,
        documentVersion: revision,
        ...(offset === undefined ? {} : { offset }),
      })
      assert(
        reply.kind === 'result' &&
          reply.method === method &&
          reply.revision === revision &&
          reply.documentVersion === revision &&
          reply.path === 'main.py',
      )
      return reply.result
    }
    await sync(SOURCE)
    assert.deepEqual(diagnostics.parse(await query('diagnostics')), [])
    assert(
      symbols
        .parse(await query('completions', SOURCE.lastIndexOf('pen.') + 4))
        .some((item) => item.name === 'forward'),
    )
    assert(
      symbols
        .parse(await query('completions', SOURCE.indexOf('math.sqrt') + 5))
        .some((item) => item.name === 'sqrt'),
    )
    assert(hover.parse(await query('hover', SOURCE.indexOf('tocar("'))).text.includes('path: str'))
    await sync(SOURCE.replace('"click.wav"', '123'))
    const invalid = diagnostics.parse(await query('diagnostics'))
    assert.equal(invalid.length, 1)
    assert.equal(invalid[0]!.code, 'reportArgumentType')
    await sync(SOURCE)
    assert.deepEqual(diagnostics.parse(await query('diagnostics')), [])
    const stale = await command(id, {
      version: 1,
      id: nextId('stale'),
      kind: 'query',
      method: 'symbols',
      path: 'main.py',
      revision: revision - 1,
      documentVersion: revision - 1,
    })
    assert(stale.kind === 'error' && stale.code === 'stale-document')
    const workload = `${Array.from(
      { length: REMOTE_QUALIFICATION_LIMITS.cancelLines },
      (_, n) => `v${n}: int = ${n}`,
    ).join('\n')}\n`
    await sync(SOURCE, [{ path: 'cancel_work.py', version: 1, source: workload }])
    const targetId = nextId('cancel_target')
    const target = command(id, {
      version: 1,
      id: targetId,
      kind: 'query',
      method: 'projectDiagnostics',
      path: 'main.py',
      revision,
      documentVersion: revision,
    })
    // No sleeping, polling or increased load. The target's own reply is the causal oracle.
    const cancel = command(id, {
      version: 1,
      id: nextId('cancel'),
      kind: 'cancel',
      requestId: targetId,
    })
    const outcomes = await Promise.allSettled([target, cancel])
    const rejected = outcomes.filter((result) => result.status === 'rejected')
    if (rejected.length)
      throw new AggregateError(
        rejected.map((result) => result.reason),
        'Cancellation requests failed',
      )
    const targetReply = await target,
      cancelReply = await cancel
    assert.equal(cancelReply.kind, 'ack')
    if (targetReply.kind === 'error' && targetReply.code === 'cancelled') {
      receipt.cancellation = 'target-cancelled'
      receipt.cancellationQualified = true
    } else {
      assert(
        targetReply.kind === 'result' &&
          targetReply.method === 'projectDiagnostics' &&
          targetReply.revision === revision &&
          targetReply.documentVersion === revision,
      )
      receipt.cancellation = 'target-completed-first'
    }
  } catch (error) {
    fail(receipt.stage, error, 'operation')
  } finally {
    clearTimeout(workTimer)
    workController.abort()
    cleanupSignal = AbortSignal.any([
      totalController.signal,
      AbortSignal.timeout(REMOTE_QUALIFICATION_LIMITS.cleanupMs),
    ])
    for (const session of receipt.sessions) {
      try {
        const result = await exchange('close', sessionPath(session.id), {
          method: 'DELETE',
          cleanup: true,
          timeout: PYTHON_LANGUAGE_LIMITS.startupTimeoutMs,
        })
        accept(result, result.status === 200 && result.body.closed === true)
        session.closeAcknowledged = true
        const retired = await exchange('closed-session', `${sessionPath(session.id)}/start`, {
          method: 'POST',
          body: { binding },
          cleanup: true,
        })
        accept(retired, retired.status === 410 && retired.body.error === 'expired')
        session.retired = true
      } catch (error) {
        fail(`cleanup:${session.id}`, error, 'cleanup')
      }
    }
    clearTimeout(totalTimer)
    if (receipt.remoteOutcomeUnknown || receipt.sessions.some((session) => !session.retired))
      fail('unconfirmed-cleanup', new Error('Remote cleanup is unconfirmed'), 'cleanup')
    receipt.completedAt = new Date().toISOString()
    receipt.elapsedMs = Date.now() - began
    receipt.state = errors.length ? 'FAILED' : 'API_PASSED'
    try {
      await checkpoint()
    } catch (error) {
      receipt.state = 'FAILED'
      fail('final-receipt', error, 'receipt')
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length) throw new AggregateError(errors, 'Remote qualification failed')
  return receipt
}

export async function runRemoteQualificationCli(args: readonly string[]) {
  const options = parseRemoteQualificationOptions(args)
  const file = await lstat(options.bootstrapPath)
  assert(
    file.isFile() &&
      !file.isSymbolicLink() &&
      file.size <= STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES,
  )
  const source = await readFile(options.bootstrapPath, 'utf8')
  assert(Buffer.byteLength(source) <= STUDIO_PYTHON_LANGUAGE_BOOTSTRAP_MAX_BYTES)
  const bootstrap = await pinRemoteQualificationBootstrap(JSON.parse(source), options)
  const receipt = await createRemoteQualificationReceipt(options, bootstrap)
  const output = await reserveRemoteQualificationOutput(options.directory, bootstrap, receipt)
  const errors: unknown[] = []
  try {
    if (options.mode === 'preflight') {
      receipt.state = 'PREFLIGHT_PASSED'
      await output.checkpoint()
    } else {
      const controller = new AbortController()
      const interrupt = () => controller.abort()
      process.on('SIGINT', interrupt)
      process.on('SIGTERM', interrupt)
      try {
        await qualifyRemoteLanguage({
          options,
          bootstrap,
          receipt,
          token: process.env.STUDIO_PYTHON_LANGUAGE_TOKEN ?? '',
          checkpoint: output.checkpoint,
          signal: controller.signal,
        })
      } finally {
        process.off('SIGINT', interrupt)
        process.off('SIGTERM', interrupt)
      }
    }
  } catch (error) {
    errors.push(error)
  } finally {
    try {
      await output.close()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length) throw new AggregateError(errors, 'Qualification and receipt cleanup failed')
  return {
    state: receipt.state,
    cancellationQualified: receipt.cancellationQualified,
    overallQualified: false,
    physicalCleanupVerified: false,
    hostedUiVerified: false,
  }
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runRemoteQualificationCli(process.argv.slice(2))))
  } catch {
    // No raw error/stack, echoed arguments, request bodies or credential values.
    console.error(
      JSON.stringify({
        state: 'FAILED',
        overallQualified: false,
        instruction: 'Inspect the owned receipt; no raw provider error was logged.',
      }),
    )
    process.exitCode = 1
  }
}
