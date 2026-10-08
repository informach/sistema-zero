'use client'

import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useResizeCanvas,
  useRive,
} from '@rive-app/react-canvas'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type MascotExpression,
  ZAPPY_RIVE_ARTBOARD,
  ZAPPY_RIVE_SRC,
  ZAPPY_RIVE_TIMELINE,
} from './mascot'
// Origem do WASM + CDN desligado. Mora em `rive-runtime` porque a arte da trilha
// (`trail-rive-canvas`) depende da MESMA decisão — ver o comentário lá.
import './rive-runtime'

/**
 * Baixa e compila o WASM SEM montar canvas nenhum. ⚠️ Importar este módulo puxa só
 * os ~81 KB de JS — os 595 KB do binário só saem do servidor quando a PRIMEIRA
 * instância do Rive inicializa. Sem esta chamada, o prefetch da aula adiantaria um
 * oitavo do peso e a celebração ainda esperaria o grosso. Best-effort: falhar aqui
 * não deixa rastro, e cada pose cai no WebP como em qualquer outra falha.
 */
export function aquecerRuntimeRive(): void {
  RuntimeLoader.awaitInstance().catch(() => {})
}

/** Contain: o vagalume cabe inteiro no quadrado do `className`, sem deformar. */
const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.Center })

/**
 * O Zappy animado de verdade (Rive + WASM). NUNCA importado direto: quem monta é o
 * `mascot-rive.tsx` via `dynamic(ssr:false)`, para que o runtime (~676 KB brotli) só
 * entre no chunk de quem anima e nunca no SSR.
 */
export function MascotRiveCanvas({
  expression,
  className,
  silencioso,
  tocando,
  onPronto,
  onFalhou,
}: {
  expression: MascotExpression
  className?: string
  /** `true` zera o volume: a pose é ESTADO, ou a criança pediu menos movimento. */
  silencioso: boolean
  /**
   * `undefined` = ninguém rege, toca como sempre. Booleano = a VOZ manda (o botão "Ouvir" da
   * aula): parado no primeiro quadro até o áudio sair. ⚠️ O regime é lido na MONTAGEM
   * (`autoplay`), e o `useRive` não relê parâmetro nenhum — por isso ele entra na `key` lá no
   * `mascot-rive.tsx`.
   */
  tocando?: boolean
  onPronto: () => void
  onFalhou: () => void
}) {
  const regido = tocando !== undefined
  const { RiveComponent, rive, canvas, container } = useRive(
    {
      src: ZAPPY_RIVE_SRC[expression],
      artboard: ZAPPY_RIVE_ARTBOARD,
      // ⚠️ A TIMELINE, não a state machine — é onde a animação está. O porquê (com a
      // medição) fica em `ZAPPY_RIVE_TIMELINE`, no mascot.tsx.
      animations: ZAPPY_RIVE_TIMELINE,
      layout: LAYOUT,
      autoplay: !regido,
      enableRiveAssetCDN: false,
      onLoadError: onFalhou,
    },
    { shouldResizeCanvasToContainer: false },
  )

  // O elemento só chega depois da primeira montagem; a referência nova liga seu observer.
  const containerRef = useMemo(() => ({ current: container }), [container])
  const prontoRef = useRef(onPronto)
  prontoRef.current = onPronto
  const quadroPronto = useRef<number | null>(null)
  const redimensionar = useCallback(() => {
    if (!rive) return
    // O resize padrão do hook desenha ANTES de atualizar o enquadramento. Se o Rive está
    // parado, a otimização pode pular a próxima pintura e deixá-lo fora do canvas. Esta API
    // ajusta tamanho, enquadramento e invalida o desenho antes de repintar, nessa ordem.
    rive.resizeDrawingSurfaceToCanvas()
    if (quadroPronto.current !== null) cancelAnimationFrame(quadroPronto.current)
    quadroPronto.current = requestAnimationFrame(() => {
      quadroPronto.current = null
      prontoRef.current()
    })
  }, [rive])
  useResizeCanvas({
    riveLoaded: !!rive,
    canvasElem: canvas,
    containerRef,
    onCanvasHasResized: redimensionar,
  })
  useEffect(
    () => () => {
      if (quadroPronto.current !== null) cancelAnimationFrame(quadroPronto.current)
    },
    [],
  )

  /**
   * ⭐⭐ A boca anda com o áudio. Medido no navegador antes de existir (harness com `getImageData`
   * dentro do `requestAnimationFrame`, `useOffscreenRenderer: false` — o `toDataURL()` já mentiu
   * nesta mesma casa):
   * - `autoplay: false` aplica o primeiro quadro e fica nele (1 assinatura distinta em 20 quadros).
   *   A pintura inicial precisa do resize acima: `onLoad` sozinho ainda não garante o desenho
   *   dentro do canvas. A imagem só sai depois desse ajuste e da oportunidade de pintar.
   * - `play()` roda em LAÇO sozinho (a `Timeline 1` do `fala.riv` emite `Loop`, nunca `Stop`):
   *   não existe fim de animação para religar.
   * - ⚠️⚠️ PARAR é `stop` + `pause` + `drawFrame`, nesta ordem, e não `pause` sozinho: `pause`
   *   não rebobina nem repinta, e a boca ficaria congelada ABERTA no meio de um viseme. O `stop`
   *   apaga a instância, o `pause` a recria já no quadro 0 e o `drawFrame` pinta. Medido: volta
   *   ao quadro inicial com 0,00% de pixels diferentes. (`reset()` também rebobina, mas destrói o
   *   artboard e devolveu 1,3% de diferença — mais caro e menos fiel.)
   */
  useEffect(() => {
    if (!rive || tocando === undefined) return
    if (tocando) {
      rive.play(ZAPPY_RIVE_TIMELINE)
      return
    }
    rive.stop(ZAPPY_RIVE_TIMELINE)
    rive.pause(ZAPPY_RIVE_TIMELINE)
    rive.drawFrame()
  }, [rive, tocando])

  // O volume mora na INSTÂNCIA, não no arquivo: a mesma pose toca em celebração e
  // fica muda no balão da aula. Roda também quando `silencioso` vira true no meio
  // (o sistema pode ligar `prefers-reduced-motion` com a tela aberta).
  useEffect(() => {
    if (rive) rive.volume = silencioso ? 0 : 1
  }, [rive, silencioso])

  // Decorativo, como o `<img>` que ele substitui: o significado está no texto ao lado.
  return <RiveComponent aria-hidden="true" className={className} />
}
