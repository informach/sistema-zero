'use client'

import {
  BOSS_HEALTH,
  bossHealthCanAdvance,
  bossHealthDown,
  discoveryGuidance,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import {
  ArrowDownToLine,
  Crosshair,
  HeartCrack,
  RotateCcw,
  ShieldCheck,
  StepForward,
  Trophy,
} from 'lucide-react'
import { useId } from 'react'
import { BOTOES_DO_CHEFAO, BossHealthStage } from '../scene-boss-health'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * O chefão com resistência (`boss-health`, Poder "Chefão com resistência" do Construtor, Nave
 * contra Asteroides, 28/11/2026) em exploração livre: só a IDEIA, no molde do `enemy-fire`. O chefão
 * espera no alto com 5 de vida; a criança dispara, liga ou desliga a Guarda do prêmio, avança um
 * quadro e recomeça a partida. Cada linha da figura "Um chefão que aguenta vários lasers" só se
 * revela depois de a criança ver aquele caso. Falas: `guia-livre/boss-health.ts` do core.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'one-not-enough': 'Com a vida do chefão em 5, dispare uma vez e olhe a vida e o chefão.',
  'count-down': 'Na mesma partida, dispare mais duas vezes e olhe a vida a cada laser.',
  'falls-at-zero': 'Dispare até a vida chegar a 0 e olhe o chefão e o placar.',
  'falls-once':
    'Derrote o chefão com a Guarda do prêmio Ligada e Desligada e avance um quadro depois de cada vez.',
}

type Chefao = Pick<
  SceneState['bossHealth'],
  'life' | 'guard' | 'framesAfter' | 'seenGuarded' | 'seenUnguarded'
>

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: o recomeço quando o teste não cabe
 * mais nesta partida; senão, o que ainda falta para o teste da fala (a guarda do lado ainda não
 * visto, o disparo até a queda) e, com o chefão caído, o quadro. O teste vem do convite
 * (`-then-<próximo>`, `-ask-<teste>`) ou do começo.
 */
export type GestoDoChefao = 'disparar' | 'ligada' | 'desligada' | 'quadro' | 'recomecar' | null
export function proximoGestoDoChefao(fala: string | undefined, b: Chefao): GestoDoChefao {
  if (!fala || fala === 'boss-health-complete') return null
  if (fala === 'boss-health-over') return 'recomecar'
  const teste =
    fala === 'boss-health-start'
      ? 'one'
      : fala.startsWith('boss-health-ask-')
        ? fala.slice('boss-health-ask-'.length)
        : fala.split('-then-')[1]
  const caiu = bossHealthDown(b)
  switch (teste) {
    case 'one':
      return b.life === BOSS_HEALTH.life ? 'disparar' : 'recomecar'
    case 'count':
    case 'falls':
      return caiu ? 'recomecar' : 'disparar'
    case 'once': {
      const vistaAqui = b.guard ? b.seenGuarded : b.seenUnguarded
      if (vistaAqui) return b.guard ? 'desligada' : 'ligada'
      if (!caiu) return 'disparar'
      return bossHealthCanAdvance(b) ? 'quadro' : 'recomecar'
    }
    default:
      return null
  }
}

/** A ideia: o que cada caso do chefão fez, revelado depois do teste dele. */
function IdeiaDoChefao({
  visto,
}: {
  visto: { um: boolean; desce: boolean; cai: boolean; umaVez: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Um chefão que aguenta vários lasers</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Crosshair size={20} />}
          caso="Um laser"
          revelado={visto.um}
          resultado="A vida foi de 5 para 4, e o chefão continuou lá"
        />
        <LinhaDaIdeia
          icone={<HeartCrack size={20} />}
          caso="Mais lasers"
          revelado={visto.desce}
          resultado="A cada laser, a vida desceu 1"
        />
        <LinhaDaIdeia
          icone={<ArrowDownToLine size={20} />}
          caso="A vida chega a 0"
          revelado={visto.cai}
          resultado="O chefão caiu, e o placar ganhou 10"
        />
        <LinhaDaIdeia
          icone={<ShieldCheck size={20} />}
          caso="Guarda do prêmio Ligada e Desligada"
          revelado={visto.umaVez}
          resultado="Sem a guarda, o placar subiu a cada quadro; com a guarda, o prêmio valeu uma vez só"
        />
      </div>
    </figure>
  )
}

export function LivreBossHealth() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const b = state.bossHealth
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoChefao(discoveryGuidance(activity, state)?.id, b)
  const caiu = bossHealthDown(b)
  const ajuda = useId()
  const tom = (g: GestoDoChefao, ligado = false) =>
    gesto === g ? 'gesto' : ligado ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="A resistência do chefão"
      kind="chefao-com-resistencia"
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
            ['Vida do chefão', b.life],
            ['Placar', b.score],
            ['Guarda do prêmio', b.guard ? 'Ligada' : 'Desligada'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <BossHealthStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoChefao
          visto={{
            um: tem('one-not-enough'),
            desce: tem('count-down'),
            cai: tem('falls-at-zero'),
            umaVez: tem('falls-once'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('disparar')}
          fechado={caiu}
          onClick={() => dispatch({ type: 'boss-fire' })}
        >
          <Crosshair size={15} /> {BOTOES_DO_CHEFAO.disparar}
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">{BOTOES_DO_CHEFAO.guarda}</legend>
        <SceneButton
          aria-pressed={b.guard}
          tom={tom('ligada', b.guard)}
          onClick={() => dispatch({ type: 'boss-guard', on: true })}
        >
          {BOTOES_DO_CHEFAO.ligada}
        </SceneButton>
        <SceneButton
          aria-pressed={!b.guard}
          tom={tom('desligada', !b.guard)}
          onClick={() => dispatch({ type: 'boss-guard', on: false })}
        >
          {BOTOES_DO_CHEFAO.desligada}
        </SceneButton>
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        Trocar a Guarda do prêmio começa uma partida nova. O Avançar um quadro passa o tempo do jogo
        um quadro de cada vez.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('quadro')}
          fechado={!bossHealthCanAdvance(b)}
          onClick={() => dispatch({ type: 'boss-frame' })}
        >
          <StepForward size={16} /> {BOTOES_DO_CHEFAO.quadro}
        </SceneButton>
        <SceneButton
          tom={tom('recomecar')}
          fechado={b.life === BOSS_HEALTH.life}
          onClick={() => dispatch({ type: 'boss-restart' })}
        >
          <RotateCcw size={15} /> {BOTOES_DO_CHEFAO.recomecar}
        </SceneButton>
      </div>
      {caiu && (
        <p className="sz-discovery-small">
          <Trophy size={14} /> O chefão saiu da tela. Avance um quadro e olhe o placar.
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
