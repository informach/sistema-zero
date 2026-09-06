/**
 * A caixa de ferramentas do sub-modo EDITAR MALHA (no lugar da do Montar
 * enquanto uma peça de malha está aberta): o que um toque escolhe (Pontos,
 * Arestas, Faces), "Somar à seleção" (o Shift para o toque), as ferramentas de
 * forma (Puxar, Cortar no meio, Juntar pontos, Fechar face, Virar face, Dividir),
 * Apagar seleção e Pronto. Depois de um Puxar, o painel "Ajustar" reexecuta a
 * operação com outra distância sobre o "antes" (um passo só no desfazer).
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MeshSelectMode } from '../../../state/sessionStore'
import { ToolButton } from '../../ui/Button'
import {
  ArrowUpFromLine,
  Check,
  Circle,
  FlipVertical2,
  Merge,
  Minus,
  Plus,
  Scissors,
  Square,
  SquarePlus,
  Trash2,
  Triangle,
} from '../../ui/icons'
import { Stepper } from '../../ui/Stepper'

const MODE_ICONS = { vertex: Circle, edge: Minus, face: Square } as const
const MODE_SHORTCUTS: Record<MeshSelectMode, string> = { vertex: '1', edge: '2', face: '3' }
const MODES: MeshSelectMode[] = ['vertex', 'edge', 'face']

export interface MeshAdjust {
  distance: number
  snap: number
  onDistance: (distance: number) => void
}

export interface MeshToolboxProps {
  mode: MeshSelectMode
  onMode: (mode: MeshSelectMode) => void
  additive: boolean
  onToggleAdditive: () => void
  /** Quantos itens do modo atual estão escolhidos (o rótulo da seleção). */
  selectedCount: number
  canExtrude: boolean
  canLoopCut: boolean
  canMerge: boolean
  canCreateFace: boolean
  canFlip: boolean
  canSplit: boolean
  onExtrude: () => void
  onLoopCut: () => void
  onMerge: () => void
  onCreateFace: () => void
  onFlip: () => void
  onSplit: () => void
  /** O "Ajustar" do último Puxar (some quando qualquer outra coisa muda). */
  adjust: MeshAdjust | null
  onDeleteSelection: () => void
  onDone: () => void
}

export function MeshToolbox(props: MeshToolboxProps): JSX.Element {
  const copy = COPY.editor.model.mesh
  return (
    <aside
      aria-label={copy.toolbox}
      className="mld-scroll-y flex w-28 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-mld-border bg-mld-surface p-2"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
          {copy.toolbox}
        </legend>
        <div className="grid grid-cols-2 gap-1">
          {MODES.map((mode) => (
            <ToolButton
              key={mode}
              icon={MODE_ICONS[mode]}
              label={copy.modes[mode]}
              shortcut={MODE_SHORTCUTS[mode]}
              active={props.mode === mode}
              onClick={() => props.onMode(mode)}
            />
          ))}
          <ToolButton
            icon={Plus}
            label={copy.additive}
            shortcut="Shift"
            active={props.additive}
            onClick={props.onToggleAdditive}
          />
        </div>
      </fieldset>
      <p className="px-1 text-xs font-bold text-mld-muted">
        {props.selectedCount > 0
          ? copy.selected(props.selectedCount, props.mode)
          : copy.nothingSelected}
      </p>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{copy.toolsLegend}</legend>
        <div className="grid grid-cols-2 gap-1">
          <ToolButton
            icon={ArrowUpFromLine}
            label={copy.tools.extrude}
            disabled={!props.canExtrude}
            onClick={props.onExtrude}
          />
          <ToolButton
            icon={Scissors}
            label={copy.tools.loopCut}
            disabled={!props.canLoopCut}
            onClick={props.onLoopCut}
          />
          <ToolButton
            icon={Merge}
            label={copy.tools.merge}
            disabled={!props.canMerge}
            onClick={props.onMerge}
          />
          <ToolButton
            icon={SquarePlus}
            label={copy.tools.createFace}
            disabled={!props.canCreateFace}
            onClick={props.onCreateFace}
          />
          <ToolButton
            icon={FlipVertical2}
            label={copy.tools.flip}
            disabled={!props.canFlip}
            onClick={props.onFlip}
          />
          <ToolButton
            icon={Triangle}
            label={copy.tools.split}
            disabled={!props.canSplit}
            onClick={props.onSplit}
          />
        </div>
      </fieldset>
      {props.adjust ? (
        <section
          aria-label={copy.adjust}
          className="flex flex-col gap-1 rounded-xl border-2 border-mld-border bg-mld-bg p-1"
        >
          <span className="px-1 text-[0.65rem] font-bold uppercase tracking-wide text-mld-muted">
            {copy.adjust}
          </span>
          <Stepper
            label={copy.distance}
            value={props.adjust.distance}
            step={props.adjust.snap}
            min={props.adjust.snap}
            max={MOLDA_LIMITS.maxPartSize}
            onChange={props.adjust.onDistance}
          />
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-1">
        <ToolButton
          icon={Trash2}
          label={copy.deleteSelection}
          shortcut="Delete"
          disabled={props.selectedCount === 0}
          onClick={props.onDeleteSelection}
        />
        <ToolButton icon={Check} label={copy.done} shortcut="Esc" onClick={props.onDone} />
      </div>
      <p className="px-1 text-xs text-mld-text-soft">{copy.hint}</p>
    </aside>
  )
}
