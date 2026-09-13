import { isDocumentRecord, ProjectDocumentError, projectBlockTypes } from '../core/projectDocument'
import { cameraHudTools, migrateCameraHudBlock, migrateCameraHudIR } from './cameraAndHud'
import { migrateGameTwoDHTML } from './html'
import { migrateGameTwoDJavaScript } from './javascript'
import { HISTORICAL_SOUND_METHODS } from './soundRules'
import type { MigrationChange } from './types'

export const SOUND_BLOCKS: Readonly<Record<string, string>> = {
  sz_g2d_play_shoot: 'shoot',
  sz_g2d_play_explosion: 'explosion',
  sz_g2d_play_jump: 'jump',
  sz_g2d_play_dino_hurt: 'hurt',
  sz_g2d_play_collect: 'collect',
  sz_g2d_play_whistle: 'whistle',
  sz_g2d_play_boom: 'explosion',
}

/** Muta somente a cópia privada do conversor. Preserva disposição, IDs e dados do Blockly. */
export function migrateGameTwoDBlocks(state: unknown, changes: MigrationChange[]): void {
  if (!isDocumentRecord(state) || !isDocumentRecord(state.blocks)) return
  if (!Array.isArray(state.blocks.blocks)) return
  projectBlockTypes(state)
  const usedIds = new Set<string>()
  const collect: unknown[] = [...state.blocks.blocks]
  while (collect.length) {
    const node = collect.pop()
    if (!isDocumentRecord(node)) continue
    if (typeof node.id === 'string') usedIds.add(node.id)
    if (isDocumentRecord(node.next)) collect.push(node.next.block)
    if (isDocumentRecord(node.inputs))
      for (const input of Object.values(node.inputs)) {
        if (isDocumentRecord(input)) collect.push(input.block, input.shadow)
      }
  }
  let inserted = 0
  const nextId = (): string => {
    let id: string
    do {
      id = `sz-converted-${++inserted}`
    } while (usedIds.has(id))
    usedIds.add(id)
    return id
  }
  const pending = state.blocks.blocks
    .map((value, index) => ({ value, path: `$.blocksState.blocks.blocks[${index}]` }))
    .reverse()
  while (pending.length) {
    const { value, path } = pending.pop()!
    if (!isDocumentRecord(value)) continue
    const type = value.type
    if (typeof type !== 'string') continue
    if (
      [
        'sz_js_set_prop',
        'sz_val_get_prop',
        'sz_js_member_set',
        'sz_val_member_get',
        'sz_val_member_get_optional',
      ].includes(type) &&
      isDocumentRecord(value.fields) &&
      value.fields.NAME === 'onDefeat'
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'O callback antigo onDefeat precisa ser convertido para o evento de derrota do inimigo.',
        path,
      )
    if (
      (type === 'sz_js_method_on' || type === 'sz_val_method_on') &&
      isDocumentRecord(value.inputs) &&
      isDocumentRecord(value.fields) &&
      typeof value.fields.METHOD === 'string'
    ) {
      const receiver = value.inputs.OBJ
      const object = isDocumentRecord(receiver) ? (receiver.block ?? receiver.shadow) : null
      if (
        isDocumentRecord(object) &&
        object.type === 'sz_val_variable' &&
        isDocumentRecord(object.fields) &&
        object.fields.NAME === 'SZGame2D'
      ) {
        const method = value.fields.METHOD
        const fx = HISTORICAL_SOUND_METHODS[method]
        const music = method === 'stopMusic' || method === 'stopTrack'
        if (fx || music) {
          const extra = isDocumentRecord(value.extraState) ? value.extraState : {}
          const argumentCount = typeof extra.items === 'number' ? extra.items : 0
          const inputs = { ...value.inputs }
          for (const key of Object.keys(inputs)) if (/^ARG\d+$/.test(key)) delete inputs[key]
          for (const [key, input] of Object.entries(value.inputs)) {
            if (!/^ARG\d+$/.test(key)) continue
            inputs[`ARG${Number(key.slice(3)) + 1}`] = input
          }
          inputs.ARG0 = {
            shadow: {
              id: nextId(),
              type: 'sz_val_text',
              fields: { TEXT: music ? (method === 'stopMusic' ? 'synth' : 'all') : fx },
            },
          }
          value.inputs = inputs
          value.fields.METHOD = music ? 'stopTrack' : 'playFx'
          value.extraState = { ...extra, items: argumentCount + 1 }
          changes.push({ rule: music ? 'g2d.music-scope-call' : 'g2d.sound-call', path })
        }
      }
    }
    if (isDocumentRecord(value.fields) && typeof value.fields.CODE === 'string') {
      if (type === 'sz_adv_raw_js')
        value.fields.CODE = migrateGameTwoDJavaScript(
          value.fields.CODE,
          changes,
          `${path}.fields.CODE`,
        )
      else if (type === 'sz_adv_raw_html')
        value.fields.CODE = migrateGameTwoDHTML(value.fields.CODE, changes, `${path}.fields.CODE`)
    }
    const fx = SOUND_BLOCKS[type]
    if (migrateCameraHudBlock(value)) changes.push({ rule: 'g2d.explicit-camera-hud-call', path })
    if (
      type === 'sz_g2d_enemy_type_param_legacy_start' ||
      type === 'sz_g2d_enemy_add_behavior_legacy_start'
    ) {
      value.type = type.replace('_legacy_start', '')
      changes.push({ rule: 'g2d.enemy-configuration', path })
    } else if (fx) {
      value.type = 'sz_g2d_play_fx'
      value.fields = { ...(isDocumentRecord(value.fields) ? value.fields : {}), FX: fx }
      changes.push({ rule: 'g2d.sound-preset', path })
    } else if (type === 'sz_g2d_score') {
      value.type = 'sz_js_var_create'
      const inputs = isDocumentRecord(value.inputs) ? value.inputs : {}
      value.inputs = {
        ...inputs,
        VALUE: inputs.INITIAL ?? { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } },
      }
      delete (value.inputs as Record<string, unknown>).INITIAL
      changes.push({ rule: 'g2d.score-variable', path })
    } else if (type === 'sz_g2d_collides' || type === 'sz_g2d_circle_collides') {
      const fields = isDocumentRecord(value.fields) ? value.fields : {}
      value.type = 'sz_js_const_create'
      value.fields = { NAME: fields.NAME ?? 'bateu' }
      value.inputs = {
        VALUE: {
          block: {
            id: nextId(),
            type: type === 'sz_g2d_circle_collides' ? 'sz_g2d_circle_touches' : 'sz_g2d_touches',
            fields: { A: fields.A ?? 'jogador', B: fields.B ?? 'inimigo' },
          },
        },
      }
      changes.push({ rule: 'g2d.collision-expression', path })
    } else if (type === 'sz_g2d_stop_music') {
      value.type = 'sz_g2d_stop_track'
      value.fields = { SCOPE: 'synth' }
      changes.push({ rule: 'g2d.music-scope', path })
    } else if (type === 'sz_g2d_stop_track') {
      value.fields = { ...(isDocumentRecord(value.fields) ? value.fields : {}), SCOPE: 'all' }
      changes.push({ rule: 'g2d.music-scope', path })
    }
    if (isDocumentRecord(value.next))
      pending.push({ value: value.next.block, path: `${path}.next.block` })
    if (isDocumentRecord(value.inputs)) {
      for (const [name, input] of Object.entries(value.inputs).reverse()) {
        if (!isDocumentRecord(input)) continue
        if (Object.keys(input).length === 0) {
          delete value.inputs[name]
          changes.push({ rule: 'blockly.empty-input', path: `${path}.inputs.${name}` })
          continue
        }
        pending.push(
          { value: input.block, path: `${path}.inputs.${name}.block` },
          { value: input.shadow, path: `${path}.inputs.${name}.shadow` },
        )
      }
    }
  }
}

/** Concessões e ferramentas retidas seguem a mesma substituição que o programa. */
export function migrateGameTwoDToolTypes(types: readonly string[]): string[] {
  return [
    ...new Set(
      types.flatMap((type) => {
        if (type === 'sz_g2d_draw_tilemap')
          return [
            'sz_js_function',
            'sz_js_call_function',
            'sz_js_method_on',
            'sz_val_variable',
            'sz_val_arg',
            'sz_val_number',
          ]
        const cameraHud = cameraHudTools(type)
        if (cameraHud) return cameraHud
        if (SOUND_BLOCKS[type]) return ['sz_g2d_play_fx']
        if (type === 'sz_g2d_score') return ['sz_js_var_create', 'sz_val_number']
        if (type === 'sz_g2d_collides') return ['sz_js_const_create', 'sz_g2d_touches']
        if (type === 'sz_g2d_circle_collides')
          return ['sz_js_const_create', 'sz_g2d_circle_touches']
        if (type === 'sz_g2d_stop_music') return ['sz_g2d_stop_track']
        if (
          type === 'sz_g2d_enemy_type_param_legacy_start' ||
          type === 'sz_g2d_enemy_add_behavior_legacy_start'
        )
          return [type.replace('_legacy_start', '')]
        return [type]
      }),
    ),
  ].sort()
}

export function migrateGameTwoDIR(
  raw: unknown,
  changes: MigrationChange[],
  path = '$.ir',
): unknown {
  const holder = { value: raw }
  type Entry = {
    parent: Record<string, unknown> | unknown[]
    key: string
    value: unknown
    path: string
    done?: boolean
  }
  const pending: Entry[] = [{ parent: holder, key: 'value', value: raw, path }]
  while (pending.length) {
    const item = pending.pop()!
    if (!Array.isArray(item.value) && !isDocumentRecord(item.value)) continue
    if (item.done) {
      if (isDocumentRecord(item.value))
        Object.defineProperty(item.parent, item.key, {
          value: migrateOperation(item.value, changes, item.path),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      continue
    }
    pending.push({ ...item, done: true })
    for (const [key, value] of Object.entries(item.value).reverse())
      pending.push({ parent: item.value, key, value, path: `${item.path}.${key}` })
  }
  return holder.value
}

function migrateOperation(
  node: Record<string, unknown>,
  changes: MigrationChange[],
  path: string,
): Record<string, unknown> {
  if (typeof node.type !== 'string') return node
  const cameraHud = migrateCameraHudIR(node)
  if (cameraHud) {
    changes.push({ rule: 'g2d.explicit-camera-hud-call', path })
    return cameraHud
  }
  if (
    node.type === 'g2d:setEnemyTypeParamLegacyStart' ||
    node.type === 'g2d:enemyAddBehaviorLegacyStart'
  ) {
    changes.push({ rule: 'g2d.enemy-configuration', path })
    return { ...node, type: node.type.replace('LegacyStart', '') }
  }
  if (node.type === 'rawJS' && typeof node.code === 'string')
    return { ...node, code: migrateGameTwoDJavaScript(node.code, changes, `${path}.code`) }
  if (node.type === 'rawHTML' && typeof node.html === 'string')
    return { ...node, html: migrateGameTwoDHTML(node.html, changes, `${path}.html`) }
  if (
    ['propAccess', 'memberGet', 'setProp', 'memberSet'].includes(node.type) &&
    node.name === 'onDefeat'
  )
    throw new ProjectDocumentError(
      'migration-pending',
      'O callback antigo onDefeat precisa ser convertido para o evento de derrota do inimigo.',
      path,
    )
  if (
    node.type === 'memberCallExpr' &&
    isDocumentRecord(node.object) &&
    node.object.type === 'var' &&
    node.object.name === 'SZGame2D' &&
    node.method === 'drawTileMap' &&
    Array.isArray(node.args) &&
    node.args.length > 2
  )
    throw new ProjectDocumentError(
      'migration-pending',
      'O desenho antigo do mapa dentro de uma expressão precisa de revisão.',
      path,
    )
  if (
    (node.type === 'memberCall' || node.type === 'memberCallExpr') &&
    isDocumentRecord(node.object) &&
    node.object.type === 'var' &&
    node.object.name === 'SZGame2D' &&
    typeof node.method === 'string' &&
    Array.isArray(node.args)
  ) {
    const fx = HISTORICAL_SOUND_METHODS[node.method]
    const music = node.method === 'stopMusic' || node.method === 'stopTrack'
    if (fx || music) {
      changes.push({ rule: music ? 'g2d.music-scope-call' : 'g2d.sound-call', path })
      return {
        ...node,
        method: music ? 'stopTrack' : 'playFx',
        args: [
          { type: 'str', value: music ? (node.method === 'stopMusic' ? 'synth' : 'all') : fx },
          ...node.args,
        ],
      }
    }
  }
  const sound =
    node.type === 'g2d:playBoom'
      ? 'explosion'
      : node.type.startsWith('g2d:')
        ? HISTORICAL_SOUND_METHODS[node.type.slice(4)]
        : undefined
  if (sound) {
    changes.push({ rule: 'g2d.sound-preset', path })
    return { ...node, type: 'g2d:playFx', fx: sound }
  }
  if (node.type === 'g2d:score') {
    const { varName, initial, ...rest } = node
    changes.push({ rule: 'g2d.score-variable', path })
    return {
      ...rest,
      type: 'var',
      name: varName,
      value: typeof initial === 'number' ? { type: 'num', value: initial } : initial,
    }
  }
  if (node.type === 'g2d:stopMusic' || node.type === 'g2d:stopTrack') {
    changes.push({ rule: 'g2d.music-scope', path })
    return {
      ...node,
      type: 'g2d:stopTrack',
      scope: node.type === 'g2d:stopMusic' ? 'synth' : 'all',
    }
  }
  if (node.type === 'g2d:collides' || node.type === 'g2d:circleCollides') {
    const { varName, aVar, bVar, ...rest } = node
    changes.push({ rule: 'g2d.collision-expression', path })
    return {
      ...rest,
      type: 'var',
      kind: 'const',
      name: varName,
      value: {
        type: node.type === 'g2d:circleCollides' ? 'g2d:circleTouches' : 'g2d:touches',
        aVar,
        bVar,
      },
    }
  }
  return node
}
