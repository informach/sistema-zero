'use client'

import { Alignment, EventType, Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-canvas'
import { useEffect } from 'react'

/**
 * ⚠️⚠️ O WASM vem da NOSSA origem, e o CDN fica DESLIGADO. Sem estas duas linhas
 * o runtime busca `https://unpkg.com/@rive-app/canvas@<versão>/rive.wasm`
 * (fallback no jsdelivr) — código executável de host de terceiro, no caminho de
 * render do painel. `scripts/sync-rive-wasm.ts` põe o binário em `public/rive/`
 * no `dev` e no `build`; `enableRiveAssetCDN: false` abaixo fecha a mesma porta
 * para os ASSETS embutidos no `.riv`. Roda no import porque o módulo é
 * `ssr:false`: só existe no navegador, e sempre antes da primeira instância.
 */
RuntimeLoader.setWasmUrl('/rive/rive.wasm')
RuntimeLoader.setWasmFallbackUrl(null)

const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.Center })
const MAX_RELIGADAS_POR_SEGUNDO = 60

/**
 * A prévia da animação no diálogo de módulo. NUNCA importada direto: quem monta
 * é o `module-rive-uploader.tsx` via `dynamic(ssr:false)`.
 *
 * ⚠️ Recebe `buffer` (os BYTES), nunca `src`. Quem busca é o uploader, sempre
 * pela rota-proxy do painel (`connect-src 'self'` já cobre) — inclusive logo após
 * o envio, de propósito: assim a prévia prova o que FICOU GRAVADO no R2, não o
 * que saiu daqui. Apontar o `src` para o CDN exigiria afrouxar o `connect-src` do
 * painel e criar regra de CORS no bucket público.
 *
 * ⚠️⚠️ A escolha da animação é a MESMA do app da criança
 * (`community-kids/src/components/kids/trail-rive-canvas.tsx`): primeira timeline
 * linear, nunca a state machine, com rede de religar. É isso que faz a prévia
 * valer como verificação — o que o painel vê é o que a criança vê.
 */
export function ModuleRivePreview({
  buffer,
  onFalhou,
}: {
  buffer: ArrayBuffer
  onFalhou: (motivo: string) => void
}) {
  const { RiveComponent, rive } = useRive({
    buffer,
    layout: LAYOUT,
    // `false` de propósito: com `true` quem decide o que rodar é o runtime, e uma
    // state machine de fábrica sem estado que entre na timeline desenha sempre o
    // MESMO quadro, a 60 fps, sem erro nenhum.
    autoplay: false,
    enableRiveAssetCDN: false,
    onLoadError: () => onFalhou('Não foi possível abrir esta animação.'),
  })

  useEffect(() => {
    if (!rive) return
    const nome = rive.animationNames[0]
    if (!nome) {
      onFalhou('Este .riv não tem animação — só máquina de estados. Peça um arquivo com timeline.')
      return
    }
    let religadas = 0
    let janela = Date.now()
    let desistiu = false
    const religa = () => {
      if (desistiu) return
      const agora = Date.now()
      if (agora - janela > 1000) {
        janela = agora
        religadas = 0
      }
      if (++religadas > MAX_RELIGADAS_POR_SEGUNDO) {
        desistiu = true
        return
      }
      rive.play(nome)
    }
    rive.on(EventType.Stop, religa)
    rive.play(nome)
    return () => rive.off(EventType.Stop, religa)
  }, [rive, onFalhou])

  return <RiveComponent className="size-full" />
}
