'use client'

import { Alignment, EventType, Fit, Layout, useRive } from '@rive-app/react-canvas'
import { useEffect } from 'react'
import './rive-runtime'

/** Contain: a arte cabe inteira na caixa do `.kids-trail-art`, sem deformar. */
const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.Center })

/**
 * Teto de religadas por segundo. Uma animação de duração ZERO emitiria `Stop` a
 * cada quadro e a rede de laço viraria CPU presa no tablet da criança. Acima
 * disso desistimos do laço e ficamos no quadro parado — arte estática é um
 * defeito, ventoinha ligada é um estrago.
 */
const MAX_RELIGADAS_POR_SEGUNDO = 60

/**
 * A animação Rive da unidade na trilha. NUNCA importado direto: quem monta é o
 * `trail-rive.tsx` via `dynamic(ssr:false)`, para o runtime (~676 KB) só entrar no
 * chunk de quem anima e nunca no SSR.
 */
export function TrailRiveCanvas({
  src,
  tocar,
  pausado,
  stateMachine,
  onFalhou,
}: {
  src: string
  /** `false` = pinta o primeiro quadro e fica nele (`prefers-reduced-motion`). */
  tocar: boolean
  /** Fora da viewport: a instância existe, mas não gasta quadro. */
  pausado: boolean
  /**
   * Gancho para DEPOIS. Nomeada, a arte roda pela máquina de estados em vez da
   * timeline — é o ponto de entrada do "state machine depois", e trocar aqui não
   * mexe em mais nada da feature.
   */
  stateMachine?: string
  onFalhou: () => void
}) {
  const { RiveComponent, rive } = useRive({
    src,
    // ⚠️ SEM `artboard` e SEM `animations`: o arquivo vem de quem desenha, e os
    // nomes não são nossos. Sem eles o runtime abre o artboard PADRÃO do arquivo.
    ...(stateMachine ? { stateMachines: stateMachine } : {}),
    layout: LAYOUT,
    // ⚠️⚠️ `false` DE PROPÓSITO, inclusive quando vamos tocar. Com `true` quem
    // decide o que rodar é o runtime — e foi exatamente essa decisão que congelou o
    // Zappy (`mascot.tsx`, e a medição no CLAUDE.md): um arquivo com a
    // `State Machine 1` de fábrica, sem estado que entre na timeline, roda a 60 fps
    // desenhando SEMPRE o mesmo quadro, sem erro nenhum. Um arquivo de terceiro tem
    // MAIS chance de trazer essa máquina padrão, não menos. Aqui existe um decisor
    // só, o efeito abaixo. De quebra, `false` pinta o primeiro quadro e fica nele —
    // que é exatamente o que `prefers-reduced-motion` quer.
    autoplay: false,
    enableRiveAssetCDN: false,
    onLoadError: onFalhou,
  })

  useEffect(() => {
    if (!rive) return
    if (!tocar || pausado) {
      rive.pause()
      return
    }
    // "A primeira animação, em laço": o nome sai do ARQUIVO, nunca de constante
    // nossa — é o que torna a timeline escolhível sem combinar nomes com quem desenha.
    // ⚠️ Com `stateMachine` nomeada o `play` recebe ELA (a API aceita os dois tipos
    // de nome). Sem essa linha o gancho de "state machine depois" seria uma
    // ARMADILHA: `autoplay` é `false`, então não tocar aqui significa canvas parado
    // — exatamente o defeito que este arquivo inteiro existe para evitar.
    const nome = stateMachine ?? rive.animationNames[0]
    if (!nome) {
      // Só máquina de estados, nenhuma timeline linear: o quadro 0 já está pintado,
      // então a arte aparece — parada. Avisa, porque "parado" e "não carregou" são
      // indistinguíveis na tela, e nenhum teste daqui pega isto (o happy-dom não
      // tem WebGL).
      console.warn('[trilha-rive] arquivo sem animação linear, ficará estático:', src)
      return
    }
    // A rede de religar é só para TIMELINE: uma state machine não termina, e o
    // `Stop` dela não significa "a animação acabou".
    if (stateMachine) {
      rive.play(nome)
      return
    }
    let religadas = 0
    let janela = Date.now()
    let desistiu = false
    // ⚠️ A timeline carrega o modo de laço escolhido no editor. A do Zappy repete
    // sozinha (medido: 6 `Loop` em 12 s, zero `Stop`), mas um arquivo exportado como
    // "one shot" PARA no fim. Religar no `Stop` dá laço infinito sem pedir nada a
    // quem desenha.
    const religa = () => {
      if (desistiu) return
      const agora = Date.now()
      if (agora - janela > 1000) {
        janela = agora
        religadas = 0
      }
      if (++religadas > MAX_RELIGADAS_POR_SEGUNDO) {
        desistiu = true
        console.warn('[trilha-rive] animação de duração ~zero, laço desligado:', src)
        return
      }
      rive.play(nome)
    }
    rive.on(EventType.Stop, religa)
    rive.play(nome)
    return () => rive.off(EventType.Stop, religa)
  }, [rive, tocar, pausado, stateMachine, src])

  // Decorativa, como o `<img>` que ela substitui: o significado está nos nós ao lado.
  return <RiveComponent aria-hidden="true" className="size-full" />
}
