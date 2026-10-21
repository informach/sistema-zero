#!/usr/bin/env bun
/**
 * Prepara o Studio Python LOCAL a partir da distribuição aprovada (a8a6c625…), sem nada
 * hospedado:
 *
 *  1. Lê um plano canônico já gerado pelo promotor (offline, versionado no repo):
 *     `deployment` (release + distribuição) e `configuration.members` (a política de autoria).
 *     Padrão: a candidata `python-browser/2026-10-21-audio-2` (mesma distribuição a8a6, com as
 *     capacidades `publish` e `assist`, exigidas desde 896c3a1c3 para publicar e para o Zappy).
 *     `--plan <arquivo>` escolhe outro (ex.: o piloto audio-1 em
 *     docs/continuity/2026-10-21-studio-python/snapshots/root/0374-canonical-plan.json.snapshot).
 *  2. Gera a config do Worker @sistemazero/studio-runtime para `wrangler dev --local`
 *     (.cache/local-stack/studio-runtime/wrangler.jsonc): mesmos bindings R2/DO, SEM contêiner
 *     e SEM cron; origens de app = localhost.
 *  3. Grava no R2 LOCAL (persistido em .cache/local-stack/wrangler) a distribuição e a config
 *     do runtime com os MESMOS helpers do Worker (`storePythonRuntimeDistribution`, que confere
 *     o SHA-256 de cada arquivo, e `storePythonRuntimeConfiguration`).
 *  4. Escreve .cache/local-stack/studio-env.json, lido por lib.ts: política de autoria e hosts
 *     no Members, STUDIO_PYTHON_FRAME_ORIGINS nos três apps.
 *
 *   bun scripts/local-studio-stack/python-local.ts [--distribution <dir>] [--plan <arquivo>]
 */
import fs from 'node:fs'
import { join } from 'node:path'
import { ensureSecrets, ROOT, STACK_DIR, STUDIO_ENV_FILE } from './lib'

export const RUNTIME_PORT = 8791
export const RUNTIME_ORIGIN = `http://127.0.0.1:${RUNTIME_PORT}`
export const RUNTIME_DIR = join(STACK_DIR, 'studio-runtime')
export const RUNTIME_PERSIST = join(STACK_DIR, 'wrangler')

const DEFAULT_DISTRIBUTION =
  'C:/Users/julio/projects/sistema-zero-studio-python/.cache/studio-python-runtime/distributions-transfer/a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a'
const DEFAULT_PLAN = join(
  ROOT,
  'docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json',
)
const option = (name: string) => {
  const index = process.argv.indexOf(name)
  return index > 0 ? process.argv[index + 1] : undefined
}
const APP_ORIGINS = [3005, 3007, 3008].flatMap((p) => [
  `http://localhost:${p}`,
  `http://127.0.0.1:${p}`,
])

if (import.meta.main) {
  const distribution = option('--distribution') ?? DEFAULT_DISTRIBUTION
  const secrets = ensureSecrets()
  const text = fs.readFileSync(option('--plan') ?? DEFAULT_PLAN, 'utf8')
  const plan = JSON.parse(text.slice(text.indexOf('{')))
  const deployment = plan.deployment
  const runtime = {
    profileId: deployment.release.profileId ?? plan.configuration.hosts[0].runtime.profileId,
    releaseId: deployment.release.releaseId ?? plan.configuration.hosts[0].runtime.releaseId,
    manifestSha256: plan.configuration.hosts[0].runtime.manifestSha256,
  }

  const runtimeSrc = join(ROOT, 'packages/studio-runtime/src')
  const { storePythonRuntimeDistribution } = await import(
    join(runtimeSrc, 'python-distributions.ts')
  )
  const { describePythonRuntimeConfiguration, storePythonRuntimeConfiguration } = await import(
    join(runtimeSrc, 'python-configuration-storage.ts')
  )
  const workerConfiguration = {
    version: 1,
    parentOrigins: APP_ORIGINS,
    deployments: [{ status: 'active', deployment }],
  }
  const descriptor = await describePythonRuntimeConfiguration(workerConfiguration)

  // Config local do Worker: só o que o caminho do navegador precisa (sem contêiner).
  fs.mkdirSync(RUNTIME_DIR, { recursive: true })
  const main = join(ROOT, 'packages/studio-runtime/src/worker.ts').replace(/\\/g, '/')
  const wrangler = {
    name: 'sistemazero-studio-runtime-local',
    main,
    compatibility_date: '2026-07-01',
    compatibility_flags: ['nodejs_compat'],
    r2_buckets: ['PRO_ARTIFACTS', 'PYTHON_INPUTS', 'PYTHON_PREVIEWS'].map((binding) => ({
      binding,
      bucket_name: 'sistemazero-studio-artifacts-local',
    })),
    durable_objects: {
      bindings: [
        { class_name: 'ProBuildSandbox', name: 'ProBuildSandbox' },
        { class_name: 'PythonInspectionJob', name: 'PythonInspectionJobs' },
      ],
    },
    migrations: [
      { new_sqlite_classes: ['ProBuildSandbox'], tag: 'v1' },
      { new_sqlite_classes: ['PythonInspectionJob'], tag: 'v2-python-inspection-jobs' },
    ],
    ratelimits: [
      {
        name: 'PYTHON_UPLOAD_RATE_LIMITER',
        namespace_id: '27003',
        simple: { limit: 120, period: 60 },
      },
      { name: 'BUILD_RATE_LIMITER', namespace_id: '27001', simple: { limit: 10, period: 60 } },
    ],
    vars: {
      STUDIO_PYTHON_DISTRIBUTIONS_SHA256: descriptor.sha256,
      STUDIO_PYTHON_PREVIEW_ORIGIN: RUNTIME_ORIGIN,
      PUBLICATION_AUTHORIZATION_URL: 'http://localhost:3008/api/internal/studio-play',
      PUBLICATION_AUTHORIZATION_ADULT_URL: 'http://localhost:3007/api/internal/studio-play',
      PUBLICATION_CLEANUP_URL: 'http://localhost:3008/api/internal/studio-publication-cleanup',
      PUBLICATION_CLEANUP_ADULT_URL:
        'http://localhost:3007/api/internal/studio-publication-cleanup',
    },
  }
  const configPath = join(RUNTIME_DIR, 'wrangler.jsonc')
  fs.writeFileSync(configPath, `${JSON.stringify(wrangler, null, 2)}\n`)
  fs.writeFileSync(
    join(RUNTIME_DIR, '.dev.vars'),
    `INTERNAL_TOKEN=${secrets.STUDIO_PRO_RUNTIME_TOKEN}\n`,
    {
      mode: 0o600,
    },
  )

  // R2 local pelos helpers do próprio Worker (checksum nativo + gravação condicional).
  const { getPlatformProxy } = await import(
    Bun.resolveSync('wrangler', join(ROOT, 'packages/studio-runtime'))
  )
  const proxy = await getPlatformProxy({
    configPath,
    persist: { path: join(RUNTIME_PERSIST, 'v3') },
  })
  try {
    const bucket = (proxy.env as Record<string, { head(key: string): Promise<unknown> }>)
      .PRO_ARTIFACTS
    // Reexecução: a gravação é imutável; se o marcador e a config já existem, nada a fazer
    // (o caminho de conflito do helper falha pelo proxy local com DataCloneError).
    const stored =
      (await bucket.head(`runtimes/${runtime.manifestSha256}/complete.json`)) &&
      (await bucket.head(descriptor.key))
    if (stored) {
      console.log('• distribuição e config já estavam no R2 local')
    } else {
      await storePythonRuntimeDistribution({
        bucket,
        deployment,
        read: async (path: string) =>
          new Uint8Array(await Bun.file(join(distribution, path)).arrayBuffer()),
      })
      await storePythonRuntimeConfiguration({ bucket, configuration: workerConfiguration })
    }
  } finally {
    await proxy.dispose()
  }

  const studioEnv = {
    members: {
      STUDIO_AUTHORING_POLICY_JSON: JSON.stringify(plan.configuration.members),
      STUDIO_RUNTIME_HOSTS_JSON: JSON.stringify([{ runtime, origin: RUNTIME_ORIGIN }]),
    },
    admin: { STUDIO_PYTHON_FRAME_ORIGINS: JSON.stringify([RUNTIME_ORIGIN]) },
    community: { STUDIO_PYTHON_FRAME_ORIGINS: JSON.stringify([RUNTIME_ORIGIN]) },
    kids: { STUDIO_PYTHON_FRAME_ORIGINS: JSON.stringify([RUNTIME_ORIGIN]) },
  }
  fs.writeFileSync(STUDIO_ENV_FILE, `${JSON.stringify(studioEnv, null, 2)}\n`)
  console.log(`✓ distribuição ${runtime.manifestSha256} e config ${descriptor.sha256} no R2 local`)
  console.log(`✓ ${configPath}`)
  console.log(`✓ ${STUDIO_ENV_FILE} (reinicie members/admin/community/kids)`)
}
