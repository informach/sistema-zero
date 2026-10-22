#!/usr/bin/env -S bun --no-env-file
import './preflight.mjs'
/**
 * Prepara o Studio Python LOCAL a partir da distribuição da candidata atual, sem nada
 * hospedado:
 *
 *  1. Lê um plano canônico já gerado pelo promotor (offline, versionado no repo):
 *     `deployment` (release + distribuição) e `configuration.members` (a política de autoria).
 *     Padrão: docs/superpowers/plans/2026-10-22-python-current-candidate/canonical-plan.json.
 *     A distribuição padrão é a cópia em .cache/studio-python-runtime/distributions
 *     com o SHA fixado no plano;
 *     `--distribution <dir>` a substitui.
 *     `--plan <arquivo>` escolhe outro plano validado com o contrato atual.
 *  2. Gera a config do Worker @sistemazero/studio-runtime para `wrangler dev --local`
 *     (.cache/local-stack/studio-runtime/wrangler.jsonc): mesmos bindings R2/DO, SEM contêiner
 *     e SEM cron; origens de app = localhost.
 *  3. Grava no R2 LOCAL (persistido em .cache/local-stack/wrangler) a distribuição e a config
 *     do runtime com os MESMOS helpers do Worker (`storePythonRuntimeDistribution`, que confere
 *     o SHA-256 de cada arquivo, e `storePythonRuntimeConfiguration`).
 *  4. Escreve .cache/local-stack/studio-env.json, lido por lib.ts: política de autoria e hosts
 *     no Members, STUDIO_PYTHON_FRAME_ORIGINS nos três apps.
 *
 *   bun --no-env-file scripts/local-studio-stack/python-local.ts [--distribution <dir>] [--plan <arquivo>]
 */
import fs from 'node:fs'
import { join } from 'node:path'
import { ensureSecrets, ROOT, STACK_DIR, STUDIO_ENV_FILE } from './lib'
import { option, RUNTIME_ORIGIN, readLocalPythonInput } from './python-input'

export const RUNTIME_PORT = 8791
export { RUNTIME_ORIGIN } from './python-input'
export const RUNTIME_DIR = join(STACK_DIR, 'studio-runtime')
export const RUNTIME_PERSIST = join(STACK_DIR, 'wrangler')

/** Buckets locais dos apps: UGC (criações) e privado (snapshots do /jogar). */
const APP_BUCKETS = {
  LOCAL_UGC: 'sz-local-ugc',
  LOCAL_PRIVATE: 'sz-local-private',
}
const APP_ORIGINS = [3005, 3007, 3008].flatMap((p) => [
  `http://localhost:${p}`,
  `http://127.0.0.1:${p}`,
])

if (import.meta.main) {
  const { deployment, distribution, members, runtime } = await readLocalPythonInput({
    planFile: option('--plan'),
    distribution: option('--distribution'),
  })
  const secrets = ensureSecrets()

  const s3Credentials = {
    accessKeyId: secrets.R2_LOCAL_ACCESS_KEY_ID,
    secretAccessKey: secrets.R2_LOCAL_SECRET_ACCESS_KEY,
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
    r2_buckets: [
      ...['PRO_ARTIFACTS', 'PYTHON_INPUTS', 'PYTHON_PREVIEWS'].map((binding) => ({
        binding,
        bucket_name: 'sistemazero-studio-artifacts-local',
      })),
      // Buckets dos apps (criações, snapshots publicados, capas) servidos pelo endpoint S3
      // local do Miniflare em /cdn-cgi/local/r2/s3/<bucket> (SigV4 + URLs pré-assinadas,
      // CORS aberto). O Worker não usa estes bindings; eles só existem para o endpoint.
      ...Object.entries(APP_BUCKETS).map(([binding, bucket_name]) => ({
        binding,
        bucket_name,
        local_dev: { experimental_s3_credentials: s3Credentials },
      })),
    ],
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

  // Adulto e Kids: R2 local (R2_S3_ENDPOINT aceita HTTP só em loopback) e o Worker para
  // publicar/resolver projetos Python e Pro. A origem do Worker já está nas origens de frame,
  // então o CSP connect-src libera os PUT/GET pré-assinados do navegador.
  const memberApp = {
    STUDIO_PYTHON_FRAME_ORIGINS: JSON.stringify([RUNTIME_ORIGIN]),
    STUDIO_PRO_RUNTIME_URL: RUNTIME_ORIGIN,
    STUDIO_PRO_RUNTIME_TOKEN: secrets.STUDIO_PRO_RUNTIME_TOKEN,
    R2_ACCOUNT_ID: 'local',
    R2_ACCESS_KEY_ID: s3Credentials.accessKeyId,
    R2_SECRET_ACCESS_KEY: s3Credentials.secretAccessKey,
    R2_S3_ENDPOINT: `${RUNTIME_ORIGIN}/cdn-cgi/local/r2/s3`,
    R2_UGC_BUCKET: APP_BUCKETS.LOCAL_UGC,
    R2_PRIVATE_BUCKET: APP_BUCKETS.LOCAL_PRIVATE,
    // Sem R2_BUCKET/R2_PUBLIC_URL: a capa do Mural é opcional e o hub só aceita capa em
    // https:// (o endpoint público local é http). Sem bucket público a capa fica de fora.
  }
  const studioEnv = {
    members: {
      STUDIO_AUTHORING_POLICY_JSON: JSON.stringify(members),
      STUDIO_RUNTIME_HOSTS_JSON: JSON.stringify([{ runtime, origin: RUNTIME_ORIGIN }]),
    },
    admin: { STUDIO_PYTHON_FRAME_ORIGINS: JSON.stringify([RUNTIME_ORIGIN]) },
    community: memberApp,
    kids: memberApp,
  }
  fs.writeFileSync(STUDIO_ENV_FILE, `${JSON.stringify(studioEnv, null, 2)}\n`)
  console.log(`✓ distribuição ${runtime.manifestSha256} e config ${descriptor.sha256} no R2 local`)
  console.log(`✓ ${configPath}`)
  console.log(`✓ ${STUDIO_ENV_FILE} (reinicie members/admin/community/kids)`)
}
