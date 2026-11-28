'use client'

import {
  discoveryGuidance,
  ENEMY_FIRE_SHIP_XS,
  type EnemyFireShipX,
  enemyFireOver,
  enemyFireSeconds,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import {
  Crosshair,
  Eraser,
  FastForward,
  HeartCrack,
  LocateFixed,
  RotateCcw,
  StepForward,
} from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { BOTOES_DO_INIMIGO, EnemyFireStage } from '../scene-enemy-fire'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * O inimigo que atira (`enemy-fire`, Poder "Inimigo que atira" do Construtor, Nave contra
 * Asteroides, 28/11/2026) em exploração livre: só a IDEIA, no molde do `spread-shot`. A inimiga
 * patrulha o alto e atira a cada um segundo e meio; a criança escolhe a origem do tiro (no meio ou
 * na inimiga), o lugar da nave, avança o tempo e recomeça a partida. Cada linha da figura "Um
 * inimigo com tiros próprios" só se revela depois de a criança ver aquele caso.
 * Falas: `guia-livre/enemy-fire.ts` do core.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'fixed-origin':
    'Com a origem No meio, deixe a inimiga atirar duas vezes e veja de onde os tiros saem.',
  'enemy-origin': 'Com a origem Na inimiga, deixe a inimiga atirar duas vezes e compare.',
  'shot-hurts': 'Deixe um tiro chegar até a nave e olhe as vidas.',
  'restart-clears': 'Com tiros no ar, clique em Recomeçar a partida e olhe os tiros e as vidas.',
}

type Inimigo = Pick<SceneState['enemyFire'], 'origin' | 'shipX' | 'lives' | 'shots'>

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: com a partida acabada, recomeçar;
 * senão, o controle que ainda falta para o teste da fala (a origem, o lugar da nave embaixo de um
 * tiro que desce) e, pronto, o tempo. O teste vem do convite (`-then-<próximo>`, `-ask-<teste>`) ou
 * do começo.
 */
export type GestoDoInimigo =
  | 'meio'
  | 'inimiga'
  | EnemyFireShipX
  | 'meio-segundo'
  | 'proximo-tiro'
  | 'recomecar'
  | null
export function proximoGestoDoInimigo(fala: string | undefined, f: Inimigo): GestoDoInimigo {
  if (!fala || fala === 'enemy-fire-complete') return null
  if (fala === 'enemy-fire-over' || fala.endsWith('-then-over')) return 'recomecar'
  const teste =
    fala === 'enemy-fire-start'
      ? 'fixed'
      : fala.startsWith('enemy-fire-ask-')
        ? fala.slice('enemy-fire-ask-'.length)
        : fala.split('-then-')[1]
  switch (teste) {
    case 'fixed':
      return f.origin === 'middle' ? 'proximo-tiro' : 'meio'
    case 'enemy':
      return f.origin === 'enemy' ? 'proximo-tiro' : 'inimiga'
    case 'hurts': {
      if (f.shots.length === 0) return 'proximo-tiro'
      if (f.shots.some((shot) => shot.x === f.shipX)) return 'meio-segundo'
      // O tiro que está mais perto da fileira da nave, num lugar onde a nave pode ficar.
      const alcancavel = [...f.shots]
        .sort((a, b) => b.y - a.y)
        .find((shot) => ENEMY_FIRE_SHIP_XS.some((x) => x === shot.x))
      return (ENEMY_FIRE_SHIP_XS.find((x) => x === alcancavel?.x) ??
        'meio-segundo') as GestoDoInimigo
    }
    case 'restart':
      return f.shots.length > 0 || f.lives < 3 ? 'recomecar' : 'proximo-tiro'
    default:
      return null
  }
}

/** A ideia: o que cada caso da inimiga fez, revelado depois do teste dele. */
function IdeiaDoInimigo({
  visto,
}: {
  visto: { fixa: boolean; inimiga: boolean; encosta: boolean; recomeca: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Um inimigo com tiros próprios</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<LocateFixed size={20} />}
          caso="Origem No meio"
          revelado={visto.fixa}
          resultado="Todo tiro saiu do mesmo lugar, onde quer que a inimiga estivesse"
        />
        <LinhaDaIdeia
          icone={<Crosshair size={20} />}
          caso="Origem Na inimiga"
          revelado={visto.inimiga}
          resultado="Cada tiro saiu de onde a inimiga estava naquele momento"
        />
        <LinhaDaIdeia
          icone={<HeartCrack size={20} />}
          caso="Um tiro chega até a nave"
          revelado={visto.encosta}
          resultado="O tiro saiu da tela e a nave perdeu uma vida"
        />
        <LinhaDaIdeia
          icone={<Eraser size={20} />}
          caso="Recomeçar a partida"
          revelado={visto.recomeca}
          resultado="Os tiros no ar saíram e as vidas voltaram a 3"
        />
      </div>
    </figure>
  )
}

/** O tempo da partida como a criança lê: "1,5 s". */
const tempo = (tick: number) => `${String(enemyFireSeconds(tick)).replace('.', ',')} s`

export function LivreEnemyFire() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const f = state.enemyFire
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoInimigo(discoveryGuidance(activity, state)?.id, f)
  const acabou = enemyFireOver(f)
  const ajuda = useId()
  const tom = (g: GestoDoInimigo, ligado = false) =>
    gesto === g ? 'gesto' : ligado ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="A inimiga que atira"
      kind="inimigo-que-atira"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <Numeros
          itens={[
            ['Tiros no ar', f.shots.length],
            ['Vidas', f.lives],
            ['Origem', f.origin === 'middle' ? 'no meio' : 'na inimiga'],
            ['Tempo', tempo(f.tick)],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <EnemyFireStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoInimigo
          visto={{
            fixa: tem('fixed-origin'),
            inimiga: tem('enemy-origin'),
            encosta: tem('shot-hurts'),
            recomeca: tem('restart-clears'),
          }}
        />
      }
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">{BOTOES_DO_INIMIGO.origem}</legend>
        <SceneButton
          aria-pressed={f.origin === 'middle'}
          tom={tom('meio', f.origin === 'middle')}
          onClick={() => dispatch({ type: 'enemy-origin', origin: 'middle' })}
        >
          {BOTOES_DO_INIMIGO.meio}
        </SceneButton>
        <SceneButton
          aria-pressed={f.origin === 'enemy'}
          tom={tom('inimiga', f.origin === 'enemy')}
          onClick={() => dispatch({ type: 'enemy-origin', origin: 'enemy' })}
        >
          {BOTOES_DO_INIMIGO.inimiga}
        </SceneButton>
      </fieldset>
      <fieldset className="sz-discovery-choices" aria-label="Lugar da nave">
        {ENEMY_FIRE_SHIP_XS.map((x) => (
          <SceneButton
            key={x}
            aria-pressed={f.shipX === x}
            tom={tom(x, f.shipX === x)}
            onClick={() => dispatch({ type: 'enemy-ship', x })}
          >
            {BOTOES_DO_INIMIGO.nave[x]}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        A inimiga atira a cada um segundo e meio. Cada tiro desce até sair da tela ou encostar na
        nave.
      </p>
      <div className="sz-discovery-controls free-controls" aria-describedby={ajuda}>
        <SceneButton
          tom={tom('meio-segundo')}
          fechado={acabou}
          onClick={() => dispatch({ type: 'enemy-tick' })}
        >
          <StepForward size={16} /> {BOTOES_DO_INIMIGO.meioSegundo}
        </SceneButton>
        <SceneButton
          tom={tom('proximo-tiro')}
          fechado={acabou}
          onClick={() => dispatch({ type: 'enemy-next-shot' })}
        >
          <FastForward size={16} /> {BOTOES_DO_INIMIGO.proximoTiro}
        </SceneButton>
        <SceneButton
          tom={tom('recomecar')}
          fechado={f.tick === 0}
          onClick={() => dispatch({ type: 'enemy-restart' })}
        >
          <RotateCcw size={15} /> {BOTOES_DO_INIMIGO.recomecar}
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
