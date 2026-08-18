/**
 * O guard central do CADEADO do vetor: dado o documento atual e o proposto,
 * alguma forma TRANCADA foi mudada ou removida?
 *
 * Vive num módulo puro (e não espalhado pelos call sites) porque o funil de
 * escrita é um só — `commitShapes` — e é lá que a regra é imposta como
 * backstop. Os gates de UX (seleção, alças, teclado) existem para a criança
 * não "bater no vidro" sem entender; quem garante é este guard.
 *
 * O que a forma trancada PODE: esconder/mostrar (olho), destrancar (cadeado) e
 * mudar de POSIÇÃO na pilha (reordenar preserva a identidade). O que NÃO pode:
 * mudar geometria/estilo/texto/grupo nem sair do documento.
 */
import type { VectorShape } from './model'

/** Igualdade estrutural (os shapes são JSON puro: objetos/arrays/primitivos). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  }
  return false
}

/**
 * Compara IGNORANDO só `locked` e `hidden`: destrancar e esconder são os dois
 * gestos permitidos numa forma trancada. Qualquer outra chave (inclusive
 * `groupId` — agrupar exige destrancar) conta como mudança.
 */
function withoutLockKeys(shape: VectorShape): Record<string, unknown> {
  const { locked: _locked, hidden: _hidden, ...rest } = shape
  return rest
}

export function lockedShapesViolation(current: VectorShape[], next: VectorShape[]): boolean {
  let byId: Map<string, VectorShape> | null = null
  for (const shape of current) {
    if (shape.locked !== true) continue
    // Lazy: documento sem trancada não paga o Map (o caso comum).
    if (!byId) byId = new Map(next.map((s) => [s.id, s]))
    const after = byId.get(shape.id)
    if (!after) return true
    // Fast-path que libera reordenar e editar as formas LIVRES: a trancada
    // atravessa como a MESMA referência (nenhuma op imutável a recria à toa).
    if (after === shape) continue
    if (!deepEqual(withoutLockKeys(shape), withoutLockKeys(after))) return true
  }
  return false
}

/** As formas trancadas de uma lista (helper dos gates de UX). */
export function lockedIdsOf(shapes: VectorShape[]): Set<string> {
  const ids = new Set<string>()
  for (const shape of shapes) {
    if (shape.locked === true) ids.add(shape.id)
  }
  return ids
}
