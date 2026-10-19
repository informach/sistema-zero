import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { storePythonRuntimeConfiguration } from '../src/python-configuration-storage'
import {
  type RuntimeDistributionBucket,
  storePythonRuntimeDistribution,
} from '../src/python-distributions'
import { readPromotionFile, verifyPythonPromotionPlan } from './python-promotion-plan'

interface PromotionPlatform {
  env: { PYTHON_RUNTIME: RuntimeDistributionBucket }
  dispose(): Promise<void>
}
type ConnectPromotionPlatform = (configPath: string) => Promise<PromotionPlatform>

/** Imported only by upload. There is no Worker endpoint or S3 checksum translation. */
const connectRemoteR2: ConnectPromotionPlatform = async (configPath) => {
  const { getPlatformProxy } = await import('wrangler')
  return getPlatformProxy<{ PYTHON_RUNTIME: RuntimeDistributionBucket }>({
    configPath,
    remoteBindings: true,
    persist: false,
    envFiles: [],
  })
}

/** The injected connector is the I/O boundary; CLI always uses the native remote binding. */
export async function uploadPythonPromotion(
  raw: unknown,
  expectedSha256: string,
  connect: ConnectPromotionPlatform = connectRemoteR2,
) {
  const plan = await verifyPythonPromotionPlan(raw, expectedSha256)
  const { target } = plan.input
  const directory = await mkdtemp(join(tmpdir(), 'sz-python-runtime-promotion-'))
  const temporaryRoot = `${resolve(tmpdir())}${sep}sz-python-runtime-promotion-`
  if (!resolve(directory).startsWith(temporaryRoot))
    throw new Error('Diretório temporário inesperado.')
  try {
    // A dedicated config cannot inherit application secrets, extra bindings or local R2 state.
    const configPath = join(directory, 'wrangler.json')
    await writeFile(
      configPath,
      canonicalJson({
        name: `sistemazero-python-runtime-promotion-${plan.input.environment}`,
        account_id: target.accountId,
        compatibility_date: '2026-07-01',
        r2_buckets: [{ binding: 'PYTHON_RUNTIME', bucket_name: target.bucketName, remote: true }],
      }),
      { flag: 'wx' },
    )
    const platform = await connect(configPath)
    try {
      const files = new Map(plan.deployment.distribution.files.map((file) => [file.path, file]))
      const stored = await storePythonRuntimeDistribution({
        bucket: platform.env.PYTHON_RUNTIME,
        deployment: plan.deployment,
        read: async (path) => {
          const file = files.get(path)
          if (!file) throw new Error('Arquivo fora da distribuição aprovada.')
          return readPromotionFile(plan.input.distribution.directory, path, file.bytes)
        },
      })
      // Approval is the deployed digest, never this object. Publish only after complete.json.
      const workerCatalog = await storePythonRuntimeConfiguration({
        bucket: platform.env.PYTHON_RUNTIME,
        configuration: plan.configuration.worker,
      })
      if (canonicalJson(workerCatalog) !== canonicalJson(plan.workerCatalog))
        throw new Error('O catálogo armazenado diverge do plano aprovado.')
      return {
        version: 1,
        environment: plan.input.environment,
        bucketName: target.bucketName,
        planSha256: plan.planSha256,
        releaseManifestSha256: stored.release.manifestSha256,
        distributionSha256: stored.distributionSha256,
        markerSha256: stored.markerSha256,
        workerCatalog,
        prefix: plan.prefix,
        files: stored.distribution.files.length,
        bytes: stored.distribution.files.reduce((sum, file) => sum + file.bytes, 0),
      }
    } finally {
      await platform.dispose()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
