'use client'

import { GripHorizontal, Minimize2, MoveHorizontal, Play } from 'lucide-react'
import {
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '../lib/cn'
import {
  clampFloatWidth,
  defaultFloatGeometry,
  FLOAT_MARGIN,
  FLOAT_RESIZE_STEP,
  FLOAT_TOP_INSET,
  type FloatCorner,
  type FloatGeometry,
  type FloatViewport,
  floatRect,
  floatStorageKey,
  floatWidthLimits,
  gripSide,
  moveCorner,
  nearestCorner,
  nextCorner,
  readFloatGeometry,
  resizedWidth,
  serializeFloatGeometry,
  topInsetBelow,
} from '../lib/lesson-video-float'

/**
 * O VÍDEO FLUTUANTE da aula (03/10/2026). Relato que o originou: a criança deu play, o vídeo
 * mandou ampliar a tela, a tela ampliada cobriu o vídeo e ela ficou sem saber o que fazer.
 *
 * Com uma atividade ampliada e o vídeo da seção TOCANDO, o mesmo vídeo aparece pequeno por cima
 * (estilo picture-in-picture, mas dentro da página), arrastável e redimensionável. Parado, ele
 * vira a pílula "Vídeo", que o abre.
 *
 * ⚠️⚠️ O vídeo NUNCA muda de lugar no DOM: o SDK do Vimeo é o dono do iframe (invariante 6) e
 * mover o nó recarregaria o vídeo. Flutuar é só trocar a classe e o `style` da MOLDURA para
 * `position: fixed`; a barra, o anúncio e a guarda de foco entram como irmãos condicionais, e o
 * corpo (onde mora o player) fica sempre na mesma posição entre os filhos.
 */

export type VideoFloatMode = 'floating' | 'pill' | null

export type VideoFloatSlot = {
  mode: VideoFloatMode
  viewerId: string | null
  onMinimize: () => void
  onOpen: () => void
}

/** Provido pelo `BlockScope` em volta de cada bloco de vídeo da aula; fora dela, nada flutua. */
export const LessonVideoFloatContext = createContext<VideoFloatSlot | null>(null)

/**
 * Marca o lugar do vídeo para quem torna o RESTO da página inerte (o jogo pronto ampliado): sem
 * isso o flutuante ficava visível e sem receber clique.
 */
export const LESSON_FLOAT_ROOT_ATTR = 'data-sz-lesson-float-root'

/**
 * Marca a SAÍDA de cada tela ampliada ("Voltar à aula", "Reduzir") enquanto ela está ampliada:
 * o vídeo nos cantos de cima começa logo abaixo dela. Achado no navegador (03/10/2026): com um
 * número fixo, o vídeo cobria o "Voltar à aula" do jogo pronto em qualquer largura. É também
 * para onde a guarda de foco do fim do vídeo leva o Tab.
 */
export const EXPANDED_EXIT_ATTR = 'data-sz-expanded-exit'

/**
 * O VALOR do marcador na saída de um EDITOR (Estúdio, Pinta): a barra de ferramentas dele começa
 * logo abaixo, então quem ainda não escolheu um canto ganha o de baixo.
 */
export const EXPANDED_EXIT_EDITOR = 'editor'

/** Marca o flutuante e a pílula para o `useModalA11y` incluí-los no Tab da tela ampliada. */
const COMPANION = { 'data-sz-modal-companion': '' }

/** A guarda de foco do fim do vídeo (o `useModalA11y` a deixa fora da roda). */
const FOCUS_GUARD = { 'data-sz-focus-guard': '' }

/**
 * Outro diálogo aberto por cima (confirmar o envio, celebração, diálogo do Pinta). As telas
 * ampliadas também são `aria-modal`, e ficam de fora pela classe delas.
 */
const FOREIGN_MODAL = '[aria-modal="true"]:not(.sz-activity-workspace--expanded)'

export function LessonVideoFrame({ children }: { children: ReactNode }) {
  const slot = useContext(LessonVideoFloatContext)
  if (!slot) return children
  return <FloatSlot slot={slot}>{children}</FloatSlot>
}

/** A área em que o `fixed` mora: sem a barra de rolagem (o `innerWidth` a inclui). */
function measureViewport(): FloatViewport {
  const root = document.documentElement
  let exitBottom: number | null = null
  let prefersBottom = false
  for (const exit of document.querySelectorAll<HTMLElement>(`[${EXPANDED_EXIT_ATTR}]`)) {
    const box = exit.getBoundingClientRect()
    if (box.height <= 0) continue
    exitBottom = Math.max(exitBottom ?? 0, box.bottom)
    if (exit.getAttribute(EXPANDED_EXIT_ATTR) === EXPANDED_EXIT_EDITOR) prefersBottom = true
  }
  return {
    width: root.clientWidth || window.innerWidth,
    height: root.clientHeight || window.innerHeight,
    topInset: topInsetBelow(exitBottom),
    prefersBottom,
  }
}

// No servidor nada flutua; no navegador a medida precisa vir ANTES do primeiro quadro.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function useViewport(active: boolean): FloatViewport {
  const [viewport, setViewport] = useState<FloatViewport>(() =>
    typeof window === 'undefined' ? { width: 1024, height: 768 } : measureViewport(),
  )
  // ⚠️ Medido antes de pintar (full review de 03/10/2026): com `useEffect`, o primeiro quadro
  // usava a medida velha (sem a saída) e o vídeo nascia por cima do "Voltar à aula".
  useBrowserLayoutEffect(() => {
    if (!active) return
    const update = () => setViewport(measureViewport())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [active])
  return viewport
}

/**
 * Enquanto outro diálogo estiver aberto, o vídeo some (e segue tocando): por cima ele cobria o
 * "Enviar para o professor?" do Estúdio e o diálogo do Pinta, e entrava no Tab deles.
 */
function useForeignModalOpen(active: boolean): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!active || typeof MutationObserver === 'undefined') {
      setOpen(false)
      return
    }
    const check = () => setOpen(document.querySelector(FOREIGN_MODAL) !== null)
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    })
    return () => observer.disconnect()
  }, [active])
  return active && open
}

/** `null` = ainda não escolheu: o padrão depende da tela ampliada (ver `defaultFloatGeometry`). */
function readSaved(key: string | null): FloatGeometry | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? readFloatGeometry(raw, defaultFloatGeometry(window.innerWidth)) : null
  } catch {
    return null
  }
}

function focusExpandedExit() {
  for (const exit of document.querySelectorAll<HTMLElement>(`[${EXPANDED_EXIT_ATTR}]`)) {
    if (exit.getBoundingClientRect().height > 0) {
      exit.focus()
      return
    }
  }
}

type Gesture = {
  /** `move` e `resize` são do flutuante; `pill` é a pílula sendo levada a outro canto. */
  kind: 'move' | 'resize' | 'pill'
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  boxWidth: number
  boxHeight: number
  startWidth: number
  moved: boolean
}

/** Abaixo disto o toque é um toque, não um arrasto. */
const DRAG_THRESHOLD = 6

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

const CORNER_LABEL: Record<FloatCorner, string> = {
  'top-left': 'em cima, à esquerda',
  'top-right': 'em cima, à direita',
  'bottom-left': 'embaixo, à esquerda',
  'bottom-right': 'embaixo, à direita',
}

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function FloatSlot({ slot, children }: { slot: VideoFloatSlot; children: ReactNode }) {
  const active = slot.mode !== null
  const floating = slot.mode === 'floating'
  const pill = slot.mode === 'pill'
  const viewport = useViewport(active)
  const covered = useForeignModalOpen(active)
  const storageKey = floatStorageKey(slot.viewerId)
  // Lido na montagem: nada aqui é desenhado no servidor, então não há o que desencontrar.
  const [chosen, setChosen] = useState<FloatGeometry | null>(() => readSaved(storageKey))
  const geometry = chosen ?? defaultFloatGeometry(viewport.width, viewport.prefersBottom)
  const [drag, setDrag] = useState<{ left: number; top: number } | null>(null)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [settled, setSettled] = useState(false)
  const [announce, setAnnounce] = useState('')
  const gesture = useRef<Gesture | null>(null)
  const suppressPillClick = useRef(false)
  const frame = useRef<HTMLDivElement>(null)
  const moveHandle = useRef<HTMLButtonElement>(null)
  const pillButton = useRef<HTMLButtonElement>(null)
  const hintId = useId()

  // O lugar do vídeo na aula guarda a altura enquanto ele flutua (o truque do `SceneWorkspace`):
  // sem isso a aula embaixo da tela ampliada encolhia e a rolagem pulava ao voltar.
  const inlineHeight = useRef(0)
  useEffect(() => {
    const element = frame.current
    if (!element || floating || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      inlineHeight.current = element.offsetHeight
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [floating])

  // Trocar de modo encerra qualquer gesto: um arrasto interrompido (Esc, um segundo dedo no
  // "Voltar à aula") deixava o vídeo preso no lugar solto e o player sem clique.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é a troca de modo
  useEffect(() => {
    gesture.current = null
    setDrag(null)
    setLiveWidth(null)
  }, [slot.mode])

  // A transição de lugar só liga depois do primeiro quadro: o vídeo não nasce deslizando.
  useEffect(() => {
    if (!floating) {
      setSettled(false)
      return
    }
    const frameId = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(frameId)
  }, [floating])

  // Quem abriu pela pílula continua no vídeo; quem minimizou continua na pílula.
  const previousMode = useRef(slot.mode)
  useEffect(() => {
    const before = previousMode.current
    previousMode.current = slot.mode
    if (before === 'pill' && slot.mode === 'floating')
      moveHandle.current?.focus({ preventScroll: true })
    if (before === 'floating' && slot.mode === 'pill')
      pillButton.current?.focus({ preventScroll: true })
  }, [slot.mode])

  const commit = (next: FloatGeometry) => {
    setChosen(next)
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, serializeFloatGeometry(next))
    } catch {
      // Navegação privada ou cota cheia: o vídeo só não lembra o lugar na próxima vez.
    }
  }

  const rect = floatRect({ ...geometry, width: liveWidth ?? geometry.width }, viewport)
  // O canto em que ele está DE VERDADE (numa janela baixa um canto de cima pode descer).
  const corner = rect.corner
  const limits = floatWidthLimits(viewport.width)
  const busy = drag !== null || liveWidth !== null
  const side = gripSide(corner)
  const moveTo = (next: FloatCorner) => {
    commit({ ...geometry, corner: next })
    setAnnounce(`Vídeo ${CORNER_LABEL[next]}.`)
  }

  const start = (kind: Gesture['kind']) => (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const box = (kind === 'pill' ? pillButton.current : frame.current)?.getBoundingClientRect()
    if (!box) return
    suppressPillClick.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gesture.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      boxWidth: box.width,
      boxHeight: box.height,
      startWidth: rect.width,
      moved: false,
    }
  }
  const placeOf = (current: Gesture, event: PointerEvent<HTMLElement>) => ({
    left: clamp(event.clientX - current.offsetX, 0, viewport.width - current.boxWidth),
    top: clamp(event.clientY - current.offsetY, 0, viewport.height - current.boxHeight),
  })
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    current.moved = true
    if (current.kind === 'resize')
      setLiveWidth(clampFloatWidth(resizedWidth(corner, current.startWidth, dx), viewport.width))
    else setDrag(placeOf(current, event))
  }
  const finish = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    if (current.moved && current.kind === 'resize')
      commit({
        ...geometry,
        width: clampFloatWidth(
          resizedWidth(corner, current.startWidth, event.clientX - current.startX),
          viewport.width,
        ),
      })
    else if (current.moved) {
      const place = placeOf(current, event)
      commit({
        ...geometry,
        corner: nearestCorner(
          { x: place.left + current.boxWidth / 2, y: place.top + current.boxHeight / 2 },
          viewport,
        ),
      })
      // O clique que o navegador gera ao soltar a pílula não pode abrir o vídeo.
      if (current.kind === 'pill') suppressPillClick.current = true
    }
    setDrag(null)
    setLiveWidth(null)
  }
  const cancel = () => {
    gesture.current = null
    setDrag(null)
    setLiveWidth(null)
  }
  const gestureHandlers = (kind: Gesture['kind']) => ({
    onPointerDown: start(kind),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  })

  const moveByKey = (event: KeyboardEvent<HTMLElement>) => {
    const direction = ARROWS[event.key]
    if (!direction) return
    event.preventDefault()
    moveTo(moveCorner(corner, direction))
  }
  const resizeByKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = {
      ArrowRight: FLOAT_RESIZE_STEP,
      ArrowUp: FLOAT_RESIZE_STEP,
      ArrowLeft: -FLOAT_RESIZE_STEP,
      ArrowDown: -FLOAT_RESIZE_STEP,
      PageUp: FLOAT_RESIZE_STEP * 4,
      PageDown: -FLOAT_RESIZE_STEP * 4,
    }[event.key]
    const next =
      event.key === 'Home'
        ? limits.min
        : event.key === 'End'
          ? limits.max
          : step === undefined
            ? null
            : rect.width + step
    if (next === null) return
    event.preventDefault()
    commit({ ...geometry, width: clampFloatWidth(next, viewport.width) })
  }

  // Coberto por outro diálogo: some (o vídeo segue tocando) e sai do alcance do Tab. `inert` já
  // tira da árvore de acessibilidade; ⚠️ um `aria-hidden` aqui derrubava o observador do
  // happy-dom nos testes (medido), sem acrescentar nada no navegador.
  const hidden = covered ? { inert: true } : COMPANION

  const grip = (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Tamanho do vídeo"
      aria-orientation="horizontal"
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={rect.width}
      aria-valuetext={`${rect.width} pixels de largura`}
      {...gestureHandlers('resize')}
      onKeyDown={resizeByKey}
      className="sz-lesson-video-float-grip flex size-11 shrink-0 cursor-ew-resize touch-none select-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <MoveHorizontal aria-hidden className="size-4" />
    </div>
  )

  return (
    <div
      {...{ [LESSON_FLOAT_ROOT_ATTR]: '' }}
      className="sz-lesson-video-slot"
      style={floating && inlineHeight.current > 0 ? { minHeight: inlineHeight.current } : undefined}
    >
      <div
        ref={frame}
        data-corner={floating ? corner : undefined}
        data-busy={floating && busy ? '' : undefined}
        {...(floating ? { role: 'region', 'aria-label': 'Vídeo da aula', ...hidden } : {})}
        className={cn(
          'sz-lesson-video-frame',
          floating &&
            'sz-lesson-video-float fixed z-[85] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
          floating &&
            settled &&
            !busy &&
            'transition-[left,top,width] duration-200 ease-out motion-reduce:transition-none',
          floating && covered && 'invisible',
        )}
        style={
          floating
            ? { left: drag?.left ?? rect.left, top: drag?.top ?? rect.top, width: rect.width }
            : undefined
        }
      >
        {floating ? (
          <div className="sz-lesson-video-float-bar flex h-11 shrink-0 items-center gap-1 border-border border-b px-1">
            {side === 'left' && grip}
            <button
              ref={moveHandle}
              type="button"
              // Começa pelo texto à vista (WCAG 2.5.3) e diz o que a alça faz.
              aria-label="Vídeo da aula: mover para outro canto"
              aria-describedby={hintId}
              {...gestureHandlers('move')}
              onKeyDown={moveByKey}
              onClick={(event) => {
                // Enter e Espaço chegam como clique sem ponteiro: andam um canto. O toque que
                // não virou arrasto não move nada.
                if (event.detail !== 0) return
                moveTo(nextCorner(corner))
              }}
              className={cn(
                'sz-lesson-video-float-move flex h-11 min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-2 rounded-lg px-2 text-left font-semibold text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing',
                rect.width < 240 && 'justify-center',
              )}
            >
              <GripHorizontal aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {/* Estreito (celular), o título cortado em "Ví…" só sujava a barra: fica o ícone,
                  e o nome acessível continua inteiro. */}
              {rect.width >= 240 ? <span className="truncate">Vídeo da aula</span> : null}
            </button>
            <span id={hintId} className="sr-only">
              Arraste para outro canto da tela. Com o teclado, use as setas.
            </span>
            <button
              type="button"
              onClick={slot.onMinimize}
              aria-label="Minimizar o vídeo"
              className="sz-lesson-video-float-minimize flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Minimize2 aria-hidden className="size-4" />
            </button>
            {side === 'right' && grip}
          </div>
        ) : null}
        <div
          className={cn(
            'sz-lesson-video-float-body',
            // Flutuando, a moldura é a do flutuante: o canto e a borda do player sobravam.
            floating && '[&_.aspect-video]:rounded-none [&_.aspect-video]:border-0',
          )}
          // Minimizado, o vídeo segue tocando embaixo da tela ampliada, longe do Tab.
          inert={pill || undefined}
          // O iframe engole o ponteiro: durante o arrasto ele não pode recebê-lo.
          style={busy ? { pointerEvents: 'none' } : undefined}
        >
          {children}
        </div>
        <span className="sr-only" aria-live="polite">
          {floating ? announce : ''}
        </span>
        {floating ? (
          // ⚠️ A guarda do FIM: o Tab que sai do iframe (o do YouTube é o último foco do vídeo, e
          // o Tab de dentro dele nunca chega à página) caía na aula escondida embaixo da tela
          // ampliada. Aqui ele volta à saída da tela ampliada.
          <span
            // biome-ignore lint/a11y/noNoninteractiveTabindex: guarda de foco; só recebe o Tab e o devolve à saída
            tabIndex={0}
            {...FOCUS_GUARD}
            onFocus={focusExpandedExit}
            className="sz-lesson-video-float-guard sr-only"
          />
        ) : null}
      </div>
      {pill ? (
        <button
          ref={pillButton}
          type="button"
          {...hidden}
          {...gestureHandlers('pill')}
          onKeyDown={moveByKey}
          onClick={() => {
            if (suppressPillClick.current) {
              suppressPillClick.current = false
              return
            }
            slot.onOpen()
          }}
          aria-label="Abrir o vídeo da aula"
          aria-describedby={hintId}
          className={cn(
            'sz-lesson-video-pill fixed z-[85] flex min-h-11 touch-none select-none items-center gap-2 rounded-full border border-border bg-card px-4 font-semibold text-sm shadow-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
            covered && 'invisible',
          )}
          style={drag ?? pillStyle(corner, viewport.topInset ?? FLOAT_TOP_INSET)}
        >
          <Play aria-hidden className="size-4" />
          Vídeo
          {/* A pílula também muda de canto (arrastando ou com as setas), sem dar play. */}
          <span id={hintId} className="sr-only">
            Arraste ou use as setas para levar a outro canto.
          </span>
        </button>
      ) : null}
    </div>
  )
}

/** A pílula mora no canto do vídeo: é ali que a criança procura. */
function pillStyle(corner: FloatCorner, topInset: number) {
  return {
    ...(corner.startsWith('top') ? { top: topInset } : { bottom: FLOAT_MARGIN }),
    ...(corner.endsWith('left') ? { left: FLOAT_MARGIN } : { right: FLOAT_MARGIN }),
  }
}
