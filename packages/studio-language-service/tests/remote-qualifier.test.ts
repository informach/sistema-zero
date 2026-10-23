import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { StudioPythonLanguageOpenSchema } from '@sistemazero/core/studio/python-language-authorization'
import { buildPythonProvidedModuleMetadata } from '@sistemazero/core/studio/python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  currentPythonDeployment,
  providedPythonRelease,
} from '../../core/tests/fixtures/python-provided-release'
import {
  createRemoteQualificationReceipt,
  parseRemoteQualificationOptions,
  pinRemoteQualificationBootstrap,
  qualifyRemoteLanguage,
  reserveRemoteQualificationOutput,
} from '../scripts/qualify-remote'

async function inputs(environment: 'staging' | 'production' = 'staging') {
  const runtimeRelease = await providedPythonRelease()
  const original = await currentPythonDeployment()
  const audio = await buildPythonProvidedModuleMetadata(SZ_AUDIO_MODULE_DESCRIPTOR)
  const deployment = {
    release: runtimeRelease,
    distribution: {
      ...original.distribution,
      providedModules: runtimeRelease.manifest.python!.providedModules,
      files: [
        ...original.distribution.files,
        ...[audio.descriptorFile, audio.typingFile].map((file) => ({
          path: file.path,
          sha256: file.sha256,
          bytes: Buffer.byteLength(file.text),
        })),
      ],
    },
  }
  const verified = await verifyStudioPythonDeployment(deployment)
  const args = [
    'run',
    `--environment=${environment}`,
    `--base-url=https://sistemazero-studio-language${environment === 'staging' ? '-staging' : ''}.helena-bcc.workers.dev`,
    '--bootstrap=bootstrap.json',
    '--deployment=deployment.json',
    `--distribution-sha256=${verified.distributionSha256}`,
    `--manifest-sha256=${runtimeRelease.manifestSha256}`,
    `--profile-id=${runtimeRelease.profileId}`,
    `--release-id=${runtimeRelease.releaseId}`,
    '--out=exclusive-qa-output',
  ]
  const options = parseRemoteQualificationOptions(args)
  const bootstrap = await pinRemoteQualificationBootstrap(
    { protocolVersion: 1, runtimeRelease },
    options,
    deployment,
  )
  const receipt = await createRemoteQualificationReceipt(options, bootstrap)
  return { args, options, bootstrap, receipt, deployment }
}

test('remote qualification has no implicit destination, credentials or unknown arguments', async () => {
  const { args, options } = await inputs()
  expect(options.baseUrl).toBe('https://sistemazero-studio-language-staging.helena-bcc.workers.dev')
  for (const invalid of [
    [],
    args.slice(1),
    args.filter((arg) => !arg.startsWith('--manifest-sha256=')),
    args.filter((arg) => !arg.startsWith('--distribution-sha256=')),
    args.filter((arg) => !arg.startsWith('--deployment=')),
    [...args, '--token=secret'],
    [...args, '--environment=staging'],
    args.map((arg) => (arg === '--environment=staging' ? '--environment=production' : arg)),
    args.map((arg) =>
      arg.startsWith('--base-url=') ? '--base-url=https://language.example.test' : arg,
    ),
    args.map((arg) => (arg.startsWith('--base-url=') ? '--base-url=http://localhost' : arg)),
    args.map((arg) =>
      arg.startsWith('--base-url=') ? '--base-url=https://u:p@example.test' : arg,
    ),
    args.map((arg) =>
      arg.startsWith('--base-url=') ? '--base-url=https://example.test/path' : arg,
    ),
    args.map((arg) => (arg.startsWith('--manifest-sha256=') ? '--manifest-sha256=latest' : arg)),
  ])
    expect(() => parseRemoteQualificationOptions(invalid)).toThrow()
})

test('production requires its explicit environment and exact language Worker origin', async () => {
  const { args } = await inputs()
  const production = args.map((arg) =>
    arg === '--environment=staging'
      ? '--environment=production'
      : arg.replace('sistemazero-studio-language-staging.', 'sistemazero-studio-language.'),
  )
  const options = parseRemoteQualificationOptions(production)
  expect(options.environment).toBe('production')
  expect(options.baseUrl).toBe('https://sistemazero-studio-language.helena-bcc.workers.dev')
  for (const invalid of [
    production.map((arg) => arg.replace('--environment=production', '--environment=staging')),
    production.map((arg) =>
      arg.replace('sistemazero-studio-language.', 'sistemazero-studio-runtime.'),
    ),
    production.map((arg) => arg.replace('--environment=production', '--environment=prod')),
  ])
    expect(() => parseRemoteQualificationOptions(invalid)).toThrow()
})

test('canonical release integrity and all external pins are verified before remote work', async () => {
  const { options, bootstrap, deployment } = await inputs()
  expect(await pinRemoteQualificationBootstrap(bootstrap, options, deployment)).toEqual(bootstrap)
  for (const changed of [
    { manifestSha256: '0'.repeat(64) },
    { releaseId: 'another' },
    { profileId: 'another' },
    { distributionSha256: '0'.repeat(64) },
  ])
    await expect(
      pinRemoteQualificationBootstrap(bootstrap, { ...options, ...changed }, deployment),
    ).rejects.toThrow()
  await expect(
    pinRemoteQualificationBootstrap({ protocolVersion: 1 }, options, deployment),
  ).rejects.toThrow()
  await expect(
    pinRemoteQualificationBootstrap(
      {
        ...bootstrap,
        runtimeRelease: {
          ...bootstrap.runtimeRelease,
          manifestSha256: '0'.repeat(64),
        },
      },
      { ...options, manifestSha256: '0'.repeat(64) },
      deployment,
    ),
  ).rejects.toThrow('release hash mismatch')
  await expect(
    pinRemoteQualificationBootstrap(bootstrap, options, await currentPythonDeployment()),
  ).rejects.toThrow()
  const changedDistribution = structuredClone(deployment)
  changedDistribution.distribution.files[0]!.bytes += 1
  await expect(
    pinRemoteQualificationBootstrap(bootstrap, options, changedDistribution),
  ).rejects.toThrow('Distribution pin mismatch')
})

test('receipt is RUNNING before dispatch and output cannot reuse an existing directory', async () => {
  const { bootstrap, receipt } = await inputs()
  const parent = await mkdtemp(join(tmpdir(), 'sz-language-remote-test-'))
  const directory = join(parent, 'run')
  try {
    const output = await reserveRemoteQualificationOutput(directory, bootstrap, receipt)
    try {
      expect(JSON.parse(await readFile(join(directory, 'receipt.json'), 'utf8')).state).toBe(
        'RUNNING',
      )
      receipt.stage = 'second-checkpoint'
      const first = output.checkpoint()
      receipt.stage = 'concurrent-final-checkpoint'
      await Promise.all([first, output.checkpoint()])
      expect(JSON.parse(await readFile(join(directory, 'receipt.json'), 'utf8')).stage).toBe(
        'concurrent-final-checkpoint',
      )
      await expect(
        reserveRemoteQualificationOutput(directory, bootstrap, receipt),
      ).rejects.toThrow()
      expect(JSON.parse(await readFile(join(directory, 'bootstrap.json'), 'utf8'))).toEqual(
        bootstrap,
      )
    } finally {
      await output.close()
    }
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

/** Inert protocol responses exercise the runner's verdict/cleanup, never real Pyright or deployment. */
function boundary(
  options: {
    startError?: Error
    cleanupError?: Error
    completedBeforeCancel?: boolean
    lostOpen?: boolean
    invalidTarget?: boolean
  } = {},
) {
  const requests: Request[] = []
  const ids = new Set<string>()
  const closed: string[] = []
  let serial = 0,
    source = ''
  const response = (body: unknown, status = 200) => Response.json(body, { status })
  async function request(request: Request) {
    requests.push(request)
    const path = new URL(request.url).pathname
    const id = path.split('/')[4]!
    if (path === '/qa-language-unknown')
      return request.headers.has('authorization')
        ? response({ error: 'not-found' }, 404)
        : response({ error: 'unauthorized' }, 401)
    if (request.method === 'DELETE') {
      closed.push(id)
      if (options.cleanupError && closed.length === 1) throw options.cleanupError
      ids.delete(id)
      return response({ closed: true })
    }
    const body: unknown = await request.json()
    if (path.endsWith('/open')) {
      const parsed = StudioPythonLanguageOpenSchema.safeParse(body)
      if (!parsed.success) return response({ error: 'invalid-request' }, 400)
      if (parsed.data.runtimeRelease.manifestSha256 === '0'.repeat(64))
        return response({ error: 'invalid-configuration' }, 400)
      if (options.lostOpen) throw new Error('PRIVATE LOST RESPONSE')
      if (ids.size === 2) return response({ error: 'session-limit' }, 429)
      const sessionId = (++serial).toString(16).padStart(32, '0')
      ids.add(sessionId)
      return response({ version: 1, projectId: parsed.data.projectId, sessionId })
    }
    if (path.endsWith('/start')) {
      if (!ids.has(id)) return response({ error: 'expired' }, 410)
      // First Start intentionally carries a different binding; subsequent Start is real admission.
      const starts = requests.filter((r) => new URL(r.url).pathname.endsWith(`/${id}/start`)).length
      if (starts === 1) return response({ error: 'expired' }, 410)
      if (options.startError) throw options.startError
      return response({ ready: true })
    }
    const command = parsePythonLanguageCommand(body)
    if (command.id === 'wrong_binding') return response({ error: 'expired' }, 410)
    const envelope = { version: 1, id: command.id }
    if (command.kind === 'sync') {
      source = command.changes.find((file) => file.path === 'main.py')!.source!
      return response({ ...envelope, kind: 'synced', revision: command.revision })
    }
    if (command.kind === 'cancel') return response({ ...envelope, kind: 'ack' })
    if (command.kind !== 'query') throw new Error('Unexpected command')
    if (command.id.startsWith('stale'))
      return response({ ...envelope, kind: 'error', code: 'stale-document' })
    if (command.id.startsWith('cancel_target') && !options.completedBeforeCancel)
      return response({
        ...envelope,
        kind: 'error',
        code: options.invalidTarget ? 'unavailable' : 'cancelled',
      })
    const result =
      command.method === 'completions'
        ? [{ name: 'forward' }, { name: 'sqrt' }]
        : command.method === 'hover'
          ? { text: 'def play(path: str)' }
          : source.includes('tocar(123')
            ? [{ code: 'reportArgumentType', source: 'Pyright' }]
            : []
    return response({
      ...envelope,
      kind: 'result',
      method: command.method,
      path: command.path,
      documentVersion: command.documentVersion,
      revision: command.revision,
      result,
    })
  }
  return { request, requests, closed, ids }
}

const token = 'PRIVATE-REMOTE-QUALIFIER-TEST-TOKEN'
test('inert positive verifies runner verdict, causal cancellation classification and every Close', async () => {
  const prepared = await inputs(),
    transport = boundary()
  const result = await qualifyRemoteLanguage({
    ...prepared,
    token,
    checkpoint: async () => {},
    request: transport.request,
  })
  expect(result.state).toBe('API_PASSED')
  expect(result.cancellationQualified).toBe(true)
  expect(result.overallQualified).toBe(false)
  expect(result.hostedUiVerified).toBe(false)
  expect(result.physicalCleanupVerified).toBe(false)
  expect(result.sessions.every((session) => session.closeAcknowledged && session.retired)).toBe(
    true,
  )
  expect(transport.closed).toHaveLength(2)
  expect(transport.ids.size).toBe(0)
  expect(result.checks.every((check) => check.passed)).toBe(true)
  expect(JSON.stringify(result)).not.toContain(token)
  expect(JSON.stringify(result)).not.toContain('import turtle')
  expect(
    transport.requests.filter((request) => new URL(request.url).pathname.endsWith('/start')),
  ).toHaveLength(4)
})

test('a completed target and cancel ACK do not qualify cancellation or the overall hosted gate', async () => {
  const prepared = await inputs(),
    transport = boundary({ completedBeforeCancel: true })
  const receipt = await qualifyRemoteLanguage({
    ...prepared,
    token,
    checkpoint: async () => {},
    request: transport.request,
  })
  expect(receipt.state).toBe('API_PASSED')
  expect(receipt.cancellation).toBe('target-completed-first')
  expect(receipt.cancellationQualified).toBe(false)
  expect(receipt.overallQualified).toBe(false)
})

test('production transport keeps its own origin and receipt; a crossed target is rejected before requests', async () => {
  const prepared = await inputs('production'),
    transport = boundary()
  const crossed = {
    ...prepared.options,
    baseUrl: 'https://sistemazero-studio-language-staging.helena-bcc.workers.dev',
  }
  await expect(
    qualifyRemoteLanguage({
      ...prepared,
      options: crossed,
      token,
      checkpoint: async () => {},
      request: transport.request,
    }),
  ).rejects.toThrow()
  expect(transport.requests).toHaveLength(0)
  const result = await qualifyRemoteLanguage({
    ...prepared,
    token,
    checkpoint: async () => {},
    request: transport.request,
  })
  expect(result.environment).toBe('production')
  expect(result.state).toBe('API_PASSED')
  expect(result.physicalCleanupVerified).toBe(false)
  expect(new Set(transport.requests.map((request) => new URL(request.url).origin))).toEqual(
    new Set(['https://sistemazero-studio-language.helena-bcc.workers.dev']),
  )
  expect(transport.ids.size).toBe(0)
})

test('wrong target reply fails despite a successful cancel ACK and still closes both reservations', async () => {
  const prepared = await inputs(),
    transport = boundary({ invalidTarget: true })
  await expect(
    qualifyRemoteLanguage({
      ...prepared,
      token,
      checkpoint: async () => {},
      request: transport.request,
    }),
  ).rejects.toThrow()
  expect(prepared.receipt.state).toBe('FAILED')
  expect(transport.closed).toHaveLength(2)
})

test('primary failure and failed Close remain aggregated while the other session is retired', async () => {
  const primary = new Error('PRIVATE PRIMARY'),
    cleanup = new Error('PRIVATE CLEANUP')
  const prepared = await inputs(),
    transport = boundary({ startError: primary, cleanupError: cleanup })
  const outcome = await qualifyRemoteLanguage({
    ...prepared,
    token,
    checkpoint: async () => {},
    request: transport.request,
  }).then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(AggregateError)
  if (!(outcome instanceof AggregateError)) throw new Error('Expected aggregate')
  expect(outcome.errors).toContain(primary)
  expect(outcome.errors).toContain(cleanup)
  expect(transport.closed).toHaveLength(2)
  expect(prepared.receipt.sessions[1]!.retired).toBe(true)
  expect(prepared.receipt.state).toBe('FAILED')
  expect(JSON.stringify(prepared.receipt)).not.toContain('PRIVATE')
})

test('lost admission response keeps remote outcome unknown and never promises cleanup', async () => {
  const prepared = await inputs(),
    transport = boundary({ lostOpen: true })
  await expect(
    qualifyRemoteLanguage({
      ...prepared,
      token,
      checkpoint: async () => {},
      request: transport.request,
    }),
  ).rejects.toThrow()
  expect(prepared.receipt.remoteOutcomeUnknown).toBe(true)
  expect(prepared.receipt.sessions).toEqual([])
  expect(prepared.receipt.state).toBe('FAILED')
  expect(prepared.receipt.physicalCleanupVerified).toBe(false)
})

test('receipt failure during retirement cannot prevent either DELETE', async () => {
  const prepared = await inputs(),
    transport = boundary()
  let failReceipt = true
  const checkpoint = async () => {
    if (prepared.receipt.stage === 'close' && failReceipt) {
      failReceipt = false
      throw new Error('disk full')
    }
  }
  await expect(
    qualifyRemoteLanguage({ ...prepared, token, checkpoint, request: transport.request }),
  ).rejects.toThrow()
  expect(transport.closed).toHaveLength(2)
  expect(prepared.receipt.state).toBe('FAILED')
})

test('cancelled caller cannot start requests but cleanup has an independent deadline', async () => {
  const prepared = await inputs(),
    transport = boundary()
  await expect(
    qualifyRemoteLanguage({
      ...prepared,
      token,
      checkpoint: async () => {},
      request: transport.request,
      signal: AbortSignal.abort(),
    }),
  ).rejects.toThrow()
  expect(transport.requests).toHaveLength(0)
  expect(prepared.receipt.remoteOutcomeUnknown).toBe(false)
})
