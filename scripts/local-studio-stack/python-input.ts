import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { StudioAuthoringCatalogSchema } from '../../packages/core/src/studio/authoring-catalog'
import { verifyStudioPythonDeployment } from '../../packages/core/src/studio/python-runtime-distribution'
import { createStudioAuthoringPolicy } from '../../packages/members/src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../packages/members/src/domain/studio/runtime-hosts'
import { verifyPythonDistributionFiles } from '../../packages/studio-runtime/scripts/python-distribution-files'
import { assertLocalStackIsolation, ROOT } from './isolation.mjs'

export const DEFAULT_PLAN_RELATIVE =
  'docs/superpowers/plans/2026-10-22-python-current-candidate/canonical-plan.json'
export const RUNTIME_ORIGIN = 'http://127.0.0.1:8791'

export function option(name: string, args = process.argv.slice(2)) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`Informe um valor para ${name}.`)
  return value
}

/** Offline preflight: validate all inputs before secrets, config, database or local R2 effects. */
export async function readLocalPythonInput(
  options: { root?: string; planFile?: string; distribution?: string } = {},
) {
  const root = resolve(options.root ?? ROOT)
  assertLocalStackIsolation({ root })
  const planFile = resolve(options.planFile ?? join(root, DEFAULT_PLAN_RELATIVE))
  let raw: {
    deployment?: unknown
    input?: { distribution?: { sha256?: unknown } }
    configuration?: { members?: unknown }
  }
  try {
    const text = fs.readFileSync(planFile, 'utf8')
    raw = JSON.parse(text)
  } catch {
    throw new Error(
      `Plano Python local ausente ou inválido: ${planFile}. Informe --plan <arquivo>.`,
    )
  }
  const deployment = await verifyStudioPythonDeployment(raw.deployment)
  if (raw.input?.distribution?.sha256 !== deployment.distributionSha256)
    throw new Error('O SHA da distribuição no plano não corresponde ao deployment.')
  const members = StudioAuthoringCatalogSchema.parse(raw.configuration?.members)
  await createStudioAuthoringPolicy(members)
  const runtime = {
    profileId: deployment.release.profileId,
    releaseId: deployment.release.releaseId,
    manifestSha256: deployment.release.manifestSha256,
  }
  createStudioRuntimeHosts(members.catalog, [{ runtime, origin: RUNTIME_ORIGIN }])
  const distribution = resolve(
    options.distribution ??
      join(root, '.cache/studio-python-runtime/distributions', deployment.distributionSha256),
  )
  try {
    await verifyPythonDistributionFiles(distribution, deployment.distributionSha256)
  } catch (error) {
    throw new Error(
      `Distribuição Python local ausente ou inválida em ${distribution}. Use --distribution <diretório verificado> com distribution.json e todos os arquivos do plano.`,
      { cause: error },
    )
  }
  // Local execution uses its own origin and verified artifact directory.
  return {
    planFile,
    distribution,
    deployment: { release: deployment.release, distribution: deployment.distribution },
    members,
    runtime,
  }
}
