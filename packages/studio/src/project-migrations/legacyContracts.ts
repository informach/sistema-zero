import type { BlockContract } from '../blockly/blockContracts'
import type { ProjectAreaKind } from '../core/behaviorAreas'
import snapshot from './legacy-contracts.json'

// Fotografia do formato 1. Alterar a paleta atual não reclassifica documentos históricos.
const contracts = snapshot.contracts as Record<string, BlockContract>
export const VARIABLE_DECL_BLOCKS: Readonly<Record<string, readonly string[]>> =
  snapshot.variableDeclarations

export function getBlockContract(type: string): BlockContract | undefined {
  return contracts[type]
}
export function areasForBlockType(type: string): readonly ProjectAreaKind[] | undefined {
  const contract = getBlockContract(type)
  if (contract?.domain === 'html') return ['structure']
  if (contract?.domain === 'css') return ['appearance']
  return contract?.placement?.root
}
export function areaForBlockType(type: string): ProjectAreaKind | undefined {
  return areasForBlockType(type)?.[0]
}
