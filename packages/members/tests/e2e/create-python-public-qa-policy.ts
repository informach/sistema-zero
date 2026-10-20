/** Synthetic loopback QA policy; never overwrite historical public-qa output. */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { canonicalJson } from '../../../core/src/creations/content-fingerprint'
import { StudioAuthoringCatalogSchema } from '../../../core/src/studio/authoring-catalog'
import {
  studioPythonLogicalFiles,
  studioPythonRuntimePrefix,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '../../../core/src/studio/python-runtime-distribution'
import { PYTHON_PROGRAMMING_CODECS } from '../../../studio/src/python/blocks/catalog'
import { PYTHON_TURTLE_CODECS } from '../../../studio/src/python/extensions/turtle/catalog'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'

export const QA_PYTHON_DISTRIBUTION_SHA256 =
  '19de08fbe232d293e833dc3097f880a129e651f14fd539380869031d06369b1c'
export type QaPythonHostProfile = 'historical-19de' | 'strict-csp-43fa'
export type QaPythonHostOptions =
  | { hostProfile?: 'historical-19de'; expectedProviderOrigin?: string }
  | { hostProfile: 'strict-csp-43fa'; expectedProviderOrigin: string }
  | { hostProfile: 'approved-final'; approvalDirectory: string; approvalSha256: string }
const qaProfiles = {
  'historical-19de': Object.freeze({
    distributionSha256: QA_PYTHON_DISTRIBUTION_SHA256,
    releaseManifestSha256: '4e7f091d2617f37204b77a45da94fa46320feb19bc57dfd5dff7cb05759fae05',
    controlOrigin: 'http://127.0.0.1:5297',
    requiresProviderOrigin: false,
    distributionDirectory: '.cache/studio-python-l0/portable-audio-runtime-r3/distributions',
  }),
  'strict-csp-43fa': Object.freeze({
    distributionSha256: '43fa3d2a253f50364075655cb3aa3473ab37246d9d3a5528b36fe01d1cec5048',
    releaseManifestSha256: 'bb6029704f10c89c336bcbad2bf36960d27a6e1d662752790af0aee6ebc04459',
    controlOrigin: 'http://127.0.0.1:5307',
    requiresProviderOrigin: true,
    distributionDirectory: '.cache/studio-python-l0/python-strict-csp-runtime-r1/distributions',
  }),
} as const
export function parseQaPythonHostProfile(value: string | undefined): QaPythonHostProfile {
  switch (value) {
    case undefined:
    case 'historical-19de':
      return 'historical-19de'
    case 'strict-csp-43fa':
      return value
    default:
      throw new Error('Perfil de host Python QA não aprovado.')
  }
}
export function qaPythonHostProfile(profile: QaPythonHostProfile = 'historical-19de') {
  return qaProfiles[parseQaPythonHostProfile(profile)]
}
function expectedQaProviderOrigin(
  options: Exclude<QaPythonHostOptions, { hostProfile: 'approved-final' }>,
) {
  const profile = qaPythonHostProfile(options.hostProfile)
  const origin = options.expectedProviderOrigin
  if (origin === undefined) {
    if (profile.requiresProviderOrigin) throw new Error('Pin da origem provider QA obrigatório.')
    return undefined
  }
  const parsed = new URL(origin)
  if (
    parsed.origin !== origin ||
    parsed.href !== `${origin}/` ||
    parsed.protocol !== 'http:' ||
    parsed.hostname !== '127.0.0.1' ||
    !parsed.port ||
    origin === profile.controlOrigin
  )
    throw new Error('O pin provider QA deve ser loopback exato, separado do controle.')
  return origin
}
/** Trusted QA caller supplies an origin from its hash-reviewed local ownership/host proof. */
export function qaPythonHostOptionsFromEnvironment(
  profileValue: string | undefined,
  providerOrigin: string | undefined,
  approvalDirectory?: string,
  approvalSha256?: string,
): QaPythonHostOptions {
  if (profileValue === 'approved-final') {
    if (providerOrigin !== undefined || !approvalDirectory || !approvalSha256)
      throw new Error('A composição final exige diretório/SHA de aprovação, sem override provider.')
    if (!/^[a-f0-9]{64}$/.test(approvalSha256)) throw new Error('SHA de aprovação QA inválido.')
    return { hostProfile: 'approved-final', approvalDirectory, approvalSha256 }
  }
  if (approvalDirectory !== undefined || approvalSha256 !== undefined)
    throw new Error('Aprovação final não pode ser usada com perfil histórico.')
  const hostProfile = parseQaPythonHostProfile(profileValue)
  if (hostProfile === 'strict-csp-43fa') {
    if (!providerOrigin) throw new Error('Pin da origem provider QA obrigatório.')
    const options: QaPythonHostOptions = { hostProfile, expectedProviderOrigin: providerOrigin }
    expectedQaProviderOrigin(options)
    return options
  }
  const options: QaPythonHostOptions = { hostProfile, expectedProviderOrigin: providerOrigin }
  expectedQaProviderOrigin(options)
  return options
}
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const digest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const plain = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Metadados de QA inválidos.')
  return value as Record<string, unknown>
}

// PowerShell DateTime UTC round-trip format, including all seven fractional digits.
// Do not accept ConvertTo-Json's legacy /Date(...)/ or silently normalize caller data.
const QaHostCreationUtcSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/)
  .refine((value) => {
    const epoch = Date.parse(value)
    return Number.isFinite(epoch) && new Date(epoch).toISOString() === value.slice(0, 23) + 'Z'
  }, 'A criação do host deve ser UTC ISO round-trip exata.')
const ApprovedQaHostSchema = z
  .object({
    version: z.literal(1),
    distributionDirectory: z.string().min(1),
    distributionSha256: z.string().regex(/^[a-f0-9]{64}$/),
    releaseManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
    controlOrigin: z.string().url(),
    providerOrigin: z.string().url(),
    host: z
      .object({
        pid: z.number().int().positive(),
        creationDate: QaHostCreationUtcSchema,
        executablePath: z.string().min(1),
        commandLineSha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
  })
  .strict()
type ApprovedQaHost = z.infer<typeof ApprovedQaHostSchema>
function requireLoopbackOrigin(origin: string) {
  const url = new URL(origin)
  if (
    url.origin !== origin ||
    url.href !== origin + '/' ||
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port
  )
    throw new Error('A aprovação QA exige origens loopback exatas.')
}
function verifyApprovedHost(approval: ApprovedQaHost) {
  if (process.platform !== 'win32') throw new Error('O witness deste host QA exige Windows/CIM.')
  const ports = [approval.controlOrigin, approval.providerOrigin].map((origin) =>
    Number(new URL(origin).port),
  )
  const identity = Buffer.from(
    JSON.stringify({
      pid: approval.host.pid,
      creationDate: approval.host.creationDate,
      executablePath: approval.host.executablePath,
    }),
  ).toString('base64')
  // First query never requests CommandLine. Recheck the second snapshot before projecting it.
  // This observes process identity; it never signals or operates on a process.
  const script = `
$ErrorActionPreference = 'Stop'
$qaExpectedHost = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${identity}')) | ConvertFrom-Json
function Test-QaHostIdentity($qaProcess) {
  if ($null -eq $qaProcess -or $null -eq $qaProcess.CreationDate -or $null -eq $qaProcess.ExecutablePath) { return $false }
  return [int64]$qaProcess.ProcessId -eq [int64]$qaExpectedHost.pid -and
    $qaProcess.CreationDate.ToUniversalTime().ToString('o') -ceq $qaExpectedHost.creationDate -and
    [string]::Equals($qaProcess.ExecutablePath, $qaExpectedHost.executablePath, [StringComparison]::OrdinalIgnoreCase)
}
$qaHostIdentity = Get-CimInstance Win32_Process -Filter 'ProcessId = ${approval.host.pid}' -Property ProcessId,CreationDate,ExecutablePath
if (!(Test-QaHostIdentity $qaHostIdentity)) { throw 'QA host identity mismatch.' }
$qaHostWithCommand = Get-CimInstance Win32_Process -Filter 'ProcessId = ${approval.host.pid}' -Property ProcessId,CreationDate,ExecutablePath,CommandLine
if (!(Test-QaHostIdentity $qaHostWithCommand)) { throw 'QA host identity changed.' }
[pscustomobject]@{
  host = [pscustomobject]@{
    ProcessId = $qaHostWithCommand.ProcessId
    CreationDate = $qaHostWithCommand.CreationDate.ToUniversalTime().ToString('o')
    ExecutablePath = $qaHostWithCommand.ExecutablePath
    CommandLine = $qaHostWithCommand.CommandLine
  }
  listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object {$_.LocalPort -in @(${ports.join(',')})} |
    Select-Object LocalAddress,LocalPort,OwningProcess)
} | ConvertTo-Json -Depth 5 -Compress
`
  try {
    const observation = z
      .object({
        host: z
          .object({
            ProcessId: z.number(),
            CreationDate: QaHostCreationUtcSchema,
            ExecutablePath: z.string(),
            CommandLine: z.string(),
          })
          .strict(),
        listeners: z.array(
          z
            .object({
              LocalAddress: z.string(),
              LocalPort: z.number(),
              OwningProcess: z.number(),
            })
            .strict(),
        ),
      })
      .strict()
      .parse(
        JSON.parse(
          execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 15_000,
            maxBuffer: 128_000,
          }),
        ),
      )
    if (
      observation.host.ProcessId !== approval.host.pid ||
      observation.host.CreationDate !== approval.host.creationDate ||
      observation.host.ExecutablePath.toLowerCase() !==
        approval.host.executablePath.toLowerCase() ||
      digest(observation.host.CommandLine) !== approval.host.commandLineSha256 ||
      !ports.every((port) =>
        observation.listeners.some(
          (listener) =>
            listener.LocalPort === port &&
            listener.OwningProcess === approval.host.pid &&
            listener.LocalAddress === '127.0.0.1',
        ),
      )
    )
      throw new Error('Host divergente.')
  } catch {
    // Never expose command lines, environment, subprocess stderr or arbitrary JSON.
    throw new Error('O host QA não corresponde ao witness aprovado.')
  }
}
async function resolveQaHost(options: QaPythonHostOptions) {
  if (options.hostProfile !== 'approved-final') {
    const captured = { ...options }
    return {
      hostProfile: parseQaPythonHostProfile(captured.hostProfile),
      profile: qaPythonHostProfile(captured.hostProfile),
      expectedProviderOrigin: expectedQaProviderOrigin(captured),
      approval: undefined,
      options: captured,
    }
  }
  // Copy caller primitives before the first await; no mutable options are consulted later.
  const { approvalDirectory, approvalSha256 } = options
  if (!approvalDirectory || !/^[a-f0-9]{64}$/.test(approvalSha256))
    throw new Error('Diretório/SHA de aprovação QA são obrigatórios.')
  const directory = await configLocation(approvalDirectory)
  if ((await realpath(directory)) !== directory)
    throw new Error('Aprovação QA fora do diretório canônico.')
  const bytes = await boundedFile(resolve(directory, 'approval.json'), directory)
  if (digest(bytes) !== approvalSha256) throw new Error('A aprovação final QA mudou.')
  const value = ApprovedQaHostSchema.parse(JSON.parse(bytes))
  const cache = await realpath(resolve(root, '.cache/studio-python-l0'))
  if (
    !isAbsolute(value.distributionDirectory) ||
    !value.distributionDirectory.startsWith(cache + sep) ||
    (await realpath(value.distributionDirectory)) !== value.distributionDirectory ||
    basename(value.distributionDirectory) !== value.distributionSha256 ||
    !isAbsolute(value.host.executablePath)
  )
    throw new Error('A distribuição/host final deve usar caminhos canônicos aprovados.')
  requireLoopbackOrigin(value.controlOrigin)
  requireLoopbackOrigin(value.providerOrigin)
  if (value.controlOrigin === value.providerOrigin)
    throw new Error('Controle/provider devem ser distintos.')
  Object.freeze(value.host)
  Object.freeze(value)
  verifyApprovedHost(value)
  return {
    hostProfile: 'approved-final' as const,
    profile: {
      distributionSha256: value.distributionSha256,
      releaseManifestSha256: value.releaseManifestSha256,
      controlOrigin: value.controlOrigin,
      requiresProviderOrigin: true,
      distributionDirectory: dirname(value.distributionDirectory),
    },
    expectedProviderOrigin: value.providerOrigin,
    approval: { directory, sha256: approvalSha256, value },
    options: {
      hostProfile: 'approved-final' as const,
      approvalDirectory: directory,
      approvalSha256,
    },
  }
}
type QaHostContext = Awaited<ReturnType<typeof resolveQaHost>>
function verifyHostContext(context: QaHostContext) {
  if (context.approval) verifyApprovedHost(context.approval.value)
}

/** The production verifier checks the canonical manifest, release and provided modules. */
export async function verifyQaPythonMetadata(
  distributionValue: unknown,
  configurationValue: unknown,
  options: QaPythonHostOptions = {},
) {
  const context = await resolveQaHost(options)
  const result = await verifyQaPythonMetadataWithContext(
    distributionValue,
    configurationValue,
    context,
  )
  verifyHostContext(context)
  return result
}
async function verifyQaPythonMetadataWithContext(
  distributionValue: unknown,
  configurationValue: unknown,
  context: QaHostContext,
) {
  const { profile, expectedProviderOrigin } = context
  const wire = plain(distributionValue),
    configuration = plain(configurationValue)
  const verified = await verifyStudioPythonDeployment({
    release: wire.release,
    distribution: wire.manifest,
  })
  if (
    wire.hash !== profile.distributionSha256 ||
    verified.distributionSha256 !== profile.distributionSha256 ||
    verified.release.manifestSha256 !== profile.releaseManifestSha256 ||
    // Historical profiles keep their fixed identity. Approved-final already binds the
    // complete canonical manifest (including profile/release IDs) by its reviewed SHA.
    (!context.approval &&
      (verified.release.profileId !== 'python-probe' ||
        verified.release.releaseId !== 'probe-1')) ||
    wire.storagePrefix !== studioPythonRuntimePrefix(verified.release.manifestSha256)
  )
    throw new Error('A distribuição/release de QA não corresponde ao perfil aprovado.')
  if (
    context.approval &&
    (verified.distribution.previewHostAudioVersion !== 1 ||
      !verified.release.manifest.python?.providedModules?.some(
        (module) =>
          module.descriptor.importName === 'sz_audio' && module.descriptor.version === '1.0.0',
      ))
  )
    throw new Error(
      'A composição final QA exige host áudio1 e sz_audio1.0.0 aprovados pela release.',
    )
  const runtime = {
    profileId: verified.release.profileId,
    releaseId: verified.release.releaseId,
    manifestSha256: verified.release.manifestSha256,
  }
  if (canonicalJson(configuration.runtime) !== canonicalJson(runtime))
    throw new Error('A configuração e a distribuição de QA divergem.')
  if (typeof configuration.providerFrameURL !== 'string')
    throw new Error('O frame de QA está ausente.')
  const frame = new URL(configuration.providerFrameURL)
  if (
    frame.protocol !== 'http:' ||
    frame.hostname !== '127.0.0.1' ||
    !frame.port ||
    frame.username ||
    frame.password ||
    frame.search ||
    frame.hash ||
    frame.pathname !== `${studioPythonRuntimeRoute(runtime.manifestSha256)}frame.html` ||
    (expectedProviderOrigin !== undefined && frame.origin !== expectedProviderOrigin)
  )
    throw new Error('O frame de QA precisa ser loopback e da release exata.')
  return { verified, runtime, frameOrigin: frame.origin }
}

async function configLocation(input: string | undefined) {
  if (!input) throw new Error('STUDIO_QA_PYTHON_CONFIG_DIRECTORY explícito é obrigatório.')
  const cache = await realpath(resolve(root, '.cache/studio-python-l0'))
  const location = resolve(input),
    parent = await realpath(dirname(location))
  if (
    !parent.startsWith(cache + sep) ||
    parent !== dirname(location) ||
    relative(cache, location).split(sep).includes('real-public-qa') ||
    !location.startsWith(cache + sep)
  )
    throw new Error('A saída deve permanecer em uma pasta QA nova, fora de real-public-qa.')
  return location
}
async function boundedFile(path: string, directory: string) {
  if ((await realpath(path)) !== path || dirname(path) !== directory)
    throw new Error('Arquivo QA não pode escapar por symlink.')
  const info = await stat(path)
  if (!info.isFile() || info.size > 4_000_000) throw new Error('Configuração QA excede o limite.')
  return readFile(path, 'utf8')
}

/** Capture once, before PostgreSQL or application startup. A partial output is not readable. */
export async function readQaPythonPolicyDirectory(
  input: string | undefined,
  options: QaPythonHostOptions = {},
) {
  const context = await resolveQaHost(options)
  const { hostProfile, expectedProviderOrigin } = context
  const directory = await configLocation(input)
  if ((await realpath(directory)) !== directory) throw new Error('Diretório QA deve ser canônico.')
  const [policyJson, hostsJson, receiptJson] = await Promise.all([
    boundedFile(resolve(directory, 'policy.json'), directory),
    boundedFile(resolve(directory, 'hosts.json'), directory),
    boundedFile(resolve(directory, 'verification.json'), directory),
  ])
  const receipt = plain(JSON.parse(receiptJson))
  if (
    receipt.version !== 1 ||
    receipt.state !== 'verified' ||
    receipt.policySha256 !== digest(policyJson) ||
    receipt.hostsSha256 !== digest(hostsJson)
  )
    throw new Error('A configuração QA está incompleta ou seus hashes mudaram.')
  if (
    (receipt.hostProfile !== undefined && receipt.hostProfile !== hostProfile) ||
    (hostProfile !== 'historical-19de' && receipt.hostProfile !== hostProfile)
  )
    throw new Error('O marcador QA não corresponde ao perfil de host solicitado.')
  if (
    receipt.expectedProviderOrigin !== undefined &&
    receipt.expectedProviderOrigin !== expectedProviderOrigin
  )
    throw new Error('O marcador QA diverge do pin provider do caller.')
  if (
    context.approval &&
    (receipt.approvalSha256 !== context.approval.sha256 ||
      receipt.approvalDirectory !== context.approval.directory)
  )
    throw new Error('O marcador não está ligado à aprovação final solicitada.')
  const metadata = await verifyQaPythonMetadataWithContext(
    receipt.distribution,
    receipt.configuration,
    context,
  )
  const policy = StudioAuthoringCatalogSchema.parse(JSON.parse(policyJson))
  await createStudioAuthoringPolicy(policy)
  const hosts: unknown = JSON.parse(hostsJson)
  createStudioRuntimeHosts(policy.catalog, hosts)
  if (
    policy.catalog.releases.length !== 1 ||
    canonicalJson(policy.catalog.releases[0]) !== canonicalJson(metadata.verified.release) ||
    canonicalJson(hosts) !==
      canonicalJson([{ runtime: metadata.runtime, origin: metadata.frameOrigin }]) ||
    receipt.verifiedArtifactCount !== metadata.verified.distribution.files.length ||
    receipt.servedLogicalArtifactCount !==
      studioPythonLogicalFiles(metadata.verified.distribution).length
  )
    throw new Error('A política/host de QA não corresponde à distribuição verificada.')
  verifyHostContext(context)
  return {
    directory,
    hostProfile,
    policyJson,
    hostsJson,
    policy,
    runtime: metadata.runtime,
    origin: metadata.frameOrigin,
    hashes: {
      policy: digest(policyJson),
      hosts: digest(hostsJson),
      verification: digest(receiptJson),
      distribution: metadata.verified.distributionSha256,
    },
  }
}

async function responseBytes(url: URL, maximum: number) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
  if (!response.ok || !response.body) throw new Error('Um artefato de QA não respondeu.')
  const reader = response.body.getReader(),
    parts: Uint8Array[] = []
  let total = 0
  const failures: unknown[] = []
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      total += part.value.byteLength
      if (total > maximum) throw new Error('A resposta de QA excede os bytes esperados.')
      parts.push(part.value)
    }
  } catch (error) {
    failures.push(error)
  }
  try {
    await reader.cancel()
  } catch (error) {
    failures.push(error)
  }
  try {
    reader.releaseLock()
  } catch (error) {
    failures.push(error)
  }
  if (failures.length)
    throw failures.length === 1
      ? failures[0]
      : new AggregateError(failures, 'QA fetch/cleanup failed')
  return Buffer.concat(parts)
}

export async function createQaPythonPolicy(
  input: string | undefined,
  options: QaPythonHostOptions = {},
) {
  const context = await resolveQaHost(options)
  const { hostProfile, profile, expectedProviderOrigin } = context
  const output = await configLocation(input)
  // Exclusive directory claim; preserve partial failures. Only the final marker admits a read.
  await mkdir(output)
  const probe = new URL(process.env.STUDIO_QA_PROBE_URL ?? profile.controlOrigin)
  if (probe.href !== `${profile.controlOrigin}/`)
    throw new Error('A configuração de QA exige a origem de controle aprovada pelo perfil.')
  const json = async (path: string) =>
    JSON.parse((await responseBytes(new URL(path, probe), 4_000_000)).toString('utf8'))
  const distribution: unknown = await json('/distribution'),
    configuration: unknown = await json('/configuration')
  const { verified, runtime, frameOrigin } = await verifyQaPythonMetadataWithContext(
    distribution,
    configuration,
    context,
  )
  // Transport artifacts are intentionally not public URLs. Verify all pinned local bytes,
  // then every served logical artifact; do not bypass the production _http denial.
  const distributionDirectory = await realpath(
    resolve(root, profile.distributionDirectory, profile.distributionSha256),
  )
  for (const file of verified.distribution.files) {
    const path = resolve(distributionDirectory, file.path)
    if (!path.startsWith(distributionDirectory + sep) || (await realpath(path)) !== path)
      throw new Error('Artefato local de QA escapou do diretório aprovado.')
    const bytes = await readFile(path)
    if (bytes.byteLength !== file.bytes || digest(bytes) !== file.sha256)
      throw new Error(`Artefato local de QA divergente: ${file.path}`)
  }
  for (const file of studioPythonLogicalFiles(verified.distribution)) {
    const bytes = await responseBytes(
      new URL(`${studioPythonRuntimeRoute(runtime.manifestSha256)}${file.path}`, frameOrigin),
      file.bytes,
    )
    if (bytes.byteLength !== file.bytes || digest(bytes) !== file.sha256)
      throw new Error(`Artefato de QA divergente: ${file.path}`)
  }
  const codecs = [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS]
  const policy = StudioAuthoringCatalogSchema.parse({
    version: 1,
    catalog: {
      releases: [verified.release],
      profiles: [
        {
          id: runtime.profileId,
          languages: ['python'],
          kinds: ['classic', 'pro'],
          modes: ['blocks', 'bridge', 'code'],
          levels: [],
          releases: [{ id: runtime.releaseId, manifestSha256: runtime.manifestSha256 }],
        },
      ],
    },
    releases: [
      {
        runtime,
        status: 'active',
        proTemplateIds: ['python-blank'],
        blockIds: codecs.map(({ id }) => id),
        categoryIds: [...new Set(codecs.map(({ category }) => category))],
      },
    ],
  })
  await createStudioAuthoringPolicy(policy)
  const hosts = [{ runtime, origin: frameOrigin }]
  createStudioRuntimeHosts(policy.catalog, hosts)
  const policyJson = JSON.stringify(policy),
    hostsJson = JSON.stringify(hosts)
  verifyHostContext(context)
  await writeFile(resolve(output, 'policy.json'), policyJson, { flag: 'wx' })
  await writeFile(resolve(output, 'hosts.json'), hostsJson, { flag: 'wx' })
  await writeFile(
    resolve(output, 'verification.json'),
    JSON.stringify({
      version: 1,
      state: 'verified',
      hostProfile,
      expectedProviderOrigin,
      ...(context.approval
        ? {
            approvalDirectory: context.approval.directory,
            approvalSha256: context.approval.sha256,
          }
        : {}),
      distribution,
      configuration,
      verifiedArtifactCount: verified.distribution.files.length,
      servedLogicalArtifactCount: studioPythonLogicalFiles(verified.distribution).length,
      policySha256: digest(policyJson),
      hostsSha256: digest(hostsJson),
    }),
    { flag: 'wx' },
  )
  return readQaPythonPolicyDirectory(output, context.options)
}
if (import.meta.main) {
  const config = await createQaPythonPolicy(
    process.env.STUDIO_QA_PYTHON_CONFIG_DIRECTORY,
    qaPythonHostOptionsFromEnvironment(
      process.env.STUDIO_QA_PYTHON_HOST_PROFILE,
      process.env.STUDIO_QA_PYTHON_PROVIDER_ORIGIN,
      process.env.STUDIO_QA_PYTHON_APPROVAL_DIRECTORY,
      process.env.STUDIO_QA_PYTHON_APPROVAL_SHA256,
    ),
  )
  console.log(
    JSON.stringify({ directory: config.directory, runtime: config.runtime, hashes: config.hashes }),
  )
}
