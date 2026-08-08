/**
 * Constrói o índice server-safe dos exemplos oficiais. PESADO (importa todas
 * as IRs, ~3.4MB de fonte) — usado SÓ pelo gerador (`scripts/gen-server-examples.ts`)
 * e pelo drift test; o servidor consome o arquivo GERADO via
 * `@sistemazero/studio/server-examples`.
 */
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import type { ExtensionExample } from '../extensions/types'
import { gameTwoDExamples } from '../official-extensions/game-2d/exampleCatalog'
import { gameKitExamples } from '../official-extensions/game-2d-advanced/exampleCatalog'
import { gameThreeDExamples } from '../official-extensions/game-3d/exampleCatalog'
import { gameKit3DExamples } from '../official-extensions/game-3d-advanced/exampleCatalog'
import { world3DExamples } from '../official-extensions/world-3d/examples'
import { CORE_EXAMPLES, type CoreExample } from './core'
import { EXAMPLE_QA_CONTRACTS } from './qaContracts'
import type { ServerExampleIndexEntry } from './serverExamples'

const CATALOGS: ReadonlyArray<{
  extension: string | null
  examples: readonly (ExtensionExample | CoreExample)[]
}> = [
  { extension: null, examples: CORE_EXAMPLES },
  { extension: 'game-2d', examples: gameTwoDExamples },
  { extension: 'game-2d-advanced', examples: gameKitExamples },
  { extension: 'game-3d', examples: gameThreeDExamples },
  { extension: 'game-3d-advanced', examples: gameKit3DExamples },
  { extension: 'world-3d', examples: world3DExamples },
]

function collectBlockTypes(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectBlockTypes(item, out)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (typeof record.type === 'string' && record.type) out.add(record.type)
  for (const value of Object.values(record)) collectBlockTypes(value, out)
}

export function buildServerExamplesIndex(): ServerExampleIndexEntry[] {
  const contracts = new Map<string, (typeof EXAMPLE_QA_CONTRACTS)[number]>(
    EXAMPLE_QA_CONTRACTS.map((contract) => [contract.key, contract]),
  )
  const entries: ServerExampleIndexEntry[] = []
  for (const catalog of CATALOGS) {
    for (const example of catalog.examples) {
      const key = `${catalog.extension ?? 'core'}:${example.name}`
      const contract = contracts.get(key)
      if (!contract) {
        throw new Error(
          `Exemplo sem contrato QA: ${key} — adicione a entrada em examples/qaContracts.ts`,
        )
      }
      const blockTypes = new Set<string>()
      collectBlockTypes(buildWorkspaceStateFromIR(example.ir), blockTypes)
      const requires = [
        ...new Set([
          ...(catalog.extension ? [catalog.extension] : []),
          ...(example.ir.extensions ?? []).map((usage) => usage.extensionId),
        ]),
      ]
      const editorial = example as ExtensionExample
      entries.push({
        key,
        extension: catalog.extension,
        name: example.name,
        description: example.description ?? '',
        ...(editorial.difficulty ? { difficulty: editorial.difficulty } : {}),
        ...(editorial.concepts?.length ? { concepts: [...editorial.concepts] } : {}),
        ...(editorial.genre ? { genre: editorial.genre } : {}),
        promise: contract.promise,
        scenario: contract.scenario,
        blockTypes: [...blockTypes].sort(),
        requires,
      })
    }
  }
  return entries
}
