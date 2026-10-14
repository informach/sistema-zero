'use client'

import { Button } from '@sistemazero/ui'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { X } from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ANNOTATION_COLORS,
  ANNOTATION_WIDTHS,
  type AnnotationPoint,
  type AnnotationSurface,
  type AnnotationTool,
  type AnnotationWidth,
  annotationShortcut,
  previewScale,
  toBoxPoint,
  toCanvasPoint,
} from '../../lib/live/annotation'
import { annotationFont, type ScreenAnnotation } from '../../lib/live/screen-annotation'
import { LiveAnnotationToolbar, useAnnotationState } from './live-annotation-toolbar'

interface TextDraft {
  id: number
  at: AnnotationPoint
  left: number
  top: number
  /** Quanto um pixel do compositor mede na prévia. */
  scale: number
}

const CURSOR: Partial<Record<AnnotationTool, string>> = { laser: 'none', text: 'text' }

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

/**
 * O modo desenho da professora: a prévia GRANDE da imagem que sai para a turma (o próprio canvas
 * do compositor) com a barra de ferramentas em cima. O ponteiro vira coordenada do compositor
 * (`toCanvasPoint`), então o que ela desenha aqui é o que a turma vê e o que fica na gravação.
 * Sair (Esc) não apaga o desenho; quem apaga é "Limpar tudo" ou a borracha.
 */
export function LiveAnnotationStage({
  annotation,
  open,
  busy = false,
  onClose,
  onShareScreen,
}: {
  annotation: ScreenAnnotation
  open: boolean
  busy?: boolean
  onClose(): void
  /** Sem tela ainda: escolher a aba de demonstração (o navegador pergunta qual). */
  onShareScreen(): void
}) {
  const state = useAnnotationState(annotation)
  const [tool, setTool] = useState<AnnotationTool>('pen')
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0].value)
  const [width, setWidth] = useState<AnnotationWidth>('medium')
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null)
  const card = useModalA11y<HTMLDivElement>({ open, onClose })
  const box = useRef<HTMLDivElement>(null)
  const textInput = useRef<HTMLInputElement>(null)
  const draftRef = useRef<TextDraft | null>(null)
  draftRef.current = textDraft
  const styleRef = useRef({ color, width })
  styleRef.current = { color, width }
  const gesture = useRef<number | null>(null)
  const newTrail = useRef(true)
  const frame = useRef<number | null>(null)
  const sequence = useRef(0)

  // O canvas do compositor entra na caixa enquanto o modo desenho está aberto.
  useEffect(() => {
    const host = box.current
    if (!open || !host) return
    const canvas = annotation.canvas
    Object.assign(canvas.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    })
    canvas.setAttribute('aria-hidden', 'true')
    host.prepend(canvas)
    return () => {
      canvas.remove()
    }
  }, [annotation, open])

  const paint = useCallback(() => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      annotation.render()
    })
  }, [annotation])
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    },
    [],
  )

  const commitText = useCallback(() => {
    const draft = draftRef.current
    if (!draft) return
    draftRef.current = null
    const value = textInput.current?.value ?? ''
    setTextDraft(null)
    if (value.trim()) {
      annotation.addText(draft.at, value, styleRef.current)
      paint()
    }
  }, [annotation, paint])

  const chooseSurface = useCallback(
    (surface: AnnotationSurface) => {
      commitText()
      if (surface === 'screen' && !annotation.getState().hasScreen) {
        onShareScreen()
        return
      }
      annotation.setSurface(surface)
    },
    [annotation, commitText, onShareScreen],
  )

  // Sai do modo desenho no meio de um gesto: o gesto não fica pela metade na transmissão.
  useEffect(() => {
    if (open) return
    annotation.cancel()
    gesture.current = null
    draftRef.current = null
    setTextDraft(null)
  }, [annotation, open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const command = annotationShortcut(event)
      // O Esc é do `useModalA11y` (fecha e devolve o foco ao botão que abriu).
      if (!command || command.type === 'exit') return
      event.preventDefault()
      if (command.type === 'undo') {
        annotation.undo()
        paint()
      } else if (command.type === 'surface')
        chooseSurface(annotation.getState().surface === 'board' ? 'screen' : 'board')
      else setTool(command.tool)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [annotation, chooseSurface, open, paint])

  useEffect(() => {
    if (textDraft) textInput.current?.focus()
  }, [textDraft])

  if (!open) return null

  const size = { width: annotation.width, height: annotation.height }
  const pointFrom = (event: { clientX: number; clientY: number }) => {
    const rect = annotation.canvas.getBoundingClientRect()
    return toCanvasPoint({ x: event.clientX, y: event.clientY }, rect, size)
  }
  const samples = (event: ReactPointerEvent) => {
    const coalesced = event.nativeEvent.getCoalescedEvents?.()
    return coalesced?.length ? coalesced : [event]
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target === textInput.current) return
    // Sem isto o clique tira o foco do campo de texto e seleciona a página.
    event.preventDefault()
    const point = pointFrom(event)
    if (tool === 'text') {
      commitText()
      if (!point.inside) return
      const rect = annotation.canvas.getBoundingClientRect()
      const place = toBoxPoint(point, rect, size)
      setTextDraft({
        id: ++sequence.current,
        at: { x: point.x, y: point.y },
        left: place.x,
        top: place.y,
        scale: previewScale(rect, size),
      })
      return
    }
    commitText()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    if (tool === 'laser') {
      annotation.pointLaser(point, color, true)
      newTrail.current = false
      gesture.current = event.pointerId
      paint()
      return
    }
    if (!point.inside) return
    gesture.current = event.pointerId
    annotation.begin(tool, { x: point.x, y: point.y }, { color, width })
    paint()
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tool === 'laser') {
      // A luz mágica acompanha o mouse mesmo sem apertar; no toque, só arrastando.
      if (event.pointerType === 'touch' && gesture.current !== event.pointerId) return
      for (const sample of samples(event)) {
        annotation.pointLaser(pointFrom(sample), color, newTrail.current)
        newTrail.current = false
      }
      paint()
      return
    }
    if (gesture.current !== event.pointerId) return
    for (const sample of samples(event)) {
      const point = pointFrom(sample)
      annotation.move({ x: point.x, y: point.y })
    }
    paint()
  }
  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (gesture.current !== event.pointerId) return
    gesture.current = null
    if (tool === 'laser') {
      newTrail.current = true
      return
    }
    if (cancelled) annotation.cancel()
    else annotation.end()
    paint()
  }

  return (
    <div
      ref={card}
      role="dialog"
      aria-modal="true"
      aria-label="Desenhar sobre a imagem da turma"
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex flex-col gap-2 bg-neutral-950 p-2 outline-none sm:p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="px-1 text-sm font-bold text-white" role="status">
          {state.surface === 'board'
            ? 'A turma vê o quadro branco com o seu desenho.'
            : 'A turma vê a sua tela com o seu desenho.'}
        </p>
        <Button
          className="min-h-11 gap-2 px-3"
          variant="secondary"
          aria-keyshortcuts="Escape"
          title="Sair do desenho (Esc). O desenho continua na transmissão até você limpar."
          onClick={onClose}
        >
          <X className="size-5" />
          Sair do desenho
        </Button>
      </div>
      <LiveAnnotationToolbar
        state={state}
        tool={tool}
        color={color}
        width={width}
        busy={busy}
        onTool={(next) => {
          commitText()
          setTool(next)
        }}
        onColor={setColor}
        onWidth={setWidth}
        onUndo={() => {
          commitText()
          annotation.undo()
          paint()
        }}
        onClear={() => {
          commitText()
          annotation.clear()
          paint()
        }}
        onSurface={chooseSurface}
        onBoardTheme={(theme) => annotation.setBoardTheme(theme)}
      />
      <div
        ref={box}
        data-annotation-surface
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ cursor: CURSOR[tool] ?? 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event, false)}
        onPointerCancel={(event) => finish(event, true)}
        onPointerLeave={() => {
          newTrail.current = true
        }}
      >
        {textDraft ? (
          <input
            key={textDraft.id}
            ref={textInput}
            aria-label="Texto para escrever na imagem"
            maxLength={120}
            className="absolute min-w-40 rounded border-2 border-dashed bg-black/20 px-1 outline-none"
            style={{
              left: textDraft.left,
              top: textDraft.top,
              color,
              borderColor: color,
              font: annotationFont(Math.max(14, ANNOTATION_WIDTHS[width].text * textDraft.scale)),
              lineHeight: 1.1,
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitText()
              } else if (event.key === 'Escape') {
                // Esc no texto desiste do texto, não sai do modo desenho.
                event.preventDefault()
                event.stopPropagation()
                // No app o React escuta no próprio `document`, onde o `useModalA11y` também escuta.
                event.nativeEvent.stopImmediatePropagation()
                draftRef.current = null
                setTextDraft(null)
              }
            }}
            onBlur={commitText}
          />
        ) : null}
      </div>
    </div>
  )
}
