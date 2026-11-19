/**
 * Guarda dos commits do editor de mapa: gravar um mapa IGUAL ao de agora criaria um
 * desfazer que não desfaz nada e sujaria o salvamento sem motivo.
 */
import type { PintaAsset } from '../../../core/project'
import type { PintaEditorState } from '../../../state/editorStore'

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a instanceof Int16Array && b instanceof Int16Array)
    return a.length === b.length && a.every((v, i) => v === b[i])
  return false
}

function sameShallow(a: object, b: object): boolean {
  const ka = Object.keys(a),
    kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  const ra = a as Record<string, unknown>,
    rb = b as Record<string, unknown>
  return ka.every((k) => Object.hasOwn(rb, k) && sameValue(ra[k], rb[k]))
}

/** O mesmo desenho, mesmo que o objeto seja outro (compara as casas das camadas de peças). */
export function sameAssetContent(a: PintaAsset, b: PintaAsset): boolean {
  if (a === b) return true
  if (a.kind !== 'tilemap' || b.kind !== 'tilemap') return false
  const { layers: la, ...restA } = a,
    { layers: lb, ...restB } = b
  return (
    sameShallow(restA, restB) &&
    la.length === lb.length &&
    la.every((layer, i) => {
      const other = lb[i]
      return other !== undefined && (layer === other || sameShallow(layer, other))
    })
  )
}

/** Grava com desfazer só quando mudou de verdade. Devolve se gravou. */
export function commitIfChanged(state: PintaEditorState, next: PintaAsset): boolean {
  if (sameAssetContent(state.asset, next)) return false
  return state.commit(next)
}
