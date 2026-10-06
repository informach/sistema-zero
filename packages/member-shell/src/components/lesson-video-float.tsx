'use client'

import { Button } from '@sistemazero/ui/button'
import { GripHorizontal, Minimize2, Minus, Plus, Tv } from 'lucide-react'
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
  defaultFloatGeometry,
  type FloatCorner,
  type FloatGeometry,
  type FloatSize,
  type FloatViewport,
  floatRect,
  floatStepOf,
  floatStorageKey,
  moveCorner,
  nearestCorner,
  nextCorner,
  readFloatGeometry,
  serializeFloatGeometry,
  topInsetBelow,
} from '../lib/lesson-video-float'
import { useLessonCopy } from './lesson-copy-context'

/**
 * O VÍDEO FLUTUANTE da aula (03/10/2026). Relato que o originou: a criança deu play, o vídeo
 * mandou ampliar a tela, a tela ampliada cobriu o vídeo e ela ficou sem saber o que fazer.
 *
 * Com uma atividade ampliada e o vídeo da seção TOCANDO, o mesmo vídeo aparece pequeno por cima
 * (estilo picture-in-picture, mas dentro da página), arrastável e em três tamanhos (− e +).
 *
 * ⭐ O BOTÃO e o VÍDEO são peças separadas (03/10/2026, pedido dela). O interruptor "Vídeo"
 * (`LessonVideoToggle`) mora FIXO na barra de cima de cada atividade ampliada, à esquerda das
 * outras ações, e liga ou desliga o vídeo. Escondido, o vídeo não deixa nada solto na tela: a
 * pílula flutuante que existia antes ficava por cima dos controles do Estúdio (o olho e o ⋯) em
 * qualquer canto que a criança escolhesse.
 *
 * ⚠️⚠️ O vídeo NUNCA muda de lugar no DOM: o SDK do Vimeo é o dono do iframe (invariante 6) e
 * mover o nó recarregaria o vídeo. Flutuar é só trocar a classe e o `style` da MOLDURA para
 * `position: fixed`; a barra, o anúncio e a guarda de foco entram como irmãos condicionais, e o
 * corpo (onde mora o player) fica sempre na mesma posição entre os filhos.
 */

export type VideoFloatMode = 'floating' | 'hidden' | null

export type VideoFloatSlot = {
  mode: VideoFloatMode
  viewerId: string | null
  onMinimize: () => void
}

/** Provido pelo `BlockScope` em volta de cada bloco de vídeo da aula; fora dela, nada flutua. */
export const LessonVideoFloatContext = createContext<VideoFloatSlot | null>(null)

/** O estado do interruptor: `on` = o vídeo está flutuando à vista. */
export type VideoToggle = { on: boolean; toggle: () => void }

/**
 * Provido pela aula (`LessonSections`) enquanto uma atividade está ampliada E a seção tem vídeo.
 * Fora disso é `null` e o interruptor não aparece.
 */
export const LessonVideoToggleContext = createContext<VideoToggle | null>(null)

/** Marca o interruptor: é para onde o foco volta quando o vídeo se esconde pela barra dele. */
const VIDEO_TOGGLE_ATTR = 'data-sz-video-toggle'

/**
 * O interruptor "Vídeo" da barra de cima da atividade ampliada. Cada tela que amplia o põe à
 * esquerda das ações dela; ele some sozinho quando não há vídeo para ligar. `aria-pressed` diz se
 * o vídeo está à vista. Ligar abre o vídeo flutuante e dá play, como a pílula fazia.
 *
 * ⚠️⚠️ `expanded` é o estado da PRÓPRIA atividade: o contexto vale para a seção inteira, e numa
 * seção com duas atividades a que ficou embaixo da tela ampliada ganharia um segundo interruptor
 * escondido, para onde o foco do "Minimizar" (que procura o botão pelo atributo) podia ir.
 */
export function LessonVideoToggle({
  expanded,
  size,
  className,
}: {
  expanded: boolean
  size?: 'sm' | 'default'
  className?: string
}) {
  const toggle = useContext(LessonVideoToggleContext)
  if (!toggle || !expanded) return null
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      aria-pressed={toggle.on}
      onClick={toggle.toggle}
      {...{ [VIDEO_TOGGLE_ATTR]: '' }}
      // Ligado tem que PARECER ligado em qualquer app: o kids veste por cima com a TV navy.
      className={cn(
        'sz-lesson-video-toggle aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground',
        className,
      )}
    >
      <Tv aria-hidden className="size-4" />
      {/* Estreito, fica o ícone; o nome acessível continua "Vídeo". */}
      <span className="max-sm:sr-only">Vídeo</span>
    </Button>
  )
}

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

/** Marca o flutuante para o `useModalA11y` incluí-lo no Tab da tela ampliada. */
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
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  boxWidth: number
  boxHeight: number
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

const SIZE_LABEL: Record<FloatSize, string> = {
  small: 'pequeno',
  medium: 'médio',
  large: 'grande',
}

const ARROWS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function FloatSlot({ slot, children }: { slot: VideoFloatSlot; children: ReactNode }) {
  const { video } = useLessonCopy()
  const active = slot.mode !== null
  const floating = slot.mode === 'floating'
  const tucked = slot.mode === 'hidden'
  const viewport = useViewport(active)
  const covered = useForeignModalOpen(active)
  const storageKey = floatStorageKey(slot.viewerId)
  // Lido na montagem: nada aqui é desenhado no servidor, então não há o que desencontrar.
  const [chosen, setChosen] = useState<FloatGeometry | null>(() => readSaved(storageKey))
  const geometry = chosen ?? defaultFloatGeometry(viewport.width, viewport.prefersBottom)
  const [drag, setDrag] = useState<{ left: number; top: number } | null>(null)
  const [settled, setSettled] = useState(false)
  const [announce, setAnnounce] = useState('')
  const gesture = useRef<Gesture | null>(null)
  const frame = useRef<HTMLDivElement>(null)
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

  // Escondido pela barra DO VÍDEO (Minimizar), o foco que estava nele iria para o nada: volta ao
  // interruptor. Quem desligou pelo interruptor já está nele e fica.
  const previousMode = useRef(slot.mode)
  useEffect(() => {
    const before = previousMode.current
    previousMode.current = slot.mode
    if (before !== 'floating' || slot.mode !== 'hidden') return
    const focused = document.activeElement
    // O Minimizar sai da árvore junto com a barra: o foco que estava nele vira `body` ou um nó solto.
    const lost = !focused || focused === document.body || !focused.isConnected
    if (!lost && !frame.current?.contains(focused)) return
    document.querySelector<HTMLElement>(`[${VIDEO_TOGGLE_ATTR}]`)?.focus({ preventScroll: true })
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

  const rect = floatRect(geometry, viewport)
  // O canto em que ele está DE VERDADE (numa janela baixa um canto de cima pode descer).
  const corner = rect.corner
  const busy = drag !== null
  const moveTo = (next: FloatCorner) => {
    commit({ ...geometry, corner: next })
    setAnnounce(`Vídeo ${CORNER_LABEL[next]}.`)
  }
  // O degrau é o da JANELA (o grande de uma janela pequena pode ter virado o médio).
  const { steps, index: stepIndex } = floatStepOf(geometry.size, viewport)
  const canShrink = stepIndex > 0
  const canGrow = stepIndex < steps.length - 1
  const resize = (direction: 'grow' | 'shrink') => {
    const next = steps[stepIndex + (direction === 'grow' ? 1 : -1)]
    if (!next) return
    commit({ ...geometry, size: next.size })
    setAnnounce(`Vídeo ${SIZE_LABEL[next.size]}.`)
  }

  const start = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const box = frame.current?.getBoundingClientRect()
    if (!box) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      boxWidth: box.width,
      boxHeight: box.height,
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
    setDrag(placeOf(current, event))
  }
  const finish = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    if (current.moved) {
      const place = placeOf(current, event)
      commit({
        ...geometry,
        corner: nearestCorner(
          { x: place.left + current.boxWidth / 2, y: place.top + current.boxHeight / 2 },
          viewport,
        ),
      })
    }
    setDrag(null)
  }
  const cancel = () => {
    gesture.current = null
    setDrag(null)
  }
  const gestureHandlers = {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  }

  const moveByKey = (event: KeyboardEvent<HTMLElement>) => {
    const direction = ARROWS[event.key]
    if (!direction) return
    event.preventDefault()
    moveTo(moveCorner(corner, direction))
  }
  // Coberto por outro diálogo: some (o vídeo segue tocando) e sai do alcance do Tab. `inert` já
  // tira da árvore de acessibilidade. (O `aria-hidden` que um dia esteve aqui não derrubava o
  // observador: o que o derrubava nos testes era o coletor de lixo do happy-dom.)
  const hidden = covered ? { inert: true } : COMPANION

  // ⚠️ Na ponta o botão fica `aria-disabled`, nunca `disabled`: com `disabled` o botão que a
  // criança acabou de apertar sai do foco e o Tab recomeçava do nada no meio da tela.
  const sizeButton = (direction: 'grow' | 'shrink') => {
    const enabled = direction === 'grow' ? canGrow : canShrink
    return (
      <button
        type="button"
        onClick={() => resize(direction)}
        aria-label={direction === 'grow' ? 'Aumentar o vídeo' : 'Diminuir o vídeo'}
        aria-disabled={enabled ? undefined : true}
        className="sz-lesson-video-float-size flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent"
      >
        {direction === 'grow' ? (
          <Plus aria-hidden className="size-4" />
        ) : (
          <Minus aria-hidden className="size-4" />
        )}
      </button>
    )
  }

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
        {...(floating ? { role: 'region', 'aria-label': video.titulo, ...hidden } : {})}
        className={cn(
          'sz-lesson-video-frame',
          // `px-1.5 pb-1.5` é a moldura (`FLOAT_FRAME`, 6px): entra na conta da altura.
          floating &&
            'sz-lesson-video-float fixed z-[85] flex flex-col overflow-hidden rounded-2xl border border-border bg-card px-1.5 pb-1.5 shadow-2xl',
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
          <div className="sz-lesson-video-float-bar flex h-11 shrink-0 items-center gap-0.5">
            <button
              type="button"
              // Começa pelo texto à vista (WCAG 2.5.3) e diz o que a alça faz.
              aria-label={video.mover}
              aria-describedby={hintId}
              {...gestureHandlers}
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
                  e o nome acessível continua inteiro. ⚠️ "Vídeo", não "Vídeo da aula": com os
                  botões − e + na barra o título longo não cabia no degrau pequeno. */}
              {rect.width >= 240 ? <span className="truncate">Vídeo</span> : null}
            </button>
            <span id={hintId} className="sr-only">
              Arraste para outro canto da tela. Com o teclado, use as setas.
            </span>
            {sizeButton('shrink')}
            {sizeButton('grow')}
            <button
              type="button"
              onClick={slot.onMinimize}
              aria-label="Minimizar o vídeo"
              className="sz-lesson-video-float-minimize flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Minimize2 aria-hidden className="size-4" />
            </button>
          </div>
        ) : null}
        <div
          className={cn(
            'sz-lesson-video-float-body',
            // Flutuando, a moldura é a do flutuante: o canto e a borda do player sobravam, e o
            // canto da tela passa a ser o do corpo, dentro da moldura.
            floating &&
              'overflow-hidden rounded-xl [&_.aspect-video]:rounded-none [&_.aspect-video]:border-0',
          )}
          // Escondido, o vídeo segue tocando embaixo da tela ampliada, longe do Tab.
          inert={tucked || undefined}
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
    </div>
  )
}
