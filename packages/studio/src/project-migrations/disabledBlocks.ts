import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import type { MigrationChange } from './types'

/** Blockly 12 não lê a flag antiga; conserva a desativação como motivo explícito. */
export function migrateDisabledBlocks(raw: unknown, changes: MigrationChange[]): void {
  if (!isDocumentRecord(raw) || !isDocumentRecord(raw.blocks) || !Array.isArray(raw.blocks.blocks))
    return
  const pending: unknown[] = [...raw.blocks.blocks]
  while (pending.length) {
    const block = pending.pop()
    if (!isDocumentRecord(block)) continue
    if ('disabled' in block) {
      if (
        typeof block.disabled !== 'boolean' ||
        (block.disabledReasons !== undefined &&
          (!Array.isArray(block.disabledReasons) ||
            block.disabledReasons.some((reason) => typeof reason !== 'string')))
      )
        throw new ProjectDocumentError(
          'migration-pending',
          'O estado de desativação do bloco precisa de revisão.',
          '$.blocksState',
        )
      if (block.disabled)
        block.disabledReasons = [
          ...new Set([
            ...(Array.isArray(block.disabledReasons) ? block.disabledReasons : []),
            'MANUALLY_DISABLED',
          ]),
        ]
      delete block.disabled
      changes.push({
        rule: 'block.disabled-reasons',
        path: `$.blocksState:${block.id ?? block.type}`,
      })
    }
    if (isDocumentRecord(block.next)) pending.push(block.next.block)
    if (isDocumentRecord(block.inputs))
      for (const input of Object.values(block.inputs))
        if (isDocumentRecord(input)) pending.push(input.block, input.shadow)
  }
}
