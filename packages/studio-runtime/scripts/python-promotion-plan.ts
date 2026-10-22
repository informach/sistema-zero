import { resolve } from 'node:path'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioAuthoringCatalogSchema } from '@sistemazero/core/studio/authoring-catalog'
import {
  StudioCatalogIdSchema,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
} from '@sistemazero/core/studio/project-environment'
import {
  StudioPythonRuntimeConfigurationSchema,
  studioPythonRuntimePrefix,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import {
  createStudioRuntimeRelease,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import { studioPythonCspOrigins } from '@sistemazero/core/studio/runtime-csp'
import { z } from 'zod'
import { createStudioAuthoringPolicy } from '../../members/src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { PYTHON_PROGRAMMING_CODECS } from '../../studio/src/python/blocks/catalog'
import { describePythonCatalog } from '../../studio/src/python/blocks/selection'
import { PYTHON_TURTLE_CODECS } from '../../studio/src/python/extensions/turtle/catalog'
import { TURTLE_EXTENSION } from '../../studio/src/runtime/python/turtle/contract'
import { createConfiguredPythonRuntime } from '../src/python-configuration'
import { describePythonRuntimeConfiguration } from '../src/python-configuration-storage'
import { verifyPythonDistributionFiles } from './python-distribution-files'

export { readPromotionFile } from './python-distribution-files'

const origin = z.string().refine((value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value && !url.username && !url.password
  } catch {
    return false
  }
}, 'Informe uma origem HTTPS exata, sem caminho ou credenciais.')
const origins = z
  .array(origin)
  .max(32)
  .refine((values) => new Set(values).size === values.length)
const permanentId = StudioCatalogIdSchema.refine(
  (value) => !/(?:^|[._-])(?:qa|probe|fixture|verify|test)(?:$|[._-])/.test(value),
  'A promoção exige uma identidade permanente, sem perfil de QA.',
)
const configurationSchema = z.strictObject({
  worker: StudioPythonRuntimeConfigurationSchema.nullable(),
  members: StudioAuthoringCatalogSchema.nullable(),
  hosts: z.array(z.strictObject({ runtime: StudioRuntimeSelectionSchema, origin })).max(1024),
  previewOrigin: origin.nullable(),
  frameOrigins: z.strictObject({ admin: origins, community: origins, 'community-kids': origins }),
})

/** Public deployment data only; secrets and arbitrary environment variables are rejected. */
export const PythonPromotionInputSchema = z
  .strictObject({
    version: z.literal(1),
    environment: z.enum(['staging', 'production']),
    target: z.strictObject({
      accountId: z.string().regex(/^[a-f0-9]{32}$/),
      bucketName: z.enum(['sistemazero-studio-artifacts-staging', 'sistemazero-studio-artifacts']),
      runtimeOrigin: origin,
      parentOrigins: origins.refine((values) => values.length > 0),
    }),
    distribution: z.strictObject({ directory: z.string().min(1), sha256: StudioSha256Schema }),
    release: z.strictObject({
      profileId: permanentId,
      releaseId: permanentId,
      capabilities: z
        .array(
          z.enum(['edit', 'execute', 'pause', 'publish', 'export-source', 'python-repl', 'assist']),
        )
        .min(3)
        .max(7)
        .refine(
          (values) =>
            new Set(values).size === values.length &&
            ['edit', 'execute', 'export-source'].every((value) =>
              values.some((item) => item === value),
            ),
        ),
    }),
    baseline: configurationSchema,
  })
  .refine(
    ({ environment, target }) =>
      target.bucketName ===
      (environment === 'staging'
        ? 'sistemazero-studio-artifacts-staging'
        : 'sistemazero-studio-artifacts'),
    {
      path: ['target', 'bucketName'],
      message: 'O bucket deve corresponder ao ambiente informado.',
    },
  )
export type PythonPromotionInput = z.infer<typeof PythonPromotionInputSchema>

const same = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right)
const union = <T>(previous: readonly T[], added: readonly T[]) => [
  ...new Set([...previous, ...added]),
]

async function validateConfiguration(configuration: z.infer<typeof configurationSchema>) {
  if (
    Buffer.byteLength(canonicalJson(configuration.members)) > 2_000_000 ||
    Buffer.byteLength(canonicalJson(configuration.hosts)) > 200_000
  )
    throw new Error('A configuração excede os limites de implantação do Members.')
  if (configuration.worker) await createConfiguredPythonRuntime(canonicalJson(configuration.worker))
  if (configuration.members) {
    await createStudioAuthoringPolicy(configuration.members)
    createStudioRuntimeHosts(configuration.members.catalog, configuration.hosts)
  } else if (configuration.hosts.length)
    throw new Error('Hosts exigem um catálogo Members anterior.')
  for (const values of Object.values(configuration.frameOrigins))
    studioPythonCspOrigins(canonicalJson(values), false)
  for (const { deployment, status } of configuration.worker?.deployments ?? []) {
    const member = configuration.members?.catalog.releases.find(
      (release) =>
        release.profileId === deployment.release.profileId &&
        release.releaseId === deployment.release.releaseId,
    )
    if (member && !same(member, deployment.release))
      throw new Error('A identidade anterior diverge entre Worker e Members.')
    const policy = configuration.members?.releases.find(
      ({ runtime }) => runtime.manifestSha256 === deployment.release.manifestSha256,
    )
    if (policy && policy.status !== status)
      throw new Error('Os estados anteriores da release divergem.')
  }
}

/** Entirely offline. Reads a prebuilt artifact; never builds, downloads, uploads or activates. */
export async function preparePythonPromotion(raw: unknown, baseDirectory = process.cwd()) {
  const input = PythonPromotionInputSchema.parse(raw)
  input.distribution.directory = resolve(baseDirectory, input.distribution.directory)
  if (input.target.parentOrigins.includes(input.target.runtimeOrigin))
    throw new Error('O runtime deve ter uma origem distinta dos aplicativos.')
  if (input.baseline.previewOrigin && input.baseline.previewOrigin !== input.target.runtimeOrigin)
    throw new Error('A promoção não troca a origem de previews existente.')
  await validateConfiguration(input.baseline)
  const distribution = await verifyPythonDistributionFiles(
    input.distribution.directory,
    input.distribution.sha256,
  )
  const release = StudioRuntimeReleaseSchema.parse(
    await createStudioRuntimeRelease({
      manifestVersion: 1,
      ...input.release,
      programmingLanguage: 'python',
      kinds: ['classic', 'pro'],
      modes: ['blocks', 'bridge', 'code'],
      extensions: [{ id: TURTLE_EXTENSION.id, versions: [TURTLE_EXTENSION.version] }],
      sourceTargets: ['browser', 'desktop'],
      requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
      artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
      python: {
        version: distribution.pythonVersion,
        packages: [],
        providedModules: distribution.providedModules,
        features: distribution.features,
      },
    }),
  )
  const deployment = { release, distribution }
  const verified = await verifyStudioPythonDeployment(deployment)
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const members = input.baseline.members
    ? structuredClone(input.baseline.members)
    : {
        version: 1 as const,
        catalog: { profiles: [], releases: [] },
        releases: [],
      }
  const worker = input.baseline.worker
    ? structuredClone(input.baseline.worker)
    : {
        version: 1 as const,
        parentOrigins: [],
        deployments: [],
      }
  const existingRelease = members.catalog.releases.find(
    (candidate) =>
      candidate.profileId === release.profileId && candidate.releaseId === release.releaseId,
  )
  const existingDeployment = worker.deployments.find(
    ({ deployment: candidate }) =>
      candidate.release.profileId === release.profileId &&
      candidate.release.releaseId === release.releaseId,
  )
  if (
    (existingRelease && !same(existingRelease, release)) ||
    (existingDeployment && !same(existingDeployment.deployment, deployment))
  )
    throw new Error('A identidade permanente já aponta para outro conteúdo.')
  const existingPolicy = members.releases.find(
    (entry) => entry.runtime.manifestSha256 === release.manifestSha256,
  )
  const status = existingPolicy?.status ?? existingDeployment?.status ?? 'active'
  // Approval follows these immutable bytes, not every codec in the current editor.
  const codecs = [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS].filter((codec) =>
    (codec.requiredRuntimeFeatures ?? []).every((feature) =>
      distribution.features.includes(feature),
    ),
  )
  const catalog = describePythonCatalog(codecs)
  const policy = {
    runtime,
    status,
    proTemplateIds: ['python-blank'],
    blockIds: catalog.map(({ id }) => id).sort(),
    categoryIds: [...new Set(catalog.flatMap(({ path }) => path.slice(1)))].sort(),
  }
  if (existingPolicy && !same(existingPolicy, policy))
    throw new Error('A curadoria existente da release é diferente.')
  if (!existingRelease) members.catalog.releases.push(release)
  if (!existingPolicy) members.releases.push(policy)
  const profile = members.catalog.profiles.find(({ id }) => id === release.profileId)
  if (profile) {
    if (!same(profile.languages, ['python']))
      throw new Error('O perfil permanente pertence a outra linguagem.')
    profile.kinds = union(profile.kinds, release.manifest.kinds)
    profile.modes = union(profile.modes, release.manifest.modes)
    if (!profile.releases.some(({ id }) => id === release.releaseId))
      profile.releases.push({ id: release.releaseId, manifestSha256: release.manifestSha256 })
  } else
    members.catalog.profiles.push({
      id: release.profileId,
      languages: ['python'],
      kinds: release.manifest.kinds,
      modes: release.manifest.modes,
      levels: [],
      releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
    })
  if (!existingDeployment) worker.deployments.push({ status, deployment })
  worker.parentOrigins = union(worker.parentOrigins, input.target.parentOrigins)
  const hosts = structuredClone(input.baseline.hosts)
  const host = hosts.find((entry) => entry.runtime.manifestSha256 === release.manifestSha256)
  if (host && host.origin !== input.target.runtimeOrigin)
    throw new Error('O host anterior da release é diferente.')
  if (!host) hosts.push({ runtime, origin: input.target.runtimeOrigin })
  const frameOrigins = {
    admin: union(input.baseline.frameOrigins.admin, [input.target.runtimeOrigin]),
    community: union(input.baseline.frameOrigins.community, [input.target.runtimeOrigin]),
    'community-kids': union(input.baseline.frameOrigins['community-kids'], [
      input.target.runtimeOrigin,
    ]),
  }
  const configuration = {
    worker,
    members,
    hosts,
    previewOrigin: input.target.runtimeOrigin,
    frameOrigins,
  }
  await validateConfiguration(configuration)
  const workerCatalog = await describePythonRuntimeConfiguration(worker)
  const workerBindings = {
    STUDIO_PYTHON_DISTRIBUTIONS_SHA256: workerCatalog.sha256,
    STUDIO_PYTHON_PREVIEW_ORIGIN: configuration.previewOrigin,
  }
  if (Object.values(workerBindings).some((value) => Buffer.byteLength(value) > 5000))
    throw new Error('Uma variável do Worker excede o limite operacional de 5KB.')
  const body = {
    kind: 'studio.python.runtime-promotion' as const,
    version: 1 as const,
    input,
    baselineSha256: await sha256Hex(canonicalJson(input.baseline)),
    configuration,
    workerCatalog,
    workerBindings,
    configurationSha256: await sha256Hex(canonicalJson(configuration)),
    deployment,
    prefix: studioPythonRuntimePrefix(release.manifestSha256),
    markerSha256: verified.markerSha256,
    authoringCatalogSha256: await sha256Hex(canonicalJson(catalog)),
    defaults: { programmingLanguage: 'javascript' as const, installedExtensions: [] },
  }
  return { ...body, planSha256: await sha256Hex(canonicalJson(body)) }
}
export type PythonPromotionPlan = Awaited<ReturnType<typeof preparePythonPromotion>>

/** Recompute every derived field and re-read files before any remote connection is created. */
export async function verifyPythonPromotionPlan(raw: unknown, expectedSha256: string) {
  const envelope = z
    .object({ input: PythonPromotionInputSchema, planSha256: StudioSha256Schema })
    .parse(raw)
  StudioSha256Schema.parse(expectedSha256)
  if (envelope.planSha256 !== expectedSha256) throw new Error('SHA do plano diferente do esperado.')
  const prepared = await preparePythonPromotion(envelope.input)
  if (prepared.planSha256 !== expectedSha256 || !same(raw, prepared))
    throw new Error('O plano foi alterado ou não corresponde ao catálogo e artefatos atuais.')
  return prepared
}
