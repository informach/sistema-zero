/**
 * O que cada ferramenta da aba Pintar faz, para o botão e para o atalho do editor antigo: P lápis,
 * E borracha, G balde, I conta-gotas, 1, 2 e 3 a largura, M espelho, R girar a pintura da face e
 * F pintar de perto.
 *
 * O registro diz o rótulo, o ícone e a tecla; aqui mora só a ação, então o botão e a tecla nunca
 * divergem. ⚠️ Atalho de família trancada ou com um traço em andamento continua sendo da aba:
 * quem chama dá `preventDefault` e nada acontece, como o botão desligado no meio do traço.
 */
import type { SceneToolCheck } from './sceneCommandAccess'
import { matchSceneShortcut, type SceneCommandId } from './sceneCommandRegistry'
import type { useScenePaint } from './useScenePaint'

type Paint = ReturnType<typeof useScenePaint>
type ShortcutEvent = Parameters<typeof matchSceneShortcut>[1]

export const SCENE_PAINT_ACTIONS = {
  'paint.pencil': (paint: Paint) => paint.setEraser(false),
  'paint.eraser': (paint: Paint) => paint.setEraser(true),
  'paint.fill': (paint: Paint) => paint.setFill(),
  'paint.picker': (paint: Paint) => paint.setPicker(),
  'paint.rotate': (paint: Paint) => paint.setRotate(),
  'paint.closeup': (paint: Paint) => paint.setCloseUpTool(),
  'paint.mirror': (paint: Paint) => paint.setMirror(!paint.mirror),
  'paint.width-1': (paint: Paint) => paint.setBrush(1),
  'paint.width-2': (paint: Paint) => paint.setBrush(2),
  'paint.width-3': (paint: Paint) => paint.setBrush(3),
} as const satisfies Partial<Record<SceneCommandId, (paint: Paint) => void>>

export type ScenePaintActionId = keyof typeof SCENE_PAINT_ACTIONS

const isPaintAction = (id: SceneCommandId): id is ScenePaintActionId =>
  Object.hasOwn(SCENE_PAINT_ACTIONS, id)

/** `true` quando a tecla é da aba Pintar: quem chama dá `preventDefault`. */
export function runScenePaintShortcut(
  paint: Paint,
  event: ShortcutEvent,
  can?: SceneToolCheck,
): boolean {
  const match = matchSceneShortcut('paint', event, can)
  if (!match || !isPaintAction(match.id)) return false
  // Segurar a tecla repete o evento: o M ligaria e desligaria o espelho sem parar.
  const repeat = 'repeat' in event && event.repeat === true
  if (match.allowed && !repeat && !paint.drawing && !paint.busy)
    SCENE_PAINT_ACTIONS[match.id](paint)
  return true
}
