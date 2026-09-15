'use client'

import {
  castText,
  type SceneAction,
  type SceneActivity,
  type SceneState,
  sceneContact,
  sceneModelFor,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import {
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from 'react'
import { cn } from '../lib/cn'
import { ExperienceScene } from './experience-scene'
import {
  FramesStage,
  LivesStage,
  OnionSkinStage,
  PixelVectorStage,
  SheetStage,
  SymmetryStage,
} from './scene-art-stages'
import { SceneCanvas } from './scene-canvas'
import {
  AimStage,
  CameraStage,
  ContactStage,
  CooldownStage,
  DiagonalStage,
  EnemyTypeStage,
  GroupLoopStage,
  HoldVsPressStage,
  TilemapStage,
  VariableStage,
  VelocityStage,
} from './scene-core-stages'
import {
  AxisZStage,
  Camera3dStage,
  CircleCollisionStage,
  DeltaTimeStage,
  EntityStateStage,
  FillStrokeStage,
  MeshStage,
  PickRayStage,
  PoolStage,
  ShadingStage,
} from './scene-engine-stages'
import { CoordinatesStage, DrawLoopStage, ScreenReaderStage, StageSizeStage } from './scene-stages'
import { WorldStage } from './scene-world-stage'

// A small workbench around the child's Dino: the scene, pieces and consequences share space.
// Existing Kids typography/tokens carry the chrome; blue gravity and amber impulse stay distinct.
export function DinoFigure({ x, y, ghost = false }: { x: number; y: number; ghost?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={ghost ? 0.3 : 1}>
      <path
        d="M-22 -8V-33H-12V-51H20V-30H4V-20H18V-13H-1V0H-11V-9H-18V0H-27V-12L-39 -24V-36L-22 -22Z"
        fill="currentColor"
      />
      <rect x="9" y="-44" width="5" height="5" rx="1" fill="white" />
    </g>
  )
}
export function CactusFigure({ x, y = 238 }: { x: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        className="fill-scene-leaf"
        d="M-7 0V-20H-20V-40H-12V-29H-7V-54Q0 -64 7 -54V-36H14V-47H22V-27H7V0Z"
      />
      {/* A nervura do cacto: clara sobre o verde, senão some dentro do corpo. */}
      <path className="stroke-scene-grass" d="M0 -49V-8" strokeWidth="2" />
    </g>
  )
}
export function TreeFigure({
  x,
  y,
  scale = 1,
  dark = false,
}: {
  x: number
  y: number
  scale?: number
  dark?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className="fill-scene-bark" d="M-6 -73H6V0H-6Z" />
      <path
        d="M-43 -28L-25 -61H-35L-16 -91H-25L0 -138L25 -91H16L35 -61H25L43 -28Z"
        className={dark ? 'fill-scene-leaf-dark' : 'fill-scene-leaf-soft'}
      />
    </g>
  )
}
/**
 * O selo no alto do palco, por cena.
 *
 * Ele nomeia o que ESTE palco mostra, na língua de quem tem 9 anos. Três grupos de cena não
 * usam este mapa: `world` e as telas da partida (lá o selo é o rótulo do próprio jogo) e as
 * duas de 14/09/2026, que têm palco próprio e saem antes daqui.
 */
/**
 * O selo do palco COMPARTILHADO — e são cinco cenas, não trinta.
 *
 * ⚠⚠ O mapa tinha 30 entradas e 25 estavam MORTAS: cada cena que ganhou palco próprio deixou
 * o rótulo dela aqui para trás, e quem fosse reescrever "O salto do Dino" mudaria um texto que
 * ninguém lê. Hoje ele lista exatamente quem cai neste palco; as telas da partida (início,
 * jogando, fim) usam o rótulo do próprio jogo e por isso não entram.
 * A varredura que cobra isso está em `tests/scene-identity.test.ts`.
 */
const STAGE_LABEL: Record<string, string> = {
  layers: 'Quem fica na frente',
  spawn: 'Os cactos que nascem',
  cleanup: 'A pista e os bastidores',
  random: 'O sorteio de cada cacto',
  acceleration: 'A velocidade dos cactos',
}

/**
 * O TOM de um controle da cena. São três, e a hierarquia é o ponto.
 *
 * ⚠️⚠️ A tela que a dona abriu tinha isto invertido: "+ Criar Dino" — a ação que MOVE a cena —
 * era um botãozinho cinza dentro de uma caixa tracejada, e "Ver de novo" era o azul grande. O
 * gesto da cena é o caminho para a frente; ferramenta é ferramenta.
 */
export type TomDoControle = 'ferramenta' | 'discreta' | 'ligado' | 'gesto'

const TOM: Record<
  TomDoControle,
  { variant: 'outline' | 'ghost' | 'secondary' | 'default'; extra: string }
> = {
  ferramenta: { variant: 'outline', extra: '' },
  /**
   * As ferramentas do rodapé (Desfazer, Recomeçar, Ligar som, Uma pista): texto clicável, não
   * peça. ⚠ É o `ghost` do app de propósito — o kids deixa fantasma e link PLANOS (o relevo 3D
   * casa só com contorno, secundário e ação), que é exatamente o peso que estes quatro devem ter.
   * Antes isso era feito com cinco `!border-transparent !bg-transparent !shadow-none` à mão.
   */
  discreta: { variant: 'ghost', extra: 'font-normal text-muted-foreground' },
  ligado: { variant: 'secondary', extra: 'border-primary text-primary' },
  gesto: { variant: 'default', extra: 'px-6' },
}

/**
 * Um controle da cena, VESTIDO PELO APP.
 *
 * ⭐⭐ Ele é o `Button` compartilhado (15/09/2026, lote 3), e não um `<button>` com classes
 * próprias. O motivo é medido, não estético: o kids dá a TODO botão do app o relevo 3D do
 * Brilliant por um seletor que casa `button[data-slot="button"]` com a classe da variante
 * (`.bg-primary.text-primary-foreground`, `.bg-background`, `.bg-secondary`). O botão da cena
 * não tinha nem o `data-slot` nem as classes de variante, então era o ÚNICO controle chapado da
 * tela — e era isso que fazia a cena parecer de outro aplicativo, mais do que qualquer cor.
 *
 * ⚠️⚠️ Por isso o TOM entra por `variant`, e não por `!bg-primary` no `className`: o `cn` é
 * `tailwind-merge`, então uma classe de fundo escrita no call site APAGA a da variante — e com
 * ela some o seletor que o app usa para dar o relevo. Um botão plano no meio de três em relevo
 * é a deriva voltando pela porta dos fundos.
 *
 * ⚠ `min-h-11` sobrepõe a altura da variante (`min-height` vence `height` quando é maior): o
 * alvo de toque de 44px é requisito do público infantil, e não um detalhe de estilo.
 */
/**
 * As cenas do LABORATÓRIO: salto, impulso, som do pulo e área de colisão.
 *
 * ⚠⚠ Elas compartilham um palco próprio (`ExperienceScene`) porque têm a régua de altura e o
 * cacto que se arrasta, e porque é delas que sai a comparação guardada. A lista é a MESMA que o
 * player usa para oferecer o "Guardar para comparar" — mexeu numa, mexa na outra.
 */
export const LABORATORIO = ['gravity', 'impulse', 'hitbox', 'jump-sound'] as const

/**
 * ⚠⚠ Guarda de TIPO, e não `includes` solto: depois dela o TypeScript sabe que `m` não é
 * nenhuma das quatro, e passa a reprovar todo ramo do palco compartilhado escrito para elas. Foi
 * assim que apareceram ~120 linhas MORTAS aqui (o toque para pular, a guia de altura, a fileira
 * de botões do salto): o player já mandava essas cenas para o laboratório desde sempre, e nada
 * dizia isso ao compilador.
 */
export function ehLaboratorio(cena: string): cena is (typeof LABORATORIO)[number] {
  return (LABORATORIO as readonly string[]).includes(cena)
}

export function SceneButton({
  children,
  className = '',
  tom = 'ferramenta',
  ...props
}: ComponentProps<'button'> & { tom?: TomDoControle }) {
  const { variant, extra } = TOM[tom]
  return (
    <Button
      variant={variant}
      {...props}
      className={cn('min-h-11 gap-2 rounded-xl px-3 py-2 text-sm font-semibold', extra, className)}
    >
      {children}
    </Button>
  )
}

/**
 * A caixa de coordenadas da cena. Os controles de arraste são botões HTML POR CIMA do SVG, e
 * eles precisam saber onde o desenho começa e termina.
 *
 * ⚠️ Antes os divisores estavam à mão no meio do JSX (`x / 6`, `y / 3.1`, `28.33%`, `600 /
 * largura`), derivados deste viewBox. Mudar o enquadramento de uma cena — que é justamente o
 * que a passada modelo a modelo pede — deslocava todos os controles em silêncio.
 *
 * ⚠️ Isto cobre a MOLDURA e os controles por cima dela: o `viewBox`, o fundo e o recorte da
 * pista. O DESENHO em si (as centenas de coordenadas dos `d="…"`) continua escrito à mão em
 * unidades desta caixa — reenquadrar uma cena segue sendo redesenhá-la, e é por isso que a
 * passada modelo a modelo existe.
 */
const STAGE = { w: 600, h: 310 } as const
const emX = (x: number) => `${(x / STAGE.w) * 100}%`
const emY = (y: number) => `${(y / STAGE.h) * 100}%`

/** Pointer input has click destinations and semantic buttons elsewhere in the scene.
 * Pointer capture tracks touch without requiring native HTML drag-and-drop. */
function Handle({
  stage,
  label,
  x,
  y,
  value,
  min,
  max,
  axis = 'x',
  unitsPerPixel = 1,
  onValue,
  children,
}: {
  stage: RefObject<SVGSVGElement | null>
  label: string
  x: number
  y: number
  value: number
  min: number
  max: number
  axis?: 'x' | 'y'
  unitsPerPixel?: number
  onValue: (value: number) => void
  children: ReactNode
}) {
  const drag = useRef<{ start: number; value: number; scale: number } | null>(null)
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)))
  function down(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    // ⚠️ Quantas unidades da cena vale um pixel da tela. Quem responde é o próprio SVG, pelo
    // `getScreenCTM`: ele já embute escala, teto de largura e zoom da página. Medir o elemento
    // em volta supunha que ele tivesse exatamente o tamanho do desenho — e com a cena agora
    // centralizada sob um teto, essa suposição é falsa na hora em que alguém põe um respiro.
    const matrix = stage.current?.getScreenCTM()
    if (!matrix) return
    drag.current = {
      start: axis === 'x' ? event.clientX : event.clientY,
      value,
      scale: 1 / (axis === 'x' ? matrix.a : matrix.d),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="absolute z-10 grid min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-xl border-2 border-primary/60 bg-background/90 px-2 text-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:cursor-grabbing"
      style={{ left: emX(x), top: emY(y) }}
      onPointerDown={down}
      onPointerMove={(event) => {
        if (!drag.current) return
        const offset =
          ((axis === 'x' ? event.clientX : event.clientY) - drag.current.start) * drag.current.scale
        onValue(clamp(drag.current.value + offset * unitsPerPixel * (axis === 'y' ? -1 : 1)))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) {
          event.preventDefault()
          onValue(
            clamp(
              value +
                (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1) *
                  (axis === 'y' ? 1 : 5),
            ),
          )
        }
      }}
    >
      {children}
    </button>
  )
}

export function ExplorationStage({
  activity,
  state,
  dispatch,
}: {
  activity: SceneActivity
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const sceneId = useId()
  const stage = useRef<SVGSVGElement>(null)
  const m = activity.scene
  const cast = activity.cast
  // ⚠️ As duas cenas de 14/09/2026 têm palco PRÓPRIO: uma é sobre o sistema de coordenadas da
  // tela e a outra sobre o que uma pessoa que não vê a tela recebe. Nenhuma das duas cabe no
  // palco compartilhado (chão, árvores, pista), que é sobre o mundo do jogo.
  if (m === 'coordinates') return <CoordinatesStage state={state} cast={cast} />
  if (m === 'screen-reader')
    return (
      <ScreenReaderStage
        state={state}
        dispatch={dispatch}
        interactive={activity.type === 'experimentation'}
        cast={cast}
      />
    )
  if (m === 'stage-size') return <StageSizeStage state={state} cast={cast} />
  /**
   * ⚠⚠ `world` saiu do palco compartilhado (lote 5): o assunto dela é *bastidores × tela*, e
   * aqui os dois nunca apareciam juntos — a tela era desenhada e "bastidores" era um controle
   * lá embaixo. A criança LIA que o Dino existia sem aparecer. Agora ela VÊ.
   */
  if (m === 'world') return <WorldStage state={state} cast={cast} />
  /**
   * ⚠⚠ As quatro cenas de salto e colisão têm palco próprio (o laboratório, com a régua de
   * altura e o cacto que se arrasta), e a ESCOLHA mora aqui desde o full review de 15/09/2026.
   * Ela vivia no player, que era o único lugar que sabia disso — então qualquer outra superfície
   * que desenhasse uma cena (a galeria das 45, por exemplo) mostrava para estas quatro um palco
   * que a criança nunca vê. Quem sabe qual é o palco de cada cena é o palco.
   */
  if (ehLaboratorio(m))
    return (
      <ExperienceScene
        activity={activity}
        state={state}
        // ⚠ Na demonstração a criança ASSISTE: sem gesto direto no desenho.
        onJump={
          activity.type === 'experimentation' && m !== 'hitbox'
            ? (input) => dispatch({ type: 'jump', input })
            : undefined
        }
        onDistance={
          activity.type === 'experimentation' && m === 'hitbox'
            ? (distance) => dispatch({ type: 'move', distance })
            : undefined
        }
      />
    )
  if (m === 'draw-loop') return <DrawLoopStage state={state} cast={cast} />
  // As cinco do ateliê e a das vidas: mesma razão, palco próprio. A folha de sprites e o
  // papel do espelho não são o mundo do jogo, e o placar com os corações precisa das duas
  // contagens à vista no instante da batida.
  if (m === 'frames') return <FramesStage state={state} cast={cast} />
  if (m === 'onion-skin') return <OnionSkinStage state={state} cast={cast} />
  if (m === 'symmetry') return <SymmetryStage state={state} cast={cast} />
  if (m === 'pixel-vector') return <PixelVectorStage state={state} cast={cast} />
  if (m === 'sheet-vs-sprite') return <SheetStage state={state} cast={cast} />
  if (m === 'lives') return <LivesStage state={state} cast={cast} />
  // As onze do núcleo do Iniciante 2D: mesma razão, palco próprio. Nenhuma delas cabe na pista
  // do Corre Dino — são a régua do passo, duas raquetes, uma caixa com um número, o mundo
  // maior que a tela, o mapa escrito com letras.
  if (m === 'velocity') return <VelocityStage state={state} cast={cast} />
  if (m === 'hold-vs-press') return <HoldVsPressStage state={state} cast={cast} />
  if (m === 'variable') return <VariableStage state={state} cast={cast} />
  if (m === 'group-loop') return <GroupLoopStage state={state} cast={cast} />
  if (m === 'enemy-type') return <EnemyTypeStage state={state} cast={cast} />
  if (m === 'camera') return <CameraStage state={state} cast={cast} />
  if (m === 'contact') return <ContactStage state={state} cast={cast} />
  if (m === 'cooldown') return <CooldownStage state={state} cast={cast} />
  if (m === 'aim') return <AimStage state={state} cast={cast} />
  if (m === 'diagonal') return <DiagonalStage state={state} cast={cast} />
  if (m === 'tilemap') return <TilemapStage state={state} cast={cast} />
  // As dez do motor, do 3D e do ateliê: dois contadores que discordam, três cérebros lado a
  // lado, duas máquinas correndo o mesmo jogo, a conta da colisão escrita à vista — e o 3D,
  // desenhado à mão em SVG (ver o cabeçalho do `scene-engine-stages`).
  if (m === 'pool') return <PoolStage state={state} cast={cast} />
  if (m === 'entity-state') return <EntityStateStage state={state} cast={cast} />
  if (m === 'delta-time') return <DeltaTimeStage state={state} cast={cast} />
  if (m === 'circle-collision') return <CircleCollisionStage state={state} cast={cast} />
  if (m === 'axis-z') return <AxisZStage state={state} cast={cast} />
  if (m === 'camera-3d') return <Camera3dStage state={state} cast={cast} />
  if (m === 'mesh') return <MeshStage state={state} cast={cast} />
  if (m === 'pick-ray') return <PickRayStage state={state} cast={cast} />
  if (m === 'fill-stroke') return <FillStrokeStage state={state} cast={cast} />
  if (m === 'shading') return <ShadingStage state={state} cast={cast} />
  const collision = m === 'restart'
  const speed = m === 'random' || m === 'acceleration'
  const visibleSpeedCacti = state.crowd.cacti.filter((c) => c.x >= 0 && c.x * 0.9 <= STAGE.w)
  const outsideSpeedCount = state.crowd.cacti.length - visibleSpeedCacti.length
  const population = ['spawn', 'cleanup', 'game-state'].includes(m)
  const screen = ['controls', 'restart', 'game-state', 'score'].includes(m)
  const contact = sceneContact(state.contact)
  const layer = (
    <g>
      {[110, 170, 235].map((x, i) => (
        <TreeFigure key={x} x={x} y={i === 1 ? 238 : 253} dark={i === 1} />
      ))}
    </g>
  )
  const dino = (
    <g className="text-primary">
      <DinoFigure x={170} y={238} />
    </g>
  )
  /**
   * Os controles que ficam POR CIMA do desenho.
   *
   * ⚠⚠ Eles são HTML, e não SVG: as alças de arraste precisam ser alvo de toque e de teclado
   * de verdade, e o "Toque para começar" é um botão. Por isso são irmãos do `<svg>` dentro da
   * moldura posicionada, e chegam ao `SceneCanvas` pelo `overlay` — só este palco tem isso.
   */
  const controles = (
    <>
      {collision && (
        <Handle
          stage={stage}
          label={castText('Mover cacto com arraste ou setas', cast)}
          x={170 + state.contact.distance}
          y={215}
          value={state.contact.distance}
          min={20}
          max={260}
          onValue={(distance) => dispatch({ type: 'move', distance })}
        >
          ↔
        </Handle>
      )}
      {screen && state.match.screen === 'start' && (
        <div className="absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2">
          <SceneButton onClick={() => dispatch({ type: 'start', input: 'tap' })}>
            ▶ Toque para começar
          </SceneButton>
        </div>
      )}
      {m === 'restart' && state.match.screen === 'end' && (
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2">
          <SceneButton onClick={() => dispatch({ type: 'restart' })}>↻ Jogar de novo</SceneButton>
        </div>
      )}
    </>
  )
  return (
    <div className="space-y-3">
      {/* ⚠️⚠️ A `descricao` diz o que o DESENHO mostra, e não o que acabou de acontecer.
          Três coisas falam com o leitor de tela nesta cena e cada uma tem um papel: a faixa de
          estado dá os NÚMEROS, o `role="status"` abaixo do palco narra a MUDANÇA, e esta
          descrição diz o que está desenhado. A primeira correção do full review pôs a narração
          aqui também, e aí o leitor ouvia a mesma frase duas vezes — trocar uma duplicação por
          outra. O `manipulates` do modelo é estável e descreve a cena, e o `SceneCanvas` o veste
          com o elenco: ele cita o personagem pelo nome, e é esta frase que quem não enxerga
          ouve no lugar do desenho. */}
      <SceneCanvas
        className="relative"
        svgRef={stage}
        view={STAGE}
        cast={cast}
        titulo="Cena da descoberta"
        descricao={`Cena com ${sceneModelFor(activity).manipulates.toLowerCase()}.`}
        overlay={controles}
      >
        <defs>
          <pattern id={`${sceneId}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle className="fill-scene-grid" cx="2" cy="2" r="1" />
          </pattern>
        </defs>
        <rect width={STAGE.w} height={STAGE.h} fill={`url(#${sceneId}-dots)`} opacity="0.35" />
        <path className="fill-scene-grass" d="M0 238H600V310H0Z" />
        <path className="stroke-scene-line" d="M0 238H600" strokeWidth="2" />
        <path className="fill-scene-grid" d="M390 180L460 115L530 180Z" />
        {/* ⚠️ As três telas seguem em caixa alta porque são o RÓTULO DO JOGO: é assim que
              início, jogando e fim aparecem para quem joga, e a cena está mostrando a tela.
              O que saiu daqui foi "SEU LABORATÓRIO DINO", que era o mesmo jargão de adulto do
              "observatório" da cena de referência — e, pior, dizia a mesma coisa nas cinco
              cenas que caem neste ramo. O selo agora diz o que ESTE palco mostra. */}
        <text className="fill-scene-ink" x="20" y="28" fontSize="13" fontWeight="600">
          {screen
            ? state.match.screen === 'start'
              ? 'INÍCIO'
              : state.match.screen === 'end'
                ? 'FIM DA PARTIDA'
                : 'JOGANDO'
            : castText(STAGE_LABEL[m] ?? '', cast)}
        </text>
        {m === 'layers' ? (
          <>
            {state.world.front ? layer : dino}
            {state.world.front ? dino : layer}
          </>
        ) : state.world.created &&
          state.world.drawn &&
          (!screen || state.match.screen !== 'start') ? (
          dino
        ) : null}
        {collision && (
          <>
            <CactusFigure x={170 + state.contact.distance} />
            <rect
              x={170 - state.contact.width / 2}
              y="181"
              width={state.contact.width}
              height="57"
              className={
                contact
                  ? 'fill-scene-alert-wash stroke-scene-alert'
                  : 'fill-scene-a-wash stroke-scene-a'
              }
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <rect
              x={152 + state.contact.distance}
              y="181"
              width="36"
              height="57"
              fill="none"
              className={contact ? 'stroke-scene-alert' : 'stroke-scene-leaf'}
              strokeWidth="2"
            />
            <text
              x="430"
              y="64"
              className={contact ? 'fill-scene-alert' : 'fill-scene-ink'}
              fontSize="16"
              fontWeight="600"
            >
              {contact ? 'As áreas encostaram!' : 'Ainda estão separadas'}
            </text>
          </>
        )}
        {population &&
          state.crowd.cacti
            .filter((c) => c.x >= 0 && c.x <= 480)
            .slice(-24)
            .map((c) => <CactusFigure key={c.id} x={60 + c.x} />)}
        {population && (
          <text className="fill-scene-ink" x="24" y="282" fontSize="14">
            {state.crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480).length} na tela ·{' '}
            {state.crowd.born - state.crowd.removed} no grupo · {state.crowd.removed} removidos
          </text>
        )}
        {m === 'cleanup' && (
          <>
            <path
              className="stroke-scene-bark"
              d="M60 75V238"
              strokeWidth="3"
              strokeDasharray="7 4"
            />
            <text className="fill-scene-b-ink" x="65" y="90" fontSize="12">
              saída
            </text>
          </>
        )}
        {m === 'score' && (
          <g>
            <rect
              className="fill-scene-card stroke-scene-grid"
              x="345"
              y="72"
              width="170"
              height="110"
              rx="18"
            />
            <text className="fill-scene-ink" x="430" y="102" textAnchor="middle" fontSize="14">
              SEU PLACAR
            </text>
            <text
              className="fill-scene-ink"
              x="430"
              y="156"
              textAnchor="middle"
              fontSize="46"
              fontWeight="700"
            >
              {state.match.points}
            </text>
          </g>
        )}
        {speed && (
          <>
            <path className="stroke-scene-b" d="M450 76H504" strokeWidth="8" opacity="0.5" />
            <text className="fill-scene-b-ink" x="477" y="60" textAnchor="middle" fontSize="13">
              {m === 'random' ? 'nascer: 500–560' : 'nascer: 500'}
            </text>
            {visibleSpeedCacti.slice(-4).map((c, i) => {
              const x = 0.9 * c.x
              return (
                <g key={c.id} aria-label={`Cacto ${c.id}, velocidade ${c.velocity}`}>
                  <CactusFigure x={x} y={232 - i * 3} />
                  <path
                    d={`M${x} ${124 + i * 22}h${c.velocity * 9}l8 -5m-8 5l8 5`}
                    className={i % 2 ? 'stroke-scene-b' : 'stroke-scene-a'}
                    strokeWidth="3"
                    fill="none"
                  />
                  <text className="fill-scene-ink" x={x + 5} y={129 + i * 22} fontSize="13">
                    {c.velocity}
                  </text>
                </g>
              )
            })}
            <text className="fill-scene-ink" x="22" y="282" fontSize="14">
              {m === 'acceleration'
                ? `base ${state.speed.base} · ${state.speed.ticks} passos do relógio`
                : 'Base −5 · descontar 0 ou 1 → −5 ou −6'}
            </text>
          </>
        )}
      </SceneCanvas>
      {speed && outsideSpeedCount > 0 && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {outsideSpeedCount}{' '}
          {castText(outsideSpeedCount === 1 ? 'cacto fora' : 'cactos fora', cast)} da pista
        </p>
      )}
      {collision && (
        <div
          role="group"
          className="flex flex-wrap gap-2"
          aria-label={castText('Destinos do cacto sem arrastar', cast)}
        >
          {[25, 60, 180].map((distance, i) => (
            <SceneButton key={distance} onClick={() => dispatch({ type: 'move', distance })}>
              {['Perto', 'No meio', 'Longe'][i]}
            </SceneButton>
          ))}
        </div>
      )}
      {screen && (
        <div className="flex flex-wrap gap-2">
          <SceneButton
            disabled={state.match.screen !== 'start'}
            onClick={() => dispatch({ type: 'start', input: 'key' })}
          >
            Enter: começar
          </SceneButton>
          <SceneButton
            disabled={state.match.screen === 'start'}
            onClick={() => dispatch({ type: 'home' })}
          >
            Voltar ao início
          </SceneButton>
          {(m === 'score' || m === 'restart') && (
            <SceneButton
              disabled={state.match.screen !== 'playing'}
              onClick={() => dispatch({ type: 'collide' })}
            >
              Aproximar até bater
            </SceneButton>
          )}
        </div>
      )}
    </div>
  )
}
