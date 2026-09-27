import { isDocumentRecord } from '../core/projectDocument'
import type { MigrationChange } from './types'

const PERIODIC_BLOCKS: Readonly<
  Record<string, { method: string; input: string; fallback: number }>
> = {
  sz_g2d_every_frames: { method: 'everyFrames', input: 'N', fallback: 30 },
  sz_g2d_every_seconds: { method: 'everySeconds', input: 'SECS', fallback: 2 },
  sz_g2d_after_seconds: { method: 'afterSeconds', input: 'SECS', fallback: 3 },
}
const PERIODIC_IR: Readonly<Record<string, { method: string; input: string; fallback: number }>> = {
  'g2d:everyFrames': { method: 'everyFrames', input: 'n', fallback: 30 },
  'g2d:everySeconds': { method: 'everySeconds', input: 'seconds', fallback: 2 },
  'g2d:afterSeconds': { method: 'afterSeconds', input: 'seconds', fallback: 3 },
}
const WRAPPERS = new Set(['sz_g2d_on_start', 'sz_gk_on_game_start', 'sz_js_on_load'])

/** A consulta continua no mesmo ponto da execução, inclusive dentro de condições. */
export function migrateNestedPeriodicBlocks(state: unknown, changes: MigrationChange[]): void {
  if (
    !isDocumentRecord(state) ||
    !isDocumentRecord(state.blocks) ||
    !Array.isArray(state.blocks.blocks)
  )
    return
  const pending = state.blocks.blocks.map((node, index) => ({
    node,
    nested: false,
    path: `$.blocksState.blocks.blocks[${index}]`,
  }))
  while (pending.length) {
    const { node, nested, path } = pending.pop()!
    if (!isDocumentRecord(node) || typeof node.type !== 'string') continue
    const type = node.type
    const rule = PERIODIC_BLOCKS[type]
    if (rule && nested) {
      const inputs = isDocumentRecord(node.inputs) ? node.inputs : {}
      const key = `g2d-periodic:${typeof node.id === 'string' ? node.id : path}`
      node.type = 'sz_js_if_else'
      node.inputs = {
        ...(inputs.BODY ? { THEN: inputs.BODY } : {}),
        COND: {
          block: {
            type: 'sz_val_method_on',
            fields: { METHOD: rule.method },
            extraState: { items: 2 },
            inputs: {
              OBJ: { block: { type: 'sz_val_variable', fields: { NAME: 'SZGame2D' } } },
              ARG0: { shadow: { type: 'sz_val_text', fields: { TEXT: key } } },
              ARG1: inputs[rule.input] ?? {
                shadow: {
                  type: 'sz_val_number',
                  fields: {
                    NUM: isDocumentRecord(node.fields)
                      ? (node.fields[rule.input] ?? rule.fallback)
                      : rule.fallback,
                  },
                },
              },
            },
          },
        },
      }
      node.fields = {}
      changes.push({ rule: 'g2d.periodic-execution-point', path })
    }
    if (isDocumentRecord(node.next))
      pending.push({ node: node.next.block, nested, path: `${path}.next.block` })
    if (!isDocumentRecord(node.inputs)) continue
    const inside = nested || (!type.startsWith('sz_frame_') && !WRAPPERS.has(type))
    for (const [name, input] of Object.entries(node.inputs)) {
      if (!isDocumentRecord(input)) continue
      pending.push(
        { node: input.block, nested: inside, path: `${path}.inputs.${name}.block` },
        { node: input.shadow, nested: inside, path: `${path}.inputs.${name}.shadow` },
      )
    }
  }
}

export function migrateNestedPeriodicIR(raw: unknown, changes: MigrationChange[]): void {
  const pending = [{ node: raw, nested: false, path: '$.ir' }]
  while (pending.length) {
    const { node, nested, path } = pending.pop()!
    if (Array.isArray(node)) {
      node.forEach((child, index) => {
        pending.push({ node: child, nested, path: `${path}[${index}]` })
      })
      continue
    }
    if (!isDocumentRecord(node)) continue
    const type = typeof node.type === 'string' ? node.type : ''
    const rule = PERIODIC_IR[type]
    if (rule && nested) {
      const key = `g2d-periodic:${typeof node.__id === 'string' ? node.__id : path}`
      const value = node[rule.input] ?? rule.fallback
      const body = node.body
      delete node.body
      delete node[rule.input]
      node.type = 'if'
      node.cond = {
        type: 'memberCallExpr',
        object: { type: 'var', name: 'SZGame2D' },
        method: rule.method,
        args: [
          { type: 'str', value: key },
          typeof value === 'number' ? { type: 'num', value } : value,
        ],
      }
      node.then = body
      changes.push({ rule: 'g2d.periodic-execution-point', path })
    }
    for (const [name, child] of Object.entries(node)) {
      const inside =
        nested ||
        (['body', 'then', 'else', 'elseif', 'cases'].includes(name) &&
          !['g2d:onStart', 'gk:onGameStart'].includes(type))
      pending.push({ node: child, nested: inside, path: `${path}.${name}` })
    }
  }
}
