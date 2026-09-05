/**
 * Painel de CAMADAS do vetor (molde visual do LayerPanel do pixel): uma linha
 * por FORMA, a de cima primeiro (como a criança vê o desenho). Cada linha tem
 * o olho (mostrar/esconder — escondida some do palco E de todo export), a
 * miniatura, o nome do tipo e a alça de arrastar (reordenar = mudar a ordem
 * de empilhamento; a alça focada aceita ↑/↓ pelo teclado).
 *
 * Sem "+" nem lixeira no cabeçalho: criar É desenhar, e apagar mora nas ações
 * da seleção. Clicar numa linha seleciona a forma (grupo inteiro, como no
 * palco). Arrastar fecha com UMA entrada de undo (replace por cruzamento +
 * commitGesture no solto).
 *
 * ⚠️ Forma AGRUPADA anda junto aqui também: arrastar (ou ↑/↓) uma linha do
 * grupo leva o grupo inteiro, coerente com o clique que seleciona o grupo todo.
 * A faixa colorida à esquerda da linha é o aviso de que ela não anda sozinha.
 */
import { clsx } from 'clsx'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { VectorShape } from '../../../vector/model'
import { dropShapesOrder } from '../../../vector/order'
import { GradientDefs, ShapeElement } from '../../../vector/VectorFrameSvg'
import { ToolButton } from '../../ui/Button'
import { Eye, EyeOff, GripVertical, Lock, LockOpen } from '../../ui/icons'
import { Panel, type PanelDisclosure } from '../../ui/Panel'
import { useEditorStores } from '../editorContext'
import { addPointerDragListeners } from '../pointerDrag'
import { useVectorEditor } from './VectorEditorScope'
import { expandToGroups } from './vectorTools'

/** Miniatura da forma no enquadramento do documento (mostra até as escondidas). */
function ShapeThumb({
  shape,
  width,
  height,
}: {
  shape: VectorShape
  width: number
  height: number
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="size-8 shrink-0 overflow-hidden rounded-md border-2 border-pin-border bg-white"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <GradientDefs shapes={[shape]} />
        <ShapeElement shape={shape} />
      </svg>
    </span>
  )
}

/**
 * Nome amigável da forma. Texto mostra "Texto: <conteúdo>" (o conteúdo cru
 * colidiria com o próprio <text> do palco nos leitores/nos testes).
 */
function shapeLabel(shape: VectorShape): string {
  if (shape.type === 'text') return `${COPY.vector.shapeNames.text}: ${shape.text}`
  return COPY.vector.shapeNames[shape.type] ?? shape.type
}

export function VectorLayerPanel({
  disclosure,
}: {
  disclosure?: PanelDisclosure
} = {}): JSX.Element | null {
  const { editor } = useEditorStores()
  const { doc, selectedIds, setSelectedIds, currentShapes, commitShapes } = useVectorEditor()
  /** Forma sendo arrastada (id) — só para o feedback visual. */
  const [dragging, setDragging] = useState<string | null>(null)
  const rowsRef = useRef<HTMLUListElement | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => dragCleanupRef.current?.(), [])

  // Documento vazio: painel some (nada para listar; desenhar já o traz).
  if (doc.shapes.length === 0) return null

  // De cima para baixo, como a criança vê o desenho (fim do array = topo).
  const rows = [...doc.shapes].reverse()
  /** Grupo da linha em arrasto: o bloco inteiro se acende, mesmo no movimento fino. */
  const draggingGroup = dragging ? doc.shapes.find((s) => s.id === dragging)?.groupId : undefined

  function selectShape(shape: VectorShape): void {
    // Grupo inteiro, consistente com o clique no palco.
    setSelectedIds(expandToGroups(currentShapes(), [shape.id]))
  }

  function toggleHidden(shape: VectorShape): void {
    const nowHidden = shape.hidden !== true
    commitShapes(
      currentShapes().map((s) => {
        if (s.id !== shape.id) return s
        if (nowHidden) return { ...s, hidden: true }
        const { hidden: _drop, ...rest } = s
        return rest as VectorShape
      }),
    )
    // Esconder tira da seleção (mexer no invisível assustaria).
    if (nowHidden) setSelectedIds((current) => current.filter((id) => id !== shape.id))
  }

  /**
   * Cadeado da forma (espelho exato do olho): trancada não muda nem sai do
   * desenho — mas CONTINUA no export/prévia (lock ≠ hidden). O guard do
   * `commitShapes` deixa passar porque só a chave `locked` muda.
   */
  function toggleLocked(shape: VectorShape): void {
    const nowLocked = shape.locked !== true
    commitShapes(
      currentShapes().map((s) => {
        if (s.id !== shape.id) return s
        if (nowLocked) return { ...s, locked: true }
        const { locked: _drop, ...rest } = s
        return rest as VectorShape
      }),
    )
    // Trancar tira da seleção de AÇÃO (mover/apagar não a alcançam mais); a
    // linha do painel segue selecionável para destrancar.
    if (nowLocked) setSelectedIds((current) => current.filter((id) => id !== shape.id))
  }

  /**
   * Um passo pela ALÇA (+1 = linha acima no painel). Usa a mesma régua do
   * arrasto: sobre irmã move só a forma; sobre externa move o grupo inteiro.
   * Os quatro botões da faixa continuam grossos via `moveShapesOrder`.
   */
  function moveFromHandle(shape: VectorShape, delta: 1 | -1): void {
    const shapes = currentShapes()
    const index = shapes.findIndex((candidate) => candidate.id === shape.id)
    if (index === -1) return
    const over = shapes[index + delta]
    if (!over) return
    const next = dropShapesOrder(shapes, [shape.id], over.id)
    if (next) commitShapes(next)
  }

  /**
   * Arrastar pela alça: ao passar do meio da linha vizinha, troca de posição
   * na hora (sem fantasma flutuante). Cada cruzamento pinta via `replace`;
   * soltar fecha com `commitGesture` = UMA entrada de undo por arrasto.
   */
  function handleDragStart(shape: VectorShape, event: ReactPointerEvent<HTMLElement>): void {
    event.preventDefault()
    dragCleanupRef.current?.()
    setDragging(shape.id)
    const handle = event.currentTarget
    handle.setPointerCapture?.(event.pointerId)
    const base = editor.getState().asset

    const onMove = (moveEvent: PointerEvent): void => {
      const list = rowsRef.current
      if (!list) return
      const items = Array.from(list.querySelectorAll<HTMLLIElement>('li[data-shape]'))
      const overIndex = items.findIndex((item) => {
        const rect = item.getBoundingClientRect()
        return moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom
      })
      const overId = items[overIndex]?.dataset.shape
      if (!overId) return
      // Irmão = movimento fino; linha externa = grupo inteiro. A mesma operação
      // pura atende o ponteiro e as setas da alça.
      const next = dropShapesOrder(currentShapes(), [shape.id], overId)
      if (next) commitShapes(next, false)
    }
    const onUp = (): void => {
      setDragging(null)
      dragCleanupRef.current = null
      // No-op quando nada cruzou (commitGesture ignora base === atual).
      editor.getState().commitGesture(base)
    }
    dragCleanupRef.current = addPointerDragListeners(document, { onMove, onEnd: onUp })
  }

  return (
    <Panel title={COPY.layers.title} className="w-68 shrink-0" disclosure={disclosure}>
      <ul ref={rowsRef} className="flex max-h-48 flex-col gap-1 overflow-y-auto p-0.5">
        {rows.map((shape) => {
          const active = selectedIds.includes(shape.id)
          const visible = shape.hidden !== true
          const label = shapeLabel(shape)
          const grouped = shape.groupId !== undefined
          // O grupo inteiro se acende para antecipar o movimento ao cruzar para fora.
          const moving =
            dragging !== null &&
            (shape.id === dragging || (grouped && shape.groupId === draggingGroup))
          return (
            <li
              key={shape.id}
              data-shape={shape.id}
              className={clsx(
                'flex items-center gap-1 rounded-xl border-2 pr-1 transition',
                active ? 'border-pin-accent' : 'border-transparent',
                moving && 'opacity-60',
              )}
            >
              {grouped ? (
                <span
                  aria-hidden="true"
                  className="my-1.5 ml-0.5 w-1 shrink-0 self-stretch rounded-full bg-pin-accent/50"
                />
              ) : null}
              <ToolButton
                icon={visible ? Eye : EyeOff}
                label={`${visible ? COPY.layers.hide : COPY.layers.show}: ${label}`}
                onClick={() => toggleHidden(shape)}
              />
              <ToolButton
                icon={shape.locked === true ? Lock : LockOpen}
                label={`${shape.locked === true ? COPY.layers.unlock : COPY.layers.lock}: ${label}`}
                onClick={() => toggleLocked(shape)}
              />
              <button
                type="button"
                aria-pressed={active}
                // "Selecionar: Retângulo" — distinto do botão de FERRAMENTA
                // "Retângulo" da caixa (leitor de tela e testes agradecem).
                aria-label={`${COPY.vector.select}: ${label}`}
                onClick={() => selectShape(shape)}
                title={label}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left transition hover:bg-pin-border/40"
              >
                <ShapeThumb shape={shape} width={doc.width} height={doc.height} />
                <span
                  className={clsx(
                    'min-w-0 flex-1 truncate text-sm font-bold',
                    visible ? 'text-pin-text' : 'text-pin-muted',
                  )}
                >
                  {label}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${grouped ? COPY.layers.reorderGroup : COPY.layers.reorderShape}: ${label}`}
                title={grouped ? COPY.layers.reorderGroup : COPY.layers.reorderShape}
                onPointerDown={(event) => handleDragStart(shape, event)}
                onKeyDown={(event) => {
                  // Teclado é a via acessível do arrastar.
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    moveFromHandle(shape, 1)
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    moveFromHandle(shape, -1)
                  }
                }}
                className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-pin-muted transition hover:bg-pin-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
              >
                <GripVertical aria-hidden="true" className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
