'use client'

import {
  discoveryGuidance,
  type SceneState,
  SPREAD_SHOT_DEVIATIONS,
  type SpreadShotDeviation,
  spreadShotHits,
} from '@sistemazero/core/learning/scene'
import { Crosshair, Equal, GitFork, MoveUp, RotateCcw, Send, Split } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { BOTOES_DO_TIRO_TRIPLO, SpreadShotStage } from '../scene-spread-shot'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * O tiro triplo (`spread-shot`, Poder "Tiro triplo" do Construtor, Nave contra Asteroides,
 * 28/11/2026) em exploração livre: só a IDEIA, no molde do `timed-shield`. Um disparo cria três
 * lasers, e o quanto cada laser anda para o lado escolhe o caminho dele. Cada linha da figura "Um
 * tiro, três caminhos" só se revela depois de a criança ver aquele caso.
 * Falas: `guia-livre/spread-shot.ts` do core.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'single-one':
    'Com o Tiro triplo desligado, clique em Disparar e em Ver os lasers chegarem. Conte quantos lasers saem.',
  'triple-stacked':
    'Com o Tiro triplo ligado e o Desvio 0, clique em Disparar e em Ver os lasers chegarem.',
  'triple-spread':
    'Com o Tiro triplo ligado e o Desvio 2, clique em Disparar e em Ver os lasers chegarem. Olhe onde cada laser chega.',
  'deviation-matters':
    'Com o Tiro triplo ligado, troque para o Desvio 1, clique em Disparar de novo e em Ver os lasers chegarem. Olhe os lasers dos lados.',
}

type Tiro = Pick<SceneState['spreadShot'], 'triple' | 'deviation' | 'lasers'>

/** O que cada teste pede da tela: o Tiro triplo e, com ele ligado, o desvio. */
const PEDE: Record<string, { triple: boolean; deviation?: SpreadShotDeviation }> = {
  single: { triple: false },
  stacked: { triple: true, deviation: 0 },
  spread: { triple: true, deviation: 2 },
  matters: { triple: true, deviation: 1 },
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: com lasers no ar, vê-los chegar;
 * senão, o controle que ainda falta para o teste da fala (o Tiro triplo, o desvio) e, pronto,
 * Disparar. O teste vem do convite (`-then-<próximo>`, `-ask-<teste>`) ou do começo.
 */
export type GestoDoTiro = 'triplo' | SpreadShotDeviation | 'disparar' | 'chegar' | null
export function proximoGestoDoTiro(fala: string | undefined, sp: Tiro): GestoDoTiro {
  if (!fala || fala === 'spread-shot-complete') return null
  if (sp.lasers.length > 0) return 'chegar'
  const teste =
    fala === 'spread-shot-start'
      ? 'single'
      : fala.startsWith('spread-shot-ask-')
        ? fala.slice('spread-shot-ask-'.length)
        : fala.split('-then-')[1]
  const pede = PEDE[teste ?? '']
  if (!pede) return null
  if (sp.triple !== pede.triple) return 'triplo'
  if (pede.deviation !== undefined && sp.deviation !== pede.deviation) return pede.deviation
  return 'disparar'
}

/** A ideia: o que cada jeito de disparar fez, revelado depois do teste dele. */
function IdeiaDoTiroTriplo({
  visto,
}: {
  visto: { simples: boolean; juntos: boolean; leque: boolean; entre: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Um tiro, três caminhos</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<MoveUp size={20} />}
          caso="Tiro simples"
          revelado={visto.simples}
          resultado="Saiu um laser só, reto até a pedra do meio"
        />
        <LinhaDaIdeia
          icone={<Equal size={20} />}
          caso="Tiro triplo com Desvio 0"
          revelado={visto.juntos}
          resultado="Os três lasers seguiram juntos e pareciam um só"
        />
        <LinhaDaIdeia
          icone={<Split size={20} />}
          caso="Tiro triplo com Desvio 2"
          revelado={visto.leque}
          resultado="Os lasers se abriram em leque: cada laser foi para uma pedra"
        />
        <LinhaDaIdeia
          icone={<GitFork size={20} />}
          caso="Tiro triplo com Desvio 1"
          revelado={visto.entre}
          resultado="Os lasers dos lados passaram entre as pedras"
        />
      </div>
    </figure>
  )
}

export function LivreSpreadShot() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const sp = state.spreadShot
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoTiro(discoveryGuidance(activity, state)?.id, sp)
  const noAr = sp.lasers.length > 0
  const ajuda = useId()
  const tom = (g: GestoDoTiro, ligado = false) =>
    gesto === g ? 'gesto' : ligado ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="O leque de tiros"
      kind="tiro-triplo"
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
            ['Lasers no ar', sp.lasers.length],
            ['Pedras acertadas', spreadShotHits(sp).length],
            ['Desvio', sp.deviation],
            ['Tiro triplo', sp.triple ? 'ligado' : 'desligado'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <SpreadShotStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoTiroTriplo
          visto={{
            simples: tem('single-one'),
            juntos: tem('triple-stacked'),
            leque: tem('triple-spread'),
            entre: tem('deviation-matters'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={sp.triple}
          tom={tom('triplo', sp.triple)}
          onClick={() => dispatch({ type: 'spread-triple', on: !sp.triple })}
        >
          <Crosshair size={15} /> {BOTOES_DO_TIRO_TRIPLO.triplo}
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Desvio dos lasers dos lados</legend>
        {SPREAD_SHOT_DEVIATIONS.map((d) => (
          <SceneButton
            key={d}
            aria-pressed={sp.deviation === d}
            tom={tom(d, sp.deviation === d)}
            onClick={() => dispatch({ type: 'spread-deviation', deviation: d })}
          >
            {BOTOES_DO_TIRO_TRIPLO.desvio(d)}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        Cada laser anda 7 para cima a cada quadro. O desvio é o quanto os lasers dos lados andam
        para o lado.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('disparar')}
          fechado={noAr}
          onClick={() => dispatch({ type: 'spread-fire' })}
        >
          <Send size={15} /> {BOTOES_DO_TIRO_TRIPLO.disparar}
        </SceneButton>
        <SceneButton
          tom={tom('chegar')}
          fechado={!noAr}
          onClick={() => dispatch({ type: 'spread-arrive' })}
        >
          {BOTOES_DO_TIRO_TRIPLO.chegar}
        </SceneButton>
        <SceneButton onClick={() => dispatch({ type: 'restart-case' })}>
          <RotateCcw size={15} /> {BOTOES_DO_TIRO_TRIPLO.voltar}
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
