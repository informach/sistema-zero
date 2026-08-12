import type { ExampleExperience } from '#core'
import type { CoreExample } from './core'

export interface CoreExampleSummary {
  name: string
  description: string
  experience: ExampleExperience
}

export { CORE_EXAMPLE_SUMMARIES } from './__gen_coreExampleCatalog'

/** Carrega as IRs pesadas somente depois do clique no exemplo. */
export async function loadCoreExample(name: string): Promise<CoreExample> {
  if (name === 'Reino Zero Ultra (na mão)') {
    const { reinoZeroUltraExample } = await import('./reinoZeroUltraExample')
    return reinoZeroUltraExample
  }
  const { CORE_EXAMPLES } = await import('./core')
  const example = CORE_EXAMPLES.find((candidate) => candidate.name === name)
  if (!example) throw new Error(`Exemplo clássico não encontrado: ${name}`)
  return example
}
