import { STUDIO_PRO_REMOTE_PACKAGES } from '@sistemazero/core/studio/pro-dependencies'

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** A specific security repair, never a dependency resolver or a replacement template. */
export function updateLegacyProToolchainManifest(source: string): string | null {
  if (source.length > 16_000)
    throw new Error('O package.json ficou grande demais para preparar as dependências.')
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error('Confira o package.json antes de executar o projeto.')
  }
  if (!object(value)) throw new Error('O package.json do projeto é inválido.')
  let changed = false
  const next = { ...value }
  for (const key of ['dependencies', 'devDependencies'] as const) {
    const dependencies = value[key]
    if (dependencies !== undefined && !object(dependencies))
      throw new Error('As dependências do projeto são inválidas.')
    if (object(dependencies) && dependencies.vite === '8.0.16') {
      next[key] = { ...dependencies, vite: STUDIO_PRO_REMOTE_PACKAGES.vite }
      changed = true
    }
  }
  return changed ? `${JSON.stringify(next, null, 2)}\n` : null
}
