'use client'

import { LIGHTHOUSE_WALK, lighthouseWalkGone } from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { Footprints, Pause, Play, RotateCcw, Turtle } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import { SceneCanvas } from './scene-canvas'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import { limiarDoRelogio, useSceneClock } from './use-scene-clock'

/**
 * "O jogo em câmera lenta" (Farol, Dia 1, parte `quadro`, 01/11/2026).
 *
 * ⭐⭐ Decisão dela: a experiência trabalha só a IDEIA, sem bloco, regra nem código. O jogo é um
 * desenho animado: desenha um quadro atrás do outro e, em cada quadro, olha a seta; apertada, o
 * personagem dá um passinho, solta, ele fica parado. Os blocos (A cada quadro do jogo, Mover sprite)
 * só aparecem na montagem do Estúdio, que liga cada um a esta ideia.
 *
 * O que a tela tem: o personagem com as pegadas de cada passinho, a tira com os últimos quadros, o
 * selo "Seta apertada?" que pisca em cada quadro, a seta que se SEGURA (dedo, mouse ou a seta do
 * teclado) e o ritmo (câmera lenta, velocidade de verdade, pausar).
 *
 * ⚠️ O relógio é DESTE componente, e não o ▶ do player: o do player para sozinho depois de 2 s
 * parado (`sceneClockShouldStop`), e aqui os quadros passando com a seta solta SÃO a descoberta. Ele
 * usa o MESMO laço (`useSceneClock`: aba escondida não conta tempo) e para quando o personagem sai
 * da tela, quando outra mídia da aula pede a vez e depois de um tempo parado com a descoberta feita.
 * ⚠️ O ritmo mora no motor (`walk.pace`): Desfazer e retomar a sessão mostram o botão certo. Só
 * "pausado" é local.
 */

/** Um quadro a cada meio segundo: devagar o bastante para ver cada passinho. */
const CAMERA_LENTA_SEGUNDOS = 0.5
const QUADRO = 1 / 30
const CAMINHO_Y = 128
const CAIXA = LIGHTHOUSE_WALK.hero
const PE_Y = CAMINHO_Y + CAIXA - 2
/** A janela segue o personagem: perto o bastante para um passinho aparecer. */
const VIEW = { w: 260, h: 170, y: 55 } as const
const CHAVE_X = 372
const FAROL_X = 404
const QUADROS_NA_TIRA = 6
/** Uns 10 s parado (quadros no ritmo de cada um), depois de já ter visto a parada: pausa sozinho. */
const PARADO_ATE_PAUSAR = { lenta: 20, real: 300 } as const

/** Onde fica cada pegada: um passinho por quadro andado, do começo até agora. */
function pegadas(x: number, passo: number): number[] {
  const lista: number[] = []
  for (let p = LIGHTHOUSE_WALK.start + passo; p <= x && lista.length < 400; p += passo)
    lista.push(p)
  return lista
}

/** A seta → do teclado só vale com o foco na experiência ou em lugar nenhum (o corpo da página). */
function setaDaExperiencia(alvo: EventTarget | null, raiz: Element | null): boolean {
  if (alvo === document.body || alvo === null) return true
  if (!(alvo instanceof Element) || !raiz?.contains(alvo)) return false
  return !(
    (alvo instanceof HTMLElement && alvo.isContentEditable) ||
    alvo.closest('input, textarea, select, video, audio, [role="slider"]')
  )
}

export function WalkEmCameraLenta() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const w = state.walk
  const [rodando, setRodando] = useState(false)
  const ritmo = w.pace ?? 'lenta'
  const reduced = useMenosMovimento()
  const seen = new Set(state.evidence.discoveries)
  const completed = [
    seen.has('moves-each-frame'),
    seen.has('stopped-after-release'),
    seen.has('walked-real-speed'),
  ]
  const goals = [
    'Segure a seta e veja um passinho em cada quadro.',
    'Solte a seta e veja os quadros passarem sem ele sair do lugar.',
    'Veja os passinhos na velocidade de verdade.',
  ]
  const saiu = lighthouseWalkGone(w)
  const dono = useRef(Symbol('camera-lenta'))

  // Outra mídia da aula (o vídeo da parte) pede a vez: os quadros param.
  useEffect(() => registerLessonMedia(dono.current, () => setRodando(false)), [])

  const rodar = (novo: 'lenta' | 'real') => {
    if (saiu) dispatch({ type: 'restart-walk' })
    // Sempre manda o ritmo: zera a sequência de passinhos, inclusive numa sessão retomada.
    dispatch({ type: 'walk-pace', pace: novo })
    setRodando(true)
    void requestLessonMediaFocus(dono.current)
  }
  const passarQuadros = (segundos: number) => {
    if (context.tick) context.tick(segundos)
    else dispatch({ type: 'advance', seconds: segundos })
    return true
  }
  useSceneClock({
    ativo: rodando && ritmo === 'lenta',
    limiar: CAMERA_LENTA_SEGUNDOS,
    exato: true,
    lento: false,
    onTick: () => passarQuadros(QUADRO),
  })
  useSceneClock({
    ativo: rodando && ritmo === 'real',
    limiar: limiarDoRelogio(reduced),
    lento: false,
    onTick: passarQuadros,
  })
  // Saiu inteiro da tela, ou ficou parado muito tempo depois de já ter visto a parada: pausa.
  const paradoDemais = seen.has('stopped-after-release') && w.idle >= PARADO_ATE_PAUSAR[ritmo]
  useEffect(() => {
    if (rodando && (saiu || paradoDemais)) setRodando(false)
  }, [rodando, saiu, paradoDemais])

  // O desafio extra: o quadro em que ele chegou à chave pela PRIMEIRA vez, fixo até voltar ao início.
  const [chegada, setChegada] = useState<number | null>(null)
  const chegou = w.x + CAIXA / 2 >= CHAVE_X
  useEffect(() => {
    if (w.frame === 0) setChegada(null)
    else if (chegou) setChegada((antes) => antes ?? w.frame)
  }, [chegou, w.frame])

  const pedeCameraLenta = !seen.has('moves-each-frame') && !(rodando && ritmo === 'lenta')
  const pedeVelocidade =
    seen.has('stopped-after-release') &&
    !seen.has('walked-real-speed') &&
    !(rodando && ritmo === 'real')
  return (
    <Frame
      title="O jogo em câmera lenta"
      kind="quadro"
      activity={activity}
      state={state}
      text={context.instruction}
      goals={goals}
      done={completed.filter(Boolean).length}
      completed={completed}
      reset={() => {
        setRodando(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <div className="walk-hud slow-hud">
          <strong>Quadro {w.frame}</strong>
          {/* A piscada recomeça a cada quadro só na câmera lenta: a 30 por segundo, tremeria. */}
          <span
            key={ritmo === 'lenta' ? w.frame : 'real'}
            className="slow-seta"
            data-on={w.arrow}
            data-pulse={ritmo === 'lenta' && w.frame > 0}
          >
            Seta apertada? {w.arrow ? '✓ sim' : '✗ não'}
          </span>
        </div>
      }
      stage={<PalcoEmCameraLenta />}
      after={
        saiu ? (
          <Note label="Fora da tela" tone="gold">
            Ele saiu da tela. Clique em Voltar ao início.
          </Note>
        ) : chegada !== null ? (
          <Note label="Chegou à chave" tone="gold">
            Ele chegou à chave em {chegada} quadros.
          </Note>
        ) : undefined
      }
    >
      <TiraDeQuadros />
      <SetaDeSegurar
        pedida={!pedeCameraLenta && !seen.has('moves-each-frame')}
        aoSegurar={() => {
          // Segurar com o jogo pausado põe os quadros para passar: a seta sozinha não anda sem eles.
          if (!rodando) rodar(ritmo)
        }}
      />
      <div className="slow-ritmo-label">Os quadros do jogo</div>
      <div
        className="sz-discovery-controls free-controls slow-ritmo"
        role="group"
        aria-label="Ritmo dos quadros"
      >
        <SceneButton
          tom={pedeCameraLenta ? 'gesto' : rodando && ritmo === 'lenta' ? 'ligado' : 'ferramenta'}
          aria-pressed={rodando && ritmo === 'lenta'}
          onClick={() => rodar('lenta')}
        >
          <Turtle size={16} /> Câmera lenta
        </SceneButton>
        <SceneButton
          tom={pedeVelocidade ? 'gesto' : rodando && ritmo === 'real' ? 'ligado' : 'ferramenta'}
          aria-pressed={rodando && ritmo === 'real'}
          onClick={() => rodar('real')}
        >
          <Play size={16} /> Velocidade de verdade
        </SceneButton>
        <SceneButton tom="ferramenta" aria-pressed={!rodando} onClick={() => setRodando(false)}>
          <Pause size={16} /> Pausar
        </SceneButton>
        <SceneButton
          onClick={() => {
            setRodando(false)
            dispatch({ type: 'restart-walk' })
          }}
        >
          <RotateCcw size={16} /> Voltar ao início
        </SceneButton>
      </div>
    </Frame>
  )
}

/** O personagem, as pegadas, a chave e o farol, numa janela que acompanha quem anda. */
function PalcoEmCameraLenta() {
  const id = useId()
  const { state } = useDiscovery()
  const w = state.walk
  const viewX = Math.max(0, Math.min(w.x - 70, LIGHTHOUSE_WALK.screen - VIEW.w))
  const marcas = pegadas(w.x, w.speed)
  const parado = (w.trail.at(-2) ?? w.x) === w.x
  return (
    <SceneCanvas
      view={{ x: viewX, y: VIEW.y, w: VIEW.w, h: VIEW.h }}
      mundo="farol"
      titulo="O personagem andando no mapa do Farol"
      descricao={`${
        marcas.length === 0
          ? 'O personagem ainda não deu nenhum passinho.'
          : `O personagem já deu ${marcas.length} ${marcas.length === 1 ? 'passinho' : 'passinhos'}, e cada um deixou uma pegada.`
      }${parado ? ' Neste quadro, ele ficou no mesmo lugar.' : ' Neste quadro, ele deu mais um passinho.'}`}
    >
      <defs>
        <pattern id={id} width="480" height="360" patternUnits="userSpaceOnUse">
          <image href={farolSvgUrl('praia-tropical')} width="480" height="360" />
        </pattern>
      </defs>
      <rect x={viewX} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={`url(#${id})`} />
      <image
        href={farolSvgUrl('farol-apagado')}
        x={FAROL_X}
        y={CAMINHO_Y - 60}
        width={76}
        height={124}
      />
      <image
        href={farolSvgUrl('chave-dourada')}
        x={CHAVE_X - 10}
        y={PE_Y - 22}
        width={20}
        height={20}
      />
      {/* O começo: uma estaca, para a distância andada ter de onde contar. */}
      <line
        data-walk-origin=""
        x1={LIGHTHOUSE_WALK.start + CAIXA / 2}
        x2={LIGHTHOUSE_WALK.start + CAIXA / 2}
        y1={PE_Y - 6}
        y2={PE_Y + 8}
        stroke="#8a5c00"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
      <g data-pegadas={marcas.length} aria-hidden>
        {marcas.map((p, i) => (
          <ellipse
            key={p}
            cx={p + CAIXA / 2}
            cy={PE_Y + (i % 2 === 0 ? 2 : 5)}
            rx={2}
            ry={1.2}
            fill="#5a3a12"
            opacity={0.75}
          />
        ))}
      </g>
      <image
        data-walk-hero={w.x}
        href={farolSvgUrl('aventureiro')}
        x={w.x}
        y={CAMINHO_Y}
        width={CAIXA}
        height={CAIXA}
      />
    </SceneCanvas>
  )
}

/** Os últimos quadros lado a lado: o desenho animado aberto, um desenho de cada vez. */
function TiraDeQuadros() {
  const { state } = useDiscovery()
  const w = state.walk
  const desde = Math.max(0, w.trail.length - QUADROS_NA_TIRA)
  const quadros = w.trail.slice(desde).map((x, i, lista) => ({
    numero: w.frame - (lista.length - 1 - i),
    x,
    andou: i === 0 ? null : x > lista[i - 1],
  }))
  // Todos os quadrinhos usam a MESMA janela e a mesma linha de referência: o passinho aparece como o
  // personagem saindo da linha.
  const referencia = quadros[0]?.x ?? w.x
  const janela = { x: referencia + CAIXA / 2 - 30, w: 70 }
  return (
    <div className="slow-tira" role="group" aria-label="Os últimos quadros do jogo">
      {quadros.map((q, i) => (
        <figure
          key={q.numero}
          className="slow-tira-quadro"
          data-current={i === quadros.length - 1}
          data-andou={q.andou ?? undefined}
        >
          <svg
            viewBox={`${janela.x} ${CAMINHO_Y - 4} ${janela.w} ${CAIXA + 10}`}
            aria-hidden="true"
          >
            <rect
              x={janela.x}
              y={CAMINHO_Y - 4}
              width={janela.w}
              height={CAIXA + 10}
              fill="#e9f6f1"
            />
            <line
              x1={referencia + CAIXA / 2}
              x2={referencia + CAIXA / 2}
              y1={CAMINHO_Y}
              y2={PE_Y + 6}
              stroke="#8a5c00"
              strokeDasharray="3 3"
            />
            <image
              href={farolSvgUrl('aventureiro')}
              x={q.x}
              y={CAMINHO_Y}
              width={CAIXA}
              height={CAIXA}
            />
          </svg>
          <figcaption>
            Quadro {q.numero}
            <small>
              {q.andou === null ? (
                ''
              ) : q.andou ? (
                <>
                  <Footprints size={12} aria-hidden /> passinho
                </>
              ) : (
                'parado'
              )}
            </small>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/**
 * A seta que se SEGURA, como no jogo: o dedo e o mouse seguram no `pointerdown` e soltam no
 * `pointerup`; Espaço e Enter no botão, e a seta → do teclado com o foco na experiência, seguram
 * enquanto a tecla está apertada. O leitor de tela (`click` sem tecla nem ponteiro) alterna. É o
 * molde do `BancadaDaTecla` (`scene-nucleo-controls.tsx`), com a ação desta cena.
 * ⚠️ Sair da parte com a seta segurada a solta: na volta, ela não anda sozinha.
 */
function SetaDeSegurar({ pedida, aoSegurar }: { pedida: boolean; aoSegurar: () => void }) {
  const { state, dispatch } = useDiscovery()
  const raiz = useRef<HTMLDivElement>(null)
  const segurando = useRef(false)
  const pelaTecla = useRef(false)
  const apertada = state.walk.arrow
  // O estado manda: "Voltar ao início" e "Recomeçar" soltam sem passar por aqui.
  useEffect(() => {
    segurando.current = apertada
  }, [apertada])
  const segurar = () => {
    if (segurando.current) return
    segurando.current = true
    dispatch({ type: 'hold-arrow', held: true })
    aoSegurar()
  }
  const soltar = () => {
    if (!segurando.current) return
    segurando.current = false
    dispatch({ type: 'hold-arrow', held: false })
  }
  const atual = useRef({ segurar, soltar })
  atual.current = { segurar, soltar }
  useEffect(() => {
    const experiencia = () => raiz.current?.closest('.sz-discovery-proposed') ?? null
    const desce = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'ArrowRight' || !setaDaExperiencia(e.target, experiencia())) return
      e.preventDefault()
      if (!e.repeat) atual.current.segurar()
    }
    const sobe = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowRight') atual.current.soltar()
    }
    const perdeu = () => atual.current.soltar()
    window.addEventListener('keydown', desce)
    window.addEventListener('keyup', sobe)
    window.addEventListener('blur', perdeu)
    return () => {
      window.removeEventListener('keydown', desce)
      window.removeEventListener('keyup', sobe)
      window.removeEventListener('blur', perdeu)
      atual.current.soltar()
    }
  }, [])
  const teclaDeApertar = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter'
  return (
    <div ref={raiz} className="slow-seta-bancada">
      <SceneButton
        tom={apertada ? 'ligado' : pedida ? 'gesto' : 'ferramenta'}
        aria-pressed={apertada}
        className="slow-seta-botao touch-none select-none [-webkit-touch-callout:none]"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
          } catch {
            // Sem captura, o `pointerup` e o `pointercancel` continuam soltando.
          }
          segurar()
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onKeyDown={(e) => {
          if (!teclaDeApertar(e)) return
          e.preventDefault()
          pelaTecla.current = true
          if (!e.repeat) segurar()
        }}
        onKeyUp={(e) => {
          if (!teclaDeApertar(e)) return
          e.preventDefault()
          soltar()
          setTimeout(() => {
            pelaTecla.current = false
          }, 0)
        }}
        onClick={(e) => {
          if (e.detail !== 0) return
          if (pelaTecla.current) {
            pelaTecla.current = false
            return
          }
          if (segurando.current) soltar()
          else segurar()
        }}
      >
        {apertada ? 'Seta apertada ▶' : 'Segure a seta ▶'}
      </SceneButton>
      <p className="sz-discovery-small">
        Segure com o dedo ou o mouse. No computador, você também pode segurar a seta → do teclado.
      </p>
    </div>
  )
}

/** Menos movimento: o relógio da velocidade de verdade anda em passos maiores, como no player. */
function useMenosMovimento() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    setReduced(media.matches)
    const muda = () => setReduced(media.matches)
    media.addEventListener?.('change', muda)
    return () => media.removeEventListener?.('change', muda)
  }, [])
  return reduced
}
