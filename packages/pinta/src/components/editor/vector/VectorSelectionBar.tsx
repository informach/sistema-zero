/**
 * Faixa de AÇÕES DA SELEÇÃO do vetor (desktop): alinhar, espelhar, ordem,
 * agrupar, duplicar e apagar. Fica colada embaixo da barra de cima — é uma
 * continuação dela — e só existe quando há algo selecionado.
 *
 * Por que uma faixa e não dentro do `<header>`: são até 16 alvos de 44px
 * (~800px) e o vão livre da barra é ~500px em 1366; ali dentro o `flex-wrap`
 * quebraria a barra em duas linhas de forma imprevisível. A faixa rola de LADO
 * (`overflow-x-auto`), como a caixa horizontal da tela estreita: nunca cresce em
 * altura, nunca rouba altura do palco.
 *
 * É a via do MOUSE. No toque (<768px) quem manda é a barra FLUTUANTE sobre o
 * palco (VectorStage) — as duas nunca coexistem, por isso compartilham o mesmo
 * `aria-label` e os mesmos rótulos `sel*`.
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { ToolButton } from '../../ui/Button'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  ChevronsDown,
  ChevronsUp,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  SendToBack,
  Trash2,
  Ungroup,
} from '../../ui/icons'
import { useVectorEditor } from './VectorEditorScope'

const Divider = (): JSX.Element => (
  <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
)

export function VectorSelectionBar(): JSX.Element | null {
  const {
    selected,
    single,
    alignSelected,
    flipSelected,
    moveOrder,
    groupSelected,
    ungroupSelected,
    duplicateSelected,
    removeSelected,
  } = useVectorEditor()
  if (selected.length === 0) return null

  return (
    <div
      role="toolbar"
      aria-label={COPY.vector.selectionBar}
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b-2 border-pin-border bg-pin-surface px-3 py-1"
    >
      {/* Alinhar: 2+ formas alinham entre si; 1 forma alinha na TELA. */}
      <span className="mr-1 shrink-0 text-sm font-bold text-pin-muted">
        {COPY.vector.alignTitle}
      </span>
      <ToolButton
        icon={AlignStartVertical}
        label={COPY.vector.alignLeft}
        onClick={() => alignSelected('left')}
      />
      <ToolButton
        icon={AlignCenterVertical}
        label={COPY.vector.alignCenterH}
        onClick={() => alignSelected('centerH')}
      />
      <ToolButton
        icon={AlignEndVertical}
        label={COPY.vector.alignRight}
        onClick={() => alignSelected('right')}
      />
      <ToolButton
        icon={AlignStartHorizontal}
        label={COPY.vector.alignTop}
        onClick={() => alignSelected('top')}
      />
      <ToolButton
        icon={AlignCenterHorizontal}
        label={COPY.vector.alignMiddleV}
        onClick={() => alignSelected('middleV')}
      />
      <ToolButton
        icon={AlignEndHorizontal}
        label={COPY.vector.alignBottom}
        onClick={() => alignSelected('bottom')}
      />

      <Divider />

      <ToolButton
        icon={FlipHorizontal2}
        label={COPY.vector.selFlipH}
        onClick={() => flipSelected('h')}
      />
      <ToolButton
        icon={FlipVertical2}
        label={COPY.vector.selFlipV}
        onClick={() => flipSelected('v')}
      />

      <Divider />

      {/* Ordem: só faz sentido com UMA forma (com várias, "frente" é ambíguo). */}
      <ToolButton
        icon={BringToFront}
        label={COPY.vector.toFront}
        disabled={!single}
        onClick={() => moveOrder('front')}
      />
      <ToolButton
        icon={ChevronsUp}
        label={COPY.vector.forward}
        disabled={!single}
        onClick={() => moveOrder(1)}
      />
      <ToolButton
        icon={ChevronsDown}
        label={COPY.vector.backward}
        disabled={!single}
        onClick={() => moveOrder(-1)}
      />
      <ToolButton
        icon={SendToBack}
        label={COPY.vector.toBack}
        disabled={!single}
        onClick={() => moveOrder('back')}
      />

      <Divider />

      {selected.length >= 2 ? (
        <ToolButton icon={Group} label={COPY.vector.selGroup} onClick={groupSelected} />
      ) : null}
      {selected.some((shape) => shape.groupId) ? (
        <ToolButton icon={Ungroup} label={COPY.vector.selUngroup} onClick={ungroupSelected} />
      ) : null}
      <ToolButton icon={Copy} label={COPY.vector.selDuplicate} onClick={duplicateSelected} />
      <ToolButton icon={Trash2} label={COPY.vector.selRemove} onClick={removeSelected} />
    </div>
  )
}
