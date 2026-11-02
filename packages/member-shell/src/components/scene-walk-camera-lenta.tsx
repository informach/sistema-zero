'use client'

import {
  LIGHTHOUSE_WALK,
  lighthouseWalkGone,
  lighthouseWalkOutSeenX,
  sceneCenario,
} from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { Footprints, Pause, Play, RotateCcw, Turtle } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { registerLessonMedia, requestLessonMediaFocus } from '../lib/lesson-media-focus'
import { ALTURA_NA_CENA, ArteSvg, FundoDoCenario, larguraNaCena } from './scene-arte'
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
 * ⭐ O ritmo, os botões, o selo, a tira e a seta são divididos com a beirada da tela
 * (`scene-walk-beirada.tsx`, parte 5).
 */

/**
 * ⭐ Quem anda (02/11/2026): as duas telas do andar servem ao Farol (o personagem, no mapa da praia)
 * e à Nave contra Asteroides (`activity.cenario: 'nave'`, a nave no espaço). A escolha é a MESMA do
 * palco do limite (`sceneCenario` da `lighthouse-walk`: só `nave` troca; sem cenário, o Farol).
 * ⚠️ Não é o elenco (`castText`): a figura é o sprite do PROJETO, `SCENE_ROLES['lighthouse-walk']` é
 * vazio, e o Dia 1 da Nave não declara `cast`. O texto do Farol fica letra por letra o de antes.
 */
export type QuemAnda = {
  nave: boolean
  /** "O personagem" / "A nave": o nome no começo da frase. */
  Nome: string
  /** "o personagem" / "a nave": o nome no meio da frase. */
  nome: string
  /** "Ele" / "A nave": quem anda, no começo da frase (a nave repete o nome, sem pronome). */
  Ele: string
  /** "ele" / "a nave": quem anda, no meio da frase. */
  ele: string
  /** "pegada" / "marca": o que cada passinho deixa no chão (a nave não pisa). */
  pegada: string
}
const QUEM_ANDA: Record<'farol' | 'nave', QuemAnda> = {
  farol: {
    nave: false,
    Nome: 'O personagem',
    nome: 'o personagem',
    Ele: 'Ele',
    ele: 'ele',
    pegada: 'pegada',
  },
  nave: {
    nave: true,
    Nome: 'A nave',
    nome: 'a nave',
    Ele: 'A nave',
    ele: 'a nave',
    pegada: 'marca',
  },
}
export function quemAnda(cenario: Parameters<typeof sceneCenario>[2]): QuemAnda {
  return sceneCenario(undefined, 'lighthouse-walk', cenario) === 'nave'
    ? QUEM_ANDA.nave
    : QUEM_ANDA.farol
}
export function useQuemAnda(): QuemAnda {
  return quemAnda(useDiscovery().activity.cenario)
}

/** A nave cabe na caixa de 64 do motor, centrada e ancorada no chão dela (a régua do palco do limite). */
const ESCALA_DA_NAVE = Math.min(
  LIGHTHOUSE_WALK.hero / larguraNaCena('nave'),
  LIGHTHOUSE_WALK.hero / ALTURA_NA_CENA.nave,
)

/** A figura que anda: o aventureiro do Farol ou a nave, na caixa de 64 que começa em `x`. */
function FiguraQueAnda({
  x,
  y,
  nave,
  opacity,
  dados,
}: {
  x: number
  y: number
  nave: boolean
  opacity?: number
  dados?: number
}) {
  const caixa = LIGHTHOUSE_WALK.hero
  return nave ? (
    <g
      data-walk-hero={dados}
      opacity={opacity}
      transform={`translate(${x + caixa / 2} ${y + caixa}) scale(${ESCALA_DA_NAVE})`}
    >
      <ArteSvg nome="nave" />
    </g>
  ) : (
    <image
      data-walk-hero={dados}
      href={farolSvgUrl('aventureiro')}
      x={x}
      y={y}
      width={caixa}
      height={caixa}
      opacity={opacity}
    />
  )
}

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
/** Uns 10 s parado (quadros no ritmo de cada um): pausa sozinho. */
export const PARADO_ATE_PAUSAR = { lenta: 20, real: 300 } as const

export type Ritmo = 'lenta' | 'real'

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

/**
 * O ritmo dos quadros que as experiências do andar do Farol dividem: o relógio (o MESMO
 * `useSceneClock` do player: aba escondida não conta tempo), a vez da mídia da aula e a pausa quando
 * `pararQuando` vira verdade. `reiniciarAoRodar` volta ao início antes de rodar (o personagem saiu
 * da tela e não há o que ver).
 */
export function useRitmoDosQuadros({
  pararQuando,
  reiniciarAoRodar,
}: {
  pararQuando: boolean
  reiniciarAoRodar: boolean
}) {
  const context = useDiscovery()
  const { state, dispatch } = context
  const [rodando, setRodando] = useState(false)
  const ritmo: Ritmo = state.walk.pace ?? 'lenta'
  const reduced = useMenosMovimento()
  const dono = useRef(Symbol('ritmo-dos-quadros'))

  // Outra mídia da aula (o vídeo da parte) pede a vez: os quadros param.
  useEffect(() => registerLessonMedia(dono.current, () => setRodando(false)), [])

  const rodar = (novo: Ritmo, { reiniciar = reiniciarAoRodar } = {}) => {
    if (reiniciar) dispatch({ type: 'restart-walk' })
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
  useEffect(() => {
    if (rodando && pararQuando) setRodando(false)
  }, [rodando, pararQuando])
  return { rodando, ritmo, rodar, parar: () => setRodando(false) }
}

/** Câmera lenta, Velocidade de verdade, Pausar e Voltar ao início, com o botão pedido em destaque. */
export function BotoesDoRitmo({
  rodando,
  ritmo,
  rodar,
  parar,
  pedeLenta,
  pedeReal,
}: ReturnType<typeof useRitmoDosQuadros> & { pedeLenta: boolean; pedeReal: boolean }) {
  const { dispatch } = useDiscovery()
  return (
    <>
      <div className="slow-ritmo-label">Os quadros do jogo</div>
      <div
        className="sz-discovery-controls free-controls slow-ritmo"
        role="group"
        aria-label="Ritmo dos quadros"
      >
        <SceneButton
          tom={pedeLenta ? 'gesto' : rodando && ritmo === 'lenta' ? 'ligado' : 'ferramenta'}
          aria-pressed={rodando && ritmo === 'lenta'}
          onClick={() => rodar('lenta')}
        >
          <Turtle size={16} /> Câmera lenta
        </SceneButton>
        <SceneButton
          tom={pedeReal ? 'gesto' : rodando && ritmo === 'real' ? 'ligado' : 'ferramenta'}
          aria-pressed={rodando && ritmo === 'real'}
          onClick={() => rodar('real')}
        >
          <Play size={16} /> Velocidade de verdade
        </SceneButton>
        <SceneButton tom="ferramenta" aria-pressed={!rodando} onClick={parar}>
          <Pause size={16} /> Pausar
        </SceneButton>
        <SceneButton
          onClick={() => {
            parar()
            dispatch({ type: 'restart-walk' })
          }}
        >
          <RotateCcw size={16} /> Voltar ao início
        </SceneButton>
      </div>
    </>
  )
}

/**
 * O selo do quadro de agora. A piscada recomeça a cada quadro só na câmera lenta: a 30 por segundo,
 * tremeria.
 */
export function SeloDoQuadro({ ritmo }: { ritmo: Ritmo }) {
  const w = useDiscovery().state.walk
  return (
    <div className="walk-hud slow-hud">
      <strong>Quadro {w.frame}</strong>
      <span
        key={ritmo === 'lenta' ? w.frame : 'real'}
        className="slow-seta"
        data-on={w.arrow}
        data-pulse={ritmo === 'lenta' && w.frame > 0}
      >
        Seta apertada? {w.arrow ? '✓ sim' : '✗ não'}
      </span>
    </div>
  )
}

export function WalkEmCameraLenta() {
  const context = useDiscovery()
  const { state, dispatch, activity } = context
  const quem = useQuemAnda()
  const w = state.walk
  const seen = new Set(state.evidence.discoveries)
  const completed = [
    seen.has('moves-each-frame'),
    seen.has('stopped-after-release'),
    seen.has('walked-real-speed'),
  ]
  const goals = [
    'Compare os quadros com a seta apertada.',
    'Compare os quadros com a seta solta.',
    'Compare a câmera lenta com a velocidade de verdade.',
  ]
  const saiu = lighthouseWalkGone(w)
  // Saiu inteiro da tela, ou ficou parado muito tempo depois de já ter visto a parada: pausa.
  const paradoDemais =
    seen.has('stopped-after-release') && w.idle >= PARADO_ATE_PAUSAR[w.pace ?? 'lenta']
  const ritmoDosQuadros = useRitmoDosQuadros({
    pararQuando: saiu || paradoDemais,
    reiniciarAoRodar: saiu,
  })
  const { rodando, ritmo, rodar, parar } = ritmoDosQuadros

  // O desafio extra: o quadro em que ele chegou à chave pela PRIMEIRA vez, fixo até voltar ao início.
  const [chegada, setChegada] = useState<number | null>(null)
  const chegou = w.x + CAIXA / 2 >= CHAVE_X
  useEffect(() => {
    if (w.frame === 0) setChegada(null)
    else if (chegou) setChegada((antes) => antes ?? w.frame)
  }, [chegou, w.frame])

  // A parada só se vê em câmera lenta: quem foi para a velocidade de verdade antes dela volta a ver
  // Câmera lenta em destaque.
  const pedeCameraLenta =
    (!seen.has('moves-each-frame') || !seen.has('stopped-after-release')) &&
    !(rodando && ritmo === 'lenta')
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
        parar()
        dispatch({ type: 'reset' })
      }}
      hud={<SeloDoQuadro ritmo={ritmo} />}
      stage={<PalcoEmCameraLenta />}
      after={
        saiu ? (
          <Note label="Fora da tela" tone="gold">
            {quem.Ele} saiu da tela. Clique em Voltar ao início.
          </Note>
        ) : chegada !== null && !quem.nave ? (
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
      <BotoesDoRitmo {...ritmoDosQuadros} pedeLenta={pedeCameraLenta} pedeReal={pedeVelocidade} />
    </Frame>
  )
}

/** O personagem, as pegadas, a chave e o farol, numa janela que acompanha quem anda. */
function PalcoEmCameraLenta() {
  const id = useId()
  const { state } = useDiscovery()
  const quem = useQuemAnda()
  const w = state.walk
  const viewX = Math.max(0, Math.min(w.x - 70, LIGHTHOUSE_WALK.screen - VIEW.w))
  const marcas = pegadas(w.x, w.speed)
  const parado = (w.trail.at(-2) ?? w.x) === w.x
  return (
    <SceneCanvas
      view={{ x: viewX, y: VIEW.y, w: VIEW.w, h: VIEW.h }}
      mundo={quem.nave ? 'nave' : 'farol'}
      titulo={quem.nave ? 'A nave se movendo no espaço' : 'O personagem andando no mapa do Farol'}
      descricao={`${
        marcas.length === 0
          ? `${quem.Nome} ainda não deu nenhum passinho.`
          : `${quem.Nome} já deu ${marcas.length} ${marcas.length === 1 ? 'passinho' : 'passinhos'}, e cada um deixou uma ${quem.pegada}.`
      }${parado ? ` Neste quadro, ${quem.ele} ficou no mesmo lugar.` : ` Neste quadro, ${quem.ele} deu mais um passinho.`}`}
    >
      {quem.nave ? (
        // O espaço da Nave, sem a chave nem o farol (o desafio extra da chave é só do Farol).
        <FundoDoCenario
          cenario="nave"
          w={LIGHTHOUSE_WALK.screen}
          h={360}
          chao={360}
          detalhe="calmo"
        />
      ) : (
        <>
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
        </>
      )}
      {/* O começo: uma estaca, para a distância andada ter de onde contar. */}
      <line
        data-walk-origin=""
        x1={LIGHTHOUSE_WALK.start + CAIXA / 2}
        x2={LIGHTHOUSE_WALK.start + CAIXA / 2}
        y1={PE_Y - 6}
        y2={PE_Y + 8}
        stroke={quem.nave ? '#e3edff' : '#8a5c00'}
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
            fill={quem.nave ? '#e3edff' : '#5a3a12'}
            opacity={0.75}
          />
        ))}
      </g>
      <FiguraQueAnda x={w.x} y={CAMINHO_Y} nave={quem.nave} dados={w.x} />
    </SceneCanvas>
  )
}

/**
 * Os últimos quadros lado a lado: o desenho animado aberto, um desenho de cada vez. Num quadro em
 * que o limite agiu (`walk.reach` difere do `trail`), o quadrinho diz o resultado: "↩ voltou" (estava fora da tela, com o fantasma de onde estava) ou "✋ segurou" (na
 * beirada: o passinho ia levar além, e o jogo conferiu e segurou). A frase do quadro de agora conta o
 * resto. É assim que a beirada mostra a ordem sem falar de blocos.
 */
export function TiraDeQuadros() {
  const { state } = useDiscovery()
  const quem = useQuemAnda()
  const w = state.walk
  const desde = Math.max(0, w.trail.length - QUADROS_NA_TIRA)
  const alcance = w.reach?.slice(desde)
  const quadros = w.trail.slice(desde).map((x, i, lista) => {
    const levou = alcance?.[i] ?? x
    const anterior = lista[i - 1]
    const puxou = levou !== x
    return {
      numero: w.frame - (lista.length - 1 - i),
      x,
      levou,
      puxou,
      // Puxado de FORA da tela (a régua do "saiu da tela") é voltar; na beirada, é segurar: o
      // passinho ia levar a caixa um pouco além, e o desenho nem chegou a sair.
      voltou: puxou && levou >= lighthouseWalkOutSeenX(),
      andou: anterior === undefined ? null : x > anterior,
    }
  })
  // Todos os quadrinhos usam a MESMA janela e a mesma linha de referência: o passinho aparece como o
  // personagem saindo da linha. Quando o limite agiu em algum deles, a janela fica na borda: o
  // personagem dentro e a borda à vista (ancorada no primeiro quadro, ele sumia dos quadrinhos).
  const borda = LIGHTHOUSE_WALK.screen
  const referencia = quadros[0]?.x ?? w.x
  const janela = quadros.some((q) => q.puxou)
    ? { x: borda - 50, w: 70 }
    : { x: referencia + CAIXA / 2 - 30, w: 70 }
  const bordaNaJanela = borda > janela.x && borda < janela.x + janela.w
  // ⚠️ Os lugares vazios reservam a tira inteira desde o quadro 0: sem eles, os primeiros quadros
  // empurravam a seta e os botões para baixo, e o dedo apertava no lugar errado.
  const vazios = Array.from({ length: QUADROS_NA_TIRA - quadros.length }, (_, i) => i)
  return (
    <div className="slow-tira" role="group" aria-label="Os últimos quadros do jogo">
      {vazios.map((i) => (
        <figure key={`vazio-${i}`} className="slow-tira-quadro" data-vazio="" aria-hidden="true">
          <svg viewBox={`0 0 ${janela.w} ${CAIXA + 10}`} aria-hidden="true" />
          <figcaption>
            &nbsp;
            <small />
          </figcaption>
        </figure>
      ))}
      {quadros.map((q, i) => (
        <figure
          key={q.numero}
          className="slow-tira-quadro"
          data-current={i === quadros.length - 1}
          data-andou={q.andou ?? undefined}
          data-puxou={q.puxou || undefined}
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
              fill={quem.nave ? '#16224a' : '#e9f6f1'}
            />
            {bordaNaJanela && (
              <>
                <rect
                  className="fill-scene-b-wash"
                  x={borda}
                  y={CAMINHO_Y - 4}
                  width={janela.x + janela.w - borda}
                  height={CAIXA + 10}
                />
                <line
                  className="stroke-scene-ink"
                  x1={borda}
                  x2={borda}
                  y1={CAMINHO_Y - 4}
                  y2={CAMINHO_Y + CAIXA + 6}
                  strokeWidth="1.5"
                />
              </>
            )}
            <line
              x1={referencia + CAIXA / 2}
              x2={referencia + CAIXA / 2}
              y1={CAMINHO_Y}
              y2={PE_Y + 6}
              stroke={quem.nave ? '#e3edff' : '#8a5c00'}
              strokeDasharray="3 3"
            />
            {q.voltou && (
              <FiguraQueAnda x={q.levou} y={CAMINHO_Y} nave={quem.nave} opacity={0.35} />
            )}
            <FiguraQueAnda x={q.x} y={CAMINHO_Y} nave={quem.nave} />
          </svg>
          <figcaption>
            Quadro {q.numero}
            <small>
              {q.voltou ? (
                '↩ voltou'
              ) : q.puxou ? (
                '✋ segurou'
              ) : q.andou === null ? (
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
export function SetaDeSegurar({ pedida, aoSegurar }: { pedida: boolean; aoSegurar: () => void }) {
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
