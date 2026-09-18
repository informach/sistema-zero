'use client'

import type {
  SceneAction,
  SceneActivity,
  ScenePredictionPreview,
  SceneState,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { ExperienceScene } from './experience-scene'
import { AxisZStage, Camera3dStage, MeshStage, PickRayStage } from './scene-3d-stages'
import { LivesStage } from './scene-art-stages'
import {
  FillStrokeStage,
  FramesStage,
  OnionSkinStage,
  PixelVectorStage,
  ShadingStage,
  SheetStage,
  SymmetryStage,
} from './scene-atelie-stages'
import { VariableStage, VelocityStage } from './scene-core-stages'
import {
  AccelerationStage,
  RandomStage,
  RestartStage,
  ScoreStage,
} from './scene-dino-numbers-stages'
import {
  CleanupStage,
  ControlsStage,
  GameStateStage,
  JumpSoundStage,
  LayersStage,
  SpawnStage,
} from './scene-dino-stages'
import {
  CircleCollisionStage,
  DeltaTimeStage,
  EntityStateStage,
  PoolStage,
} from './scene-motor-stages'
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
} from './scene-nucleo-stages'
import { CoordinatesStage, DrawLoopStage, ScreenReaderStage, StageSizeStage } from './scene-stages'
import { WorldStage } from './scene-world-stage'

// ⚠️⚠️ O Dino, o cacto e a árvore moravam AQUI e eram exportados (Raio-X, lote 3, 16/09/2026):
// todo palco os desenhava direto, e por isso uma turma de nave via um dinossauro. Hoje eles vivem
// em `scene-figures.tsx`, sem export, e a única porta é `ActorFigure(actorFigure(cast, papel))`.
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
 * As cenas do LABORATÓRIO: salto, impulso e área de colisão.
 *
 * ⚠⚠ Elas compartilham um palco próprio (`ExperienceScene`) porque têm a régua de altura e o
 * cacto que se arrasta. ⚠️ Quem decide onde a COMPARAÇÃO guardada aparece não é esta lista, e sim a
 * `SCENE_COMPARISONS` do core (hoje só a `hitbox`), que o player e o admin leem.
 * ⚠️ Sem a `jump-sound` desde o lote 5 do Raio-X: ela tem palco próprio (a linha do tempo dos pulos e
 * dos sons, `scene-dino-stages`), e a régua de altura não tinha nada com som.
 */
export const LABORATORIO = ['gravity', 'impulse', 'hitbox'] as const

/**
 * ⚠⚠ Guarda de TIPO, e não `includes` solto: depois dela o TypeScript sabe que `m` não é
 * nenhuma das três, e passa a reprovar todo ramo do palco compartilhado escrito para elas. Foi
 * assim que apareceram ~120 linhas MORTAS aqui (o toque para pular, a guia de altura, a fileira
 * de botões do salto): o player já mandava essas cenas para o laboratório desde sempre, e nada
 * dizia isso ao compilador.
 */
export function ehLaboratorio(cena: string): cena is (typeof LABORATORIO)[number] {
  return (LABORATORIO as readonly string[]).includes(cena)
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
 *
 * ⚠️⚠️ `fechado` NÃO é `disabled` (review do lote 1 do Raio-X). O `disabled` nativo tira o botão
 * da ordem do Tab, e o motivo ("Abre depois que…") ficava num `aria-describedby` que o teclado
 * nunca alcançava: quem navega por Tab pulava de "Enter: começar" direto para "Recomeçar", sem
 * saber que "Toque" e "Começar" existiam. Fechado, o botão continua focável, o leitor diz
 * "indisponível" junto do motivo, e nenhum gesto (clique, toque, arrasto) faz nada.
 *
 * ⚠️ E ele PERDE o relevo: fica no tom discreto (o kids deixa o fantasma plano) com a borda
 * tracejada cinza. Com a sombra de botão de sempre, o fechado parecia clicável.
 */
export function SceneButton({
  children,
  className = '',
  tom = 'ferramenta',
  fechado = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  ...props
}: ComponentProps<'button'> & { tom?: TomDoControle; fechado?: boolean }) {
  const { variant, extra } = TOM[fechado ? 'discreta' : tom]
  return (
    <Button
      variant={variant}
      {...props}
      aria-disabled={fechado || undefined}
      onClick={fechado ? undefined : onClick}
      onPointerDown={fechado ? undefined : onPointerDown}
      onPointerUp={fechado ? undefined : onPointerUp}
      onPointerMove={fechado ? undefined : onPointerMove}
      className={cn(
        'min-h-11 gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
        extra,
        className,
        fechado &&
          'cursor-not-allowed border border-dashed border-muted-foreground/50 hover:bg-transparent',
      )}
    >
      {children}
    </Button>
  )
}

export function ExplorationStage({
  activity,
  state,
  dispatch,
  escondida = false,
  preview,
}: {
  activity: SceneActivity
  state: SceneState
  dispatch?: (action: SceneAction) => void
  /**
   * O palpite ainda não veio (full review de experiência, M6): o desenho que escreve a resposta para quem
   * não enxerga (a descrição da `layers`) segue o `valoresEscondidos` da faixa.
   */
  escondida?: boolean
  /** A prévia só mostra o palco inicial, sem entregar controles ou a resposta do palpite. */
  preview?: ScenePredictionPreview
}) {
  const m = activity.scene
  const cast = activity.cast
  const podeInteragir = activity.type === 'experimentation' && !preview ? dispatch : undefined
  const valoresEscondidos = escondida || preview?.conceal.includes('layers-order') === true
  // ⚠️ As duas cenas de 14/09/2026 têm palco PRÓPRIO: uma é sobre o sistema de coordenadas da
  // tela e a outra sobre o que uma pessoa que não vê a tela recebe. Nenhuma das duas cabe no
  // palco compartilhado (chão, árvores, pista), que é sobre o mundo do jogo.
  if (m === 'coordinates') return <CoordinatesStage state={state} cast={cast} />
  if (m === 'screen-reader')
    return (
      <ScreenReaderStage
        state={state}
        dispatch={podeInteragir}
        interactive={Boolean(podeInteragir)}
        preview={Boolean(preview)}
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
          podeInteragir && m !== 'hitbox' ? (input) => dispatch({ type: 'jump', input }) : undefined
        }
        onDistance={
          podeInteragir && m === 'hitbox'
            ? (distance) => dispatch({ type: 'move', distance })
            : undefined
        }
      />
    )
  // ⭐⭐ O Corre Dino, primeira metade (lote 5 do Raio-X): palcos próprios em `scene-dino-stages`. O
  // palco compartilhado desenhava a mesma pista para as seis (o triângulo sem função, "removidos"
  // desde a abertura, a floresta escondendo o Dino inteiro), e cada uma precisa ver outra coisa.
  if (m === 'layers')
    return (
      <LayersStage state={state} cast={cast} pilha={activity.pilha} escondida={valoresEscondidos} />
    )
  if (m === 'jump-sound')
    return (
      <JumpSoundStage
        state={state}
        cast={cast}
        onJump={podeInteragir ? (input) => dispatch({ type: 'jump', input }) : undefined}
      />
    )
  if (m === 'spawn') return <SpawnStage state={state} cast={cast} />
  if (m === 'cleanup') return <CleanupStage state={state} cast={cast} />
  if (m === 'game-state')
    return <GameStateStage state={state} cast={cast} dispatch={podeInteragir} />
  if (m === 'controls') return <ControlsStage state={state} cast={cast} dispatch={podeInteragir} />
  if (m === 'draw-loop') return <DrawLoopStage state={state} cast={cast} />
  // ⭐⭐ O ateliê de O Jogo do Meu Jeito (lote 5 do Raio-X, G4): as sete cenas em
  // `scene-atelie-stages`, com a nave 32 × 32, a grade do espelho, as duas pedras e a folha da aula.
  // A das vidas segue no `scene-art-stages`.
  if (m === 'frames') return <FramesStage state={state} cast={cast} />
  if (m === 'onion-skin') return <OnionSkinStage state={state} cast={cast} />
  if (m === 'symmetry')
    return (
      <SymmetryStage
        state={state}
        cast={cast}
        // ⚠ Na demonstração a criança ASSISTE: sem o toque direto na grade.
        dispatch={podeInteragir}
      />
    )
  if (m === 'pixel-vector') return <PixelVectorStage state={state} cast={cast} />
  if (m === 'sheet-vs-sprite') return <SheetStage state={state} cast={cast} />
  if (m === 'lives') return <LivesStage state={state} cast={cast} />
  // As onze do núcleo do Iniciante 2D: mesma razão, palco próprio. Nenhuma delas cabe na pista
  // do Corre Dino — são a régua do passo, duas raquetes, uma caixa com um número, o mundo
  // maior que a tela, o mapa escrito com letras.
  if (m === 'velocity') return <VelocityStage state={state} cast={cast} />
  if (m === 'variable') return <VariableStage state={state} cast={cast} />
  // ⭐⭐ O núcleo do Iniciante 2D (lote 5 do Raio-X, G5): palcos em `scene-nucleo-stages`. A mira e o
  // mapa recebem toque DIRETO (o alvo que se arrasta, as letras do texto), só na experimentação.
  if (m === 'hold-vs-press') return <HoldVsPressStage state={state} cast={cast} />
  if (m === 'group-loop') return <GroupLoopStage state={state} cast={cast} />
  if (m === 'enemy-type') return <EnemyTypeStage state={state} cast={cast} />
  if (m === 'camera') return <CameraStage state={state} cast={cast} />
  if (m === 'contact') return <ContactStage state={state} cast={cast} />
  if (m === 'cooldown') return <CooldownStage state={state} cast={cast} />
  if (m === 'aim') return <AimStage state={state} cast={cast} dispatch={podeInteragir} />
  if (m === 'diagonal') return <DiagonalStage state={state} cast={cast} />
  if (m === 'tilemap') return <TilemapStage state={state} cast={cast} dispatch={podeInteragir} />
  // As oito do motor e do 3D (lote 5 do Raio-X): `scene-motor-stages` e `scene-3d-stages`, este pela
  // régua do 3D (`scene-3d.tsx`). As duas do ateliê (`fill-stroke`, `shading`) estão no
  // `scene-atelie-stages` desde o lote 5 (G4).
  if (m === 'pool') return <PoolStage state={state} cast={cast} />
  if (m === 'entity-state') return <EntityStateStage state={state} cast={cast} />
  if (m === 'delta-time') return <DeltaTimeStage state={state} cast={cast} />
  if (m === 'circle-collision') return <CircleCollisionStage state={state} cast={cast} />
  if (m === 'axis-z') return <AxisZStage state={state} cast={cast} />
  if (m === 'camera-3d') return <Camera3dStage state={state} cast={cast} escondida={escondida} />
  if (m === 'mesh') return <MeshStage state={state} cast={cast} />
  if (m === 'pick-ray') return <PickRayStage state={state} cast={cast} />
  if (m === 'fill-stroke') return <FillStrokeStage state={state} cast={cast} />
  if (m === 'shading') return <ShadingStage state={state} cast={cast} />
  // ⭐⭐ O Corre Dino, segunda metade (lote 5 do Raio-X): palcos próprios em
  // `scene-dino-numbers-stages`. O palco COMPARTILHADO que sobrava aqui era só destas quatro (caixas
  // de área, alça ↔, "Perto/No meio/Longe", setas soltas no céu), e foi embora junto com elas.
  if (m === 'restart')
    return (
      <RestartStage
        state={state}
        cast={cast}
        // ⚠ Na demonstração a criança ASSISTE: sem o toque direto no desenho.
        dispatch={podeInteragir}
      />
    )
  if (m === 'score')
    return (
      <ScoreStage
        state={state}
        cast={cast}
        // ⚠️ O convite "Toque para começar" é o botão da partida (consertos do review da onda A do lote 5).
        dispatch={podeInteragir}
      />
    )
  if (m === 'random') return <RandomStage state={state} cast={cast} />
  if (m === 'acceleration') return <AccelerationStage state={state} cast={cast} />
  return semPalco(m)
}

/**
 * ⚠️⚠️ O despacho é EXAUSTIVO (full review de 16/09/2026): a última linha era `return <AccelerationStage/>`,
 * e uma cena acrescentada a `SCENE_IDS` sem palco renderizava a da aceleração, sem erro nenhum. Agora ela
 * não compila na chamada acima ("não é atribuível a never"); em execução, nada é desenhado.
 */
function semPalco(_cena: never): null {
  return null
}
