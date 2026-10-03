import type { BlockDefinition } from '../../blockly/blocks/types'
import {
  SCENE_NAME_DEFAULTS,
  SCENE_NAME_KINDS,
  type SceneNameKind,
  type SceneTarget,
  sceneBlockType,
  sceneLiteralShadow,
  sceneMethods,
  sceneNameBlockType,
} from './catalog'

const NAME_TOOLTIPS: Readonly<Record<SceneNameKind, string>> = {
  layer: 'O nome de uma camada. Toque para escolher uma das que você já criou.',
  track: 'O nome de uma pista. Toque para escolher uma das que você já criou.',
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
  return sceneMethods(target).map((entry) => ({
    type: sceneBlockType(target, entry),
    message0: entry.message,
    args0: [
      ...entry.args.map((arg) =>
        arg.field === 'image'
          ? { type: 'field_asset_picker', name: arg.name, text: arg.value, kind: 'image' }
          : arg.field === 'mold'
            ? { type: 'field_name_picker', name: arg.name, text: arg.value, kind: 'mold' }
            : arg.field === 'sprite'
              ? target === 'g2d'
                ? { type: 'field_sprite_picker', name: arg.name, text: arg.value }
                : { type: 'field_name_picker', name: arg.name, text: arg.value, kind: 'character' }
              : arg.field === 'animation'
                ? { type: 'field_named_animation_picker', name: arg.name, text: arg.value }
                : arg.field === 'select'
                  ? { type: 'field_dropdown', name: arg.name, options: arg.options }
                  : { type: 'input_value', name: arg.name, check: 'JSValue' },
      ),
      ...(entry.parameter ? [{ type: 'field_input', name: 'PARAM', text: entry.parameter }] : []),
    ],
    ...(entry.value
      ? { output: 'JSValue' }
      : {
          placement:
            entry.method === 'collectTrackItem'
              ? { root: [], nested: ['track-encounter'] as const, role: 'command' as const }
              : entry.event
                ? ('event' as const)
                : (entry.placement ?? 'command'),
          previousStatement: 'JSStmt',
          nextStatement: 'JSStmt',
        }),
    ...(entry.event || entry.each
      ? { message1: 'fazer %1', args1: [{ type: 'input_statement', name: 'BODY' }] }
      : {}),
    ...(entry.each ? { bodyExecution: 'sync-callback' as const } : {}),
    ...(['onTrackEncounter', 'onTrackSpriteEncounter', 'onTrackMoldEncounter'].includes(
      entry.method,
    )
      ? { bodyContext: 'track-encounter' as const }
      : {}),
    inputsInline: true,
    colour: colourOf(target),
    tooltip: entry.tooltip,
  }))
}

export function sceneShadows(target: SceneTarget): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    sceneMethods(target).map((entry) => [
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
