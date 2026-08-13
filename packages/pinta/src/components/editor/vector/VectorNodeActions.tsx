import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { ToolButton } from '../../ui/Button'
import {
  Circle,
  Link2,
  Minus,
  Scissors,
  Spline,
  Square,
  Trash2,
  Unlink2,
  Waves,
} from '../../ui/icons'
import { useVectorEditor } from './VectorEditorScope'

const Divider = (): JSX.Element => (
  <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
)

/** Ações de edição de nós compartilhadas pelas barras desktop e touch. */
export function VectorNodeActions({
  showHint = false,
}: {
  showHint?: boolean
}): JSX.Element | null {
  const {
    nodePath,
    selectedNodes,
    removeSelectedNodes,
    toggleNodePathClosed,
    cutNodePath,
    setSelectedSegmentsCurved,
    setSelectedNodesSmooth,
    simplifyNodePath,
  } = useVectorEditor()
  if (!nodePath) return null
  const noNodes = selectedNodes.length === 0
  /**
   * Com ponto escolhido o botão vira TESOURA e age NAQUELE ponto. Com 2+ ele
   * fica desligado: o ícone promete "cortar aqui" e não existe um "aqui" — e a
   * criança escapa tocando num ponto só. Sem nenhum ponto, é o interruptor de
   * fechar/abrir de sempre.
   */
  const cutting = !noNodes
  const manyNodes = selectedNodes.length > 1

  return (
    <>
      <ToolButton
        icon={cutting ? Scissors : nodePath.closed ? Unlink2 : Link2}
        label={
          cutting
            ? nodePath.closed
              ? COPY.vector.nodeOpenHere
              : COPY.vector.nodeCut
            : nodePath.closed
              ? COPY.vector.nodeOpen
              : COPY.vector.nodeClose
        }
        disabled={manyNodes}
        onClick={cutting ? cutNodePath : toggleNodePathClosed}
      />
      <ToolButton
        icon={Trash2}
        label={COPY.vector.nodeRemove}
        disabled={noNodes}
        onClick={removeSelectedNodes}
      />
      <Divider />
      <ToolButton
        icon={Spline}
        label={COPY.vector.nodeToCurve}
        disabled={noNodes}
        onClick={() => setSelectedSegmentsCurved(true)}
      />
      <ToolButton
        icon={Minus}
        label={COPY.vector.nodeToLine}
        disabled={noNodes}
        onClick={() => setSelectedSegmentsCurved(false)}
      />
      <Divider />
      <ToolButton
        icon={Circle}
        label={COPY.vector.nodeSmooth}
        disabled={noNodes}
        onClick={() => setSelectedNodesSmooth(true)}
      />
      <ToolButton
        icon={Square}
        label={COPY.vector.nodeCorner}
        disabled={noNodes}
        onClick={() => setSelectedNodesSmooth(false)}
      />
      <Divider />
      <ToolButton icon={Waves} label={COPY.vector.nodeSimplify} onClick={simplifyNodePath} />
      {showHint ? (
        <>
          <Divider />
          <span className="shrink-0 text-sm text-pin-muted">{COPY.vector.nodeHint}</span>
        </>
      ) : null}
    </>
  )
}
