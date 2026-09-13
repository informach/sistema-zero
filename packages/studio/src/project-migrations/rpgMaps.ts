import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'
import type { MigrationChange } from './types'

function mapName(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new ProjectDocumentError(
      'migration-pending',
      'O mapa antigo precisa de um nome literal válido.',
      path,
    )
  return value
}

/** Mapas antigos passam a declarações explícitas sem inventar fronteiras. */
export function migrateRpgMapsIR(raw: unknown, changes: MigrationChange[]): void {
  if (!isDocumentRecord(raw)) return
  const behavior = isDocumentRecord(raw.behavior) ? raw.behavior : null
  const events = Array.isArray(raw.js)
    ? raw.js
    : behavior && Array.isArray(behavior.events)
      ? behavior.events
      : null
  if (!events) return
  const serialized = JSON.stringify(raw)
  const startup = behavior && Array.isArray(behavior.start) ? behavior.start : events
  if (
    serialized.includes('gk:rpgOnMap') &&
    startup.some((node) => isDocumentRecord(node) && node.type === 'gk:rpgGoMap')
  )
    throw new ProjectDocumentError(
      'migration-pending',
      'Uma viagem durante a preparação dos mapas exige revisão da ordem dos eventos.',
      '$.ir',
    )
  if (
    serialized.includes('gk:rpgOnMap') &&
    (serialized.includes('gk:rpgCreateMap') || serialized.includes('gk:rpgMapSize'))
  )
    throw new ProjectDocumentError(
      'migration-pending',
      'A aventura mistura contratos de criação de mapa; revise a ordem das declarações.',
      '$.ir',
    )
  const creations: Record<string, unknown>[] = []
  const names = new Set<string>()
  for (let index = 0; index < events.length; index++) {
    const node = events[index]
    if (!isDocumentRecord(node) || node.type !== 'gk:rpgOnMap') continue
    const path = `$.ir.${behavior ? 'behavior.events' : 'js'}[${index}]`
    const map = mapName(node.map, path)
    if (!names.has(map)) {
      names.add(map)
      creations.push({
        type: 'gk:rpgCreateMap',
        map,
        cols: 0,
        rows: 0,
        bounds: 'unbounded',
        ctxName: 'ctx',
        body: [],
      })
    }
    node.type = 'gk:rpgOnEnterMap'
    changes.push({ rule: 'gk.explicit-unbounded-map', path })
  }
  if (!creations.length) return
  if (behavior) {
    if (!Array.isArray(behavior.start))
      throw new ProjectDocumentError(
        'migration-pending',
        'O início da aventura precisa de revisão.',
      )
    behavior.start.push(...creations)
  } else {
    for (const creation of creations) {
      const at = events.findIndex(
        (node) =>
          isDocumentRecord(node) && node.type === 'gk:rpgOnEnterMap' && node.map === creation.map,
      )
      events.splice(at, 0, creation)
    }
  }
}

export function migrateRpgMapBlocks(raw: unknown, changes: MigrationChange[]): void {
  if (!isDocumentRecord(raw) || !isDocumentRecord(raw.blocks) || !Array.isArray(raw.blocks.blocks))
    return
  const tops = raw.blocks.blocks
  const serialized = JSON.stringify(raw)
  if (
    serialized.includes('sz_gk_rpg_on_map') &&
    (serialized.includes('sz_gk_rpg_create_map') || serialized.includes('sz_gk_rpg_map_size'))
  )
    throw new ProjectDocumentError(
      'migration-pending',
      'A aventura mistura contratos de criação de mapa; revise a ordem das declarações.',
      '$.blocksState',
    )
  const currentAreas = raw.szBehaviorAreasVersion === 7
  const pending = tops
    .map((node, index) => ({ node, root: true, path: `$.blocksState.blocks.blocks[${index}]` }))
    .reverse()
  const creations: Record<string, unknown>[] = []
  const names = new Set<string>()
  while (pending.length) {
    const { node, root, path } = pending.pop()!
    if (!isDocumentRecord(node) || typeof node.type !== 'string') continue
    const type = node.type
    if (root && type === 'sz_gk_rpg_go_map' && serialized.includes('sz_gk_rpg_on_map'))
      throw new ProjectDocumentError(
        'migration-pending',
        'Uma viagem durante a preparação dos mapas exige revisão da ordem dos eventos.',
        path,
      )
    if (node.type === 'sz_gk_rpg_on_map') {
      if (currentAreas && tops.includes(node))
        throw new ProjectDocumentError(
          'migration-pending',
          'O registro de mapa está em um rascunho; ele precisa ser convertido sem ativar sua criação.',
          path,
        )
      if (!root)
        throw new ProjectDocumentError(
          'migration-pending',
          'Um mapa criado dentro de outro comando precisa de revisão.',
          path,
        )
      const map = mapName(isDocumentRecord(node.fields) ? node.fields.MAP : null, path)
      if (!names.has(map)) {
        names.add(map)
        creations.push({
          type: 'sz_gk_rpg_create_map',
          fields: { MAP: map, PARAM: 'ctx', BOUNDS: 'unbounded' },
          inputs: {
            COLS: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
            ROWS: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
          },
        })
      }
      node.type = 'sz_gk_rpg_on_enter_map'
      changes.push({ rule: 'gk.explicit-unbounded-map', path })
    }
    if (isDocumentRecord(node.next))
      pending.push({ node: node.next.block, root, path: `${path}.next.block` })
    if (isDocumentRecord(node.inputs))
      for (const [key, input] of Object.entries(node.inputs).reverse()) {
        if (!isDocumentRecord(input)) continue
        const nestedRoot = root && (type.startsWith('sz_frame_') || type === 'sz_gk_on_game_start')
        pending.push({ node: input.block, root: nestedRoot, path: `${path}.inputs.${key}.block` })
      }
  }
  if (!creations.length) return
  for (let index = 0; index < creations.length - 1; index++)
    creations[index]!.next = { block: creations[index + 1] }
  const start = tops.find((node) => isDocumentRecord(node) && node.type === 'sz_frame_start')
  if (isDocumentRecord(start)) {
    const inputs = isDocumentRecord(start.inputs) ? start.inputs : {}
    start.inputs = inputs
    const children = isDocumentRecord(inputs.CHILDREN) ? inputs.CHILDREN : {}
    inputs.CHILDREN = children
    const head = children.block
    if (!isDocumentRecord(head)) children.block = creations[0]
    else {
      let tail = head
      while (isDocumentRecord(tail.next) && isDocumentRecord(tail.next.block))
        tail = tail.next.block
      tail.next = { block: creations[0] }
    }
  } else
    tops.push({
      type: 'sz_frame_start',
      inputs: { CHILDREN: { block: creations[0] } },
    })
}
