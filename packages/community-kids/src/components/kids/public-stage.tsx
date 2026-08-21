'use client'

import type { ProjectControls } from '@sistemazero/studio/controls'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { fittedStageBox, layoutAspect, type StageAspect } from '@/lib/stage-fit'
import { C, CtrlBar, DECK_RESERVE_PX, DPad, FaceButtons, StripButtons } from './console-controls'

interface PublicStageProps {
  /** Raiz do palco — o alvo do "Tela cheia" quando não há console. */
  rootRef: RefObject<HTMLDivElement | null>
  iframeRef: RefObject<HTMLIFrameElement | null>
  onRestart: () => void
  /** Console de fliperama (direcional + A/B + barra) em volta do jogo. */
  showControls: boolean
  /** O palco gira 90° para usar o lado comprido do aparelho. */
  rotated: boolean
  landscape: boolean
  stageAspect: StageAspect
  /** Quais botões este jogo pede — vem pronto do `describeProjectControls`. */
  controls: ProjectControls
  /** Cabeçalho da página: fica DENTRO do palco para girar junto com ele. */
  header: ReactNode
  /** O jogo. */
  children: ReactNode
}

/**
 * Layout da página pública de jogar, nos quatro estados: console em pé, console
 * deitado, palco nu e palco nu GIRADO.
 *
 * ⭐ É uma árvore SÓ, com a moldura condicional em volta de um `{children}` de
 * posição estável. Isso não é arrumação: com um ramo de JSX por estado, o React
 * remonta o `<iframe>` na troca e **o jogo REINICIA** — era o que acontecia ao
 * esconder os controles e ao virar o celular com eles ligados. Com a rotação em
 * cena isso seria insuportável (girar o aparelho zeraria a partida). Portanto:
 * o que muda entre os estados é `style`, nunca a forma da árvore.
 */
export function PublicStage({
  rootRef,
  iframeRef,
  onRestart,
  showControls,
  rotated,
  landscape,
  stageAspect,
  controls,
  header,
  children,
}: PublicStageProps) {
  const aspect = layoutAspect(stageAspect)
  const stageAreaRef = useRef<HTMLDivElement>(null)
  // A tela cheia do console é o CORPO dele (moldura + jogo + controles), como
  // sempre foi: pedi-la na raiz deixaria o console centrado num fundo preto.
  // Sem console, o alvo é a raiz, que é quem carrega o palco de ponta a ponta.
  const consoleRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState({ w: 0, h: 0 })

  // O tamanho do palco é CALCULADO a partir da caixa que sobrou, em vez de sair
  // de fórmulas com altura de cabeçalho cravada (`100dvh - 8rem`, `- 152px`).
  // Fórmula cravada erra sempre que o cabeçalho muda de altura, e era o que
  // deixava altura sobrando no aparelho deitado.
  //
  // ⚠️⚠️ Mede por `clientWidth`/`clientHeight`, NUNCA por `getBoundingClientRect`:
  // o retângulo é o da caixa já TRANSFORMADA, então dentro do palco girado ele
  // volta com os lados TROCADOS. Medido no navegador: 368x839 em vez de 839x368,
  // o que fazia o palco girado sair MENOR que o de pé — o oposto do objetivo.
  useEffect(() => {
    const el = stageAreaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      setArea((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ⚠️⚠️ Quando é o JOGO que pede tela cheia (o bloco "Tela cheia", que a criança
  // pode arrastar), quem vai para a tela cheia é o `<iframe>` — e o console fica
  // FORA dele, some da tela, e não dá para jogar. Medido: o `fullscreenElement`
  // é o IFRAME e o direcional não está dentro dele.
  //
  // ⚠️ NÃO dá para promover o pedido para o console depois do fato: o gesto
  // aconteceu DENTRO do iframe, então a página de fora não tem ativação e o
  // navegador recusa com "Permissions check failed" (medido). É limite da
  // plataforma, não descuido.
  //
  // O que dá, e resolve para a criança: pedir ao jogo que desenhe o pad DELE
  // enquanto ele estiver com a tela — assim ela continua com controles lá
  // dentro. Ao sair da tela cheia, o console de fora volta e o de dentro sai.
  // (Pelo botão "Tela cheia" do console nada disso é preciso: ali quem vai para
  // a tela cheia é o corpo do console, com jogo e controles juntos.)
  useEffect(() => {
    if (!showControls) return
    function aoTrocar() {
      const jogoTomouATela = document.fullscreenElement === iframeRef.current
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'sz:pad-interno',
          mode: jogoTomouATela ? (controls.ownPadMode ?? 'off') : 'off',
        },
        '*',
      )
    }
    document.addEventListener('fullscreenchange', aoTrocar)
    return () => document.removeEventListener('fullscreenchange', aoTrocar)
  }, [showControls, iframeRef, controls.ownPadMode])

  // A linha do palco SEMPRE ocupa a altura que lhe cabe, então a caixa medida é
  // sempre definida e a conta é sempre a mesma.
  //
  // ⚠️ Isto depende de a linha ser `flex: 1`: com altura vinda do CONTEÚDO, medir
  // para dimensionar o palco seria circular (a altura sairia dela mesma). Era o
  // caso do console em pé antes de o deck passar a ocupar o resto da altura.
  const box = area.w > 0 ? fittedStageBox({ w: area.w, h: area.h }, stageAspect) : null

  const root: CSSProperties = {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    minHeight: 0,
    ...(rotated ? { overflow: 'hidden' } : { display: 'flex', flexDirection: 'column' }),
  }

  // Esta caixa tem os lados TROCADOS e é centrada na viewport: girada 90° em
  // torno do próprio centro, ela cai exatamente sobre ela.
  //
  // ⚠️⚠️ O centramento é ABSOLUTO de propósito. Com `place-items: center` num
  // grid o Chromium recua para `start` quando o item é MAIOR que a área — e
  // aqui ele é sempre maior, porque os lados estão trocados. Medido: o palco
  // ficava em x 213..581 numa tela de 412, ou seja, metade do jogo FORA da tela.
  const page: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    ...(rotated
      ? {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100dvh',
          height: '100dvw',
          transform: 'translate(-50%, -50%) rotate(90deg)',
        }
      : { width: '100%', flex: 1 }),
  }

  const bodyWidth = !showControls
    ? '100%'
    : landscape
      ? `min(100% - 20px, calc((100dvh - 190px) * ${aspect} + ${DECK_RESERVE_PX}px))`
      : 'min(100% - 20px, 640px)'

  const consoleBody: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    alignSelf: 'center',
    width: bodyWidth,
    ...(showControls
      ? {
          marginBottom: 10,
          background: C.bodyGrad,
          borderRadius: 22,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 ${C.bodyEdge}, 0 6px 18px rgba(0,0,0,0.18)`,
        }
      : null),
  }

  const mainRow: CSSProperties = {
    display: 'flex',
    minWidth: 0,
    minHeight: 0,
    // ⚠️ `center`, e quem estica é SÓ a área do palco (`alignSelf` lá embaixo).
    // Pôr `stretch` na linha inteira desamarra a medição do palco, mas gruda o
    // direcional e o A/B no ALTO: item com altura própria, sob `stretch`, assenta
    // no início do eixo. Medido no console deitado: o direcional ficava 60px
    // acima do centro do jogo.
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...(showControls
      ? landscape
        ? { gap: 16, padding: '10px 16px 8px' }
        : { padding: '14px 14px 10px' }
      : rotated
        ? { padding: 0 }
        : null),
  }

  const stageArea: CSSProperties = {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    // Estica SÓ esta caixa: é o que faz a altura medida vir da LINHA, e não do
    // palco que está dentro dela (senão medir para calcular vira laço).
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const frame: CSSProperties = {
    overflow: 'hidden',
    // Antes de medir (servidor, primeiro quadro) vale o comportamento de sempre:
    // largura inteira e a altura saindo da proporção. ⚠️ A proporção entra também
    // no modo "preencher": sem ela o `<iframe>` cai na altura intrínseca dele
    // (150px) e o jogo pisca espremido até a primeira medida.
    ...(box
      ? { width: box.width, height: box.height }
      : { width: '100%', aspectRatio: `${aspect}` }),
    ...(showControls
      ? {
          borderRadius: 12,
          background: C.bezel,
          padding: 4,
          boxShadow: `0 0 0 2px ${C.bodyEdge}, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }
      : null),
  }

  // Girado o palco vai de ponta a ponta: moldura decorativa ali só comeria área
  // de jogo, que é justamente o que este modo existe para dar.
  const frameClass = showControls
    ? undefined
    : rotated
      ? 'bg-black'
      : 'kids-unit-cyan rounded-3xl border-4 border-(--unit) bg-white shadow-[0_8px_0_color-mix(in_oklch,var(--unit)_40%,transparent)]'

  return (
    <div ref={rootRef} style={root}>
      <div style={page}>
        {header}
        <div ref={consoleRef} style={consoleBody}>
          <div style={mainRow} className={showControls || rotated ? undefined : 'p-3 sm:p-5'}>
            {showControls && landscape ? (
              <DPad iframeRef={iframeRef} directions={controls.directions} />
            ) : null}
            <div ref={stageAreaRef} style={stageArea}>
              <div className={frameClass} style={frame}>
                {children}
              </div>
            </div>
            {showControls && landscape ? (
              <FaceButtons iframeRef={iframeRef} face={controls.face} />
            ) : null}
          </div>
          {/* Deck do Super Nintendo. Deitado, a cruz e o diamante já ladeiam o
              palco e sobra só a tira.
              ⚠️ Em pé a tira vai numa LINHA PRÓPRIA: cruz (132) + tira (~130) +
              diamante (148) dá mais que a largura de um celular, e o console
              saía com a cruz e o A cortados nas beiradas. Medido em 412px.
              E o deck ocupa a altura que sobra, centrado: era ali que ficava o
              vazio embaixo dos controles. */}
          {showControls && !landscape ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 18,
                padding: '10px 18px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  maxWidth: 420,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  // ⚠️ Folga MÍNIMA: em space-between o `gap` é piso, e sem ele a cruz e o
                  // diamante encostavam num celular de 320px (medido: um termina e o
                  // outro começa no mesmo pixel).
                  gap: 12,
                }}
              >
                <DPad iframeRef={iframeRef} directions={controls.directions} />
                <FaceButtons iframeRef={iframeRef} face={controls.face} />
              </div>
              <StripButtons iframeRef={iframeRef} strip={controls.strip} />
            </div>
          ) : null}
          {showControls && landscape ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 6px' }}>
              <StripButtons iframeRef={iframeRef} strip={controls.strip} />
            </div>
          ) : null}
          {showControls ? (
            <CtrlBar iframeRef={iframeRef} fullscreenTargetRef={consoleRef} onRestart={onRestart} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
