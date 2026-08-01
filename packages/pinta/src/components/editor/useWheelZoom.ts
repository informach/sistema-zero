/**
 * Zoom pela ROLAGEM do mouse nos palcos (pixel, vetor e mapa): rolar para cima
 * aproxima, para baixo afasta, sempre nos degraus da sessão (`zoomLevels`) —
 * o mostrador continua honesto.
 *
 * Três detalhes que fazem a diferença:
 * 1. O listener é registrado À MÃO com `{ passive: false }`. O `onWheel` do
 *    React é passivo na raiz, então o `preventDefault()` seria IGNORADO e o
 *    palco rolaria em vez de dar zoom.
 * 2. O ponto sob o cursor fica ANCORADO: sem corrigir a rolagem, o desenho
 *    "foge" da tela ao aproximar. A correção é RELATIVA (mede o conteúdo e
 *    ajusta a diferença) e roda duas vezes — no layout e depois da pintura —
 *    porque o canvas do pixel/mapa só muda de tamanho quando repinta.
 * 3. Shift+rolagem NÃO é interceptado (rola a área, escape hatch sem a Mão);
 *    Ctrl+rolagem (pinça de trackpad) dá zoom no desenho, não no navegador.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { useEditorStores, useSession } from './editorContext'

/** Quanto de rolagem acumulada vale UM degrau (trackpad manda deltas minúsculos). */
const STEP_THRESHOLD = 40

/** deltaY em px: linha (~16px) e página (~100px) viram px para o acumulador. */
function deltaPixels(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * 100
  return event.deltaY
}

interface Anchor {
  /** Ponto do DESENHO sob o cursor (px do documento, já sem o zoom). */
  contentX: number
  contentY: number
  /** Onde ele estava na tela — é ali que ele tem que continuar. */
  clientX: number
  clientY: number
}

/**
 * @param stageRef área rolável (a que tem `overflow-auto`)
 * @param contentRef o desenho em si (canvas/svg), que cresce com o zoom
 */
export function useWheelZoom(
  stageRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | SVGElement | null>,
): void {
  const { session } = useEditorStores()
  const zoom = useSession((state) => state.zoom)
  const accRef = useRef(0)
  const anchorRef = useRef<Anchor | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    function onWheel(event: WheelEvent): void {
      // Shift = rolar (navegação), como no resto da web.
      if (event.shiftKey) return
      event.preventDefault()

      accRef.current += deltaPixels(event)
      if (Math.abs(accRef.current) < STEP_THRESHOLD) return
      const zoomingIn = accRef.current < 0
      accRef.current = 0

      const state = session.getState()
      const before = state.zoom
      const content = contentRef.current
      const rect = content?.getBoundingClientRect()
      // Sem medida (happy-dom / palco escondido) não há âncora a preservar.
      anchorRef.current =
        rect && rect.width > 0 && rect.height > 0 && before > 0
          ? {
              contentX: (event.clientX - rect.left) / before,
              contentY: (event.clientY - rect.top) / before,
              clientX: event.clientX,
              clientY: event.clientY,
            }
          : null
      if (zoomingIn) state.zoomIn()
      else state.zoomOut()
      // Degrau no fim da escala: nada mudou, nada a ancorar.
      if (session.getState().zoom === before) anchorRef.current = null
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [stageRef, contentRef, session])

  /**
   * Correção RELATIVA: mede onde o ponto ancorado caiu e desloca a rolagem pela
   * diferença. Rodar de novo depois (com o canvas já redimensionado) só termina
   * o que faltou — aplicar duas vezes não desalinha.
   */
  function applyAnchor(): void {
    const anchor = anchorRef.current
    const stage = stageRef.current
    const content = contentRef.current
    if (!anchor || !stage || !content) return
    const rect = content.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    stage.scrollLeft += rect.left + anchor.contentX * zoom - anchor.clientX
    stage.scrollTop += rect.top + anchor.contentY * zoom - anchor.clientY
  }

  // Antes da pintura (vetor: o svg já tem o tamanho novo aqui).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `applyAnchor` lê refs; o gatilho é o zoom
  useLayoutEffect(applyAnchor, [zoom])
  // Depois da pintura (pixel/mapa: o canvas só redimensiona no efeito de pintar).
  // biome-ignore lint/correctness/useExhaustiveDependencies: idem — a 2ª passada fecha o resto
  useEffect(() => {
    applyAnchor()
    anchorRef.current = null
  }, [zoom])
}
