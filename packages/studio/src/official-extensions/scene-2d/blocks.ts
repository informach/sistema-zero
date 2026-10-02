import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  SCENE_METHODS,
  SCENE_NAME_DEFAULTS,
  SCENE_NAME_KINDS,
  type SceneNameKind,
  type SceneTarget,
  sceneBlockType,
  sceneLiteralShadow,
  sceneNameBlockType,
} from './catalog'

const NAME_TOOLTIPS: Readonly<Record<SceneNameKind, string>> = {
  layer: 'O nome de uma camada. Toque para escolher uma das que você já criou.',
  track: 'O nome de uma pista. Toque para escolher uma das que você já criou.',
  object:
    'O nome de um objeto da pista. Toque para escolher um dos que você já criou; um nome montado num laço pode ser encaixado por cima.',
}

const colourOf = (target: SceneTarget) => (target === 'g2d' ? '#ec4899' : '#14b8a6')

/**
 * The value blocks that live inside the name sockets. They never show in the palette:
 * they are what a socket is born with, so the child picks a name instead of retyping it.
 */
function sceneNameBlocks(target: SceneTarget): BlockDefinition[] {
  return SCENE_NAME_KINDS.map((kind) => ({
    type: sceneNameBlockType(target, kind),
    message0: '%1',
    args0: [
      {
        type: 'field_name_picker',
        name: 'NAME',
        text: SCENE_NAME_DEFAULTS[kind],
        kind: `scene-${kind}`,
      },
    ],
    output: 'JSValue',
    hidden: true,
    colour: colourOf(target),
    tooltip: NAME_TOOLTIPS[kind],
  }))
}

export function sceneBlocks(target: SceneTarget): BlockDefinition[] {
  return [...sceneCommandBlocks(target), ...sceneNameBlocks(target)]
}

function sceneCommandBlocks(target: SceneTarget): BlockDefinition[] {
  return SCENE_METHODS.map((entry) => ({
    type: sceneBlockType(target, entry),
    message0: entry.message,
    args0: entry.args.map((arg) =>
      arg.field === 'image'
        ? { type: 'field_asset_picker', name: arg.name, text: arg.value, kind: 'image' }
        : arg.field === 'select'
          ? { type: 'field_dropdown', name: arg.name, options: arg.options }
          : { type: 'input_value', name: arg.name, check: 'JSValue' },
    ),
    ...(entry.value
      ? { output: 'JSValue' }
      : { placement: 'command' as const, previousStatement: 'JSStmt', nextStatement: 'JSStmt' }),
    inputsInline: true,
    colour: colourOf(target),
    tooltip: entry.tooltip,
  }))
}

export function sceneShadows(target: SceneTarget): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    SCENE_METHODS.map((entry) => [
      sceneBlockType(target, entry),
      Object.fromEntries(
        entry.args
          .filter((arg) => !arg.field)
          .map((arg) => [
            arg.name,
            {
              shadow: arg.picks
                ? {
                    type: sceneNameBlockType(target, arg.picks),
                    fields: { NAME: String(arg.value) },
                  }
                : sceneLiteralShadow(arg),
            },
          ]),
      ),
    ]),
  )
}
