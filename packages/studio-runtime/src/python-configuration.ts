import { StudioPythonRuntimeConfigurationSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { createPythonDistributionRegistry } from './python-distributions'

export const PYTHON_CONFIGURATION_MAX_BYTES = 2_000_000

/** Parsing does not activate anything stored in R2: approval exists only in host configuration. */
export async function createConfiguredPythonRuntime(configuration: string) {
  if (new TextEncoder().encode(configuration).byteLength > PYTHON_CONFIGURATION_MAX_BYTES)
    throw new Error('A configuração Python excede o limite.')
  const captured = StudioPythonRuntimeConfigurationSchema.parse(JSON.parse(configuration))
  const statuses = new Map(
    captured.deployments.map(({ deployment, status }) => [
      deployment.release.manifestSha256,
      status,
    ]),
  )
  return createPythonDistributionRegistry({
    approvedDeployments: captured.deployments.map((item) => item.deployment),
    parentOrigins: captured.parentOrigins,
    status: (hash) => statuses.get(hash),
  })
}

export async function createConfiguredPythonDistributions(configuration: string) {
  return (await createConfiguredPythonRuntime(configuration)).serve
}
