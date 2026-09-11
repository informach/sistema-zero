/**
 * "+ Nova cor" como GESTO, a lição de 06/09 do editor antigo: o seletor nativo manda um passo a
 * cada arrasto (o React entrega como `onChange`) e fecha uma vez (`change` nativo). Sem gesto,
 * cada pixel arrastado virava uma extra e um passo de desfazer, até o teto de 48.
 *
 * O 1º passo cria a extra (ou só escolhe a cor, se ela já existe); os seguintes TROCAM essa
 * extra no lugar; o fim é UM passo de desfazer. Cor que já existia nunca vira o alvo do gesto:
 * trocá-la mudaria a tinta de outra peça por tabela.
 */

import { normalizeHex } from '../core/color'
import { createGestureCoordinator, type GestureToken } from '../core/gesture'
import { resolvePaletteColors } from '../core/sanitize'
import type { MoldaSceneDocument } from '../scene/document'
import {
  addScenePaletteColor,
  dropLastScenePaletteColor,
  updateScenePaletteColor,
} from '../scene/paletteCommands'
import type { EditorStore } from './editorStore'

export type ScenePaletteStep = { index: number } | { full: true } | null

export function createScenePaletteGesture(editor: EditorStore<MoldaSceneDocument>) {
  const gestures = createGestureCoordinator({
    current: () => editor.getState().asset,
    revision: () => editor.getState().contentRevision,
    preview: (next: MoldaSceneDocument) => editor.getState().replace(next),
    cancel: (before) => editor.getState().cancelGesture(before),
    commit: (before, after) => editor.getState().commitGesture(before, after),
  })
  let active: {
    token: GestureToken<MoldaSceneDocument>
    /** A extra que este gesto criou; `null` enquanto a cor for uma que já existia. */
    index: number | null
    /** Teto batido no meio do gesto: um aviso só, e os passos seguintes são ignorados. */
    full: boolean
  } | null = null

  return {
    active: () => active !== null,
    /** Um passo do seletor: o índice que a cor da criança deve usar agora. */
    step(hex: string): ScenePaletteStep {
      const color = normalizeHex(hex)
      if (!color) return null
      if (active && !gestures.isCurrent(active.token)) active = null
      if (!active) active = { token: gestures.begin(), index: null, full: false }
      const gesture = active
      if (gesture.full) return null
      const current = editor.getState().asset
      if (gesture.index !== null) {
        const existing = resolvePaletteColors(current).indexOf(color)
        if (existing > 0 && existing !== gesture.index) {
          // Arrastou até uma cor que já existe: a extra deste gesto sai e a cor aponta para ela.
          const next = dropLastScenePaletteColor(current, gesture.index)
          if (next !== current) gestures.preview(gesture.token, next)
          gesture.index = null
          return { index: existing }
        }
        const next = updateScenePaletteColor(current, gesture.index, color)
        if (next !== current) gestures.preview(gesture.token, next)
        return { index: gesture.index }
      }
      const result = addScenePaletteColor(current, color)
      if (!result) {
        gesture.full = true
        return { full: true }
      }
      if (result.document !== current) {
        gestures.preview(gesture.token, result.document)
        gesture.index = result.index
      }
      return { index: result.index }
    },
    /** O seletor fechou (ou outra ação começou): UM passo de desfazer. Idempotente. */
    end() {
      const gesture = active
      active = null
      if (gesture) gestures.commit(gesture.token)
    },
  }
}
