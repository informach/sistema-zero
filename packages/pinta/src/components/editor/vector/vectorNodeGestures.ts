/**
 * Geometria PURA dos gestos de edição de pontos. Os nós vivem no espaço LOCAL
 * da forma (sem rotação) — o palco desenha dentro de um `<g transform=rotate>`;
 * o ponteiro e o laço vivem em coordenadas do DOCUMENTO. Estas funções são a
 * ponte entre os dois, e ficam fora do `VectorStage` para ele não crescer mais.
 */
import type { Bounds } from '../../../vector/geometry'
import { boundsCenter, rotatePoint, shapeBounds } from '../../../vector/geometry'
import type { Vec2, VectorShape } from '../../../vector/model'
import type { EditablePath } from '../../../vector/pathNodes'

/** Centro e giro da forma: o que leva um ponto do documento ao espaço dos nós. */
export interface NodeFrame {
  center: Vec2
  rotation: number
}

export function nodeFrameOf(shape: VectorShape): NodeFrame {
  return { center: boundsCenter(shapeBounds(shape)), rotation: shape.rotation }
}

/** Ponteiro (documento) → espaço local dos nós. */
export function toLocalPoint(frame: NodeFrame, at: Vec2): Vec2 {
  return frame.rotation === 0 ? at : rotatePoint(at, frame.center, -frame.rotation)
}

/** Nó (local) → documento, que é onde a caixa do laço é desenhada e medida. */
export function toDocPoint(frame: NodeFrame, p: Vec2): Vec2 {
  return frame.rotation === 0 ? p : rotatePoint(p, frame.center, frame.rotation)
}

/**
 * Índices dos nós dentro da caixa. ⚠️ A comparação é feita em coordenadas do
 * DOCUMENTO (nó girado para lá), e não girando a caixa: uma caixa girada deixa
 * de ser um retângulo e o teste ficaria errado justo nas formas giradas.
 */
export function nodesInBox(path: EditablePath, frame: NodeFrame, box: Bounds): number[] {
  const chosen: number[] = []
  path.nodes.forEach((node, index) => {
    const p = toDocPoint(frame, node.p)
    if (p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height) {
      chosen.push(index)
    }
  })
  return chosen
}

/** Junta ou substitui a escolha de nós (Shift acrescenta, como nas formas). */
export function mergeNodeSelection(
  current: readonly number[],
  hit: readonly number[],
  additive: boolean,
): number[] {
  if (!additive) return [...hit]
  return [...new Set([...current, ...hit])].sort((a, b) => a - b)
}
