'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Crosshair, Eraser, Hash, Rocket } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { FixedVsReadStage } from '../scene-fixed-vs-read'

/**
 * A experiência `fixed-vs-read` em exploração livre (Construtor, Nave contra Asteroides, 02/11/2026):
 * só a IDEIA, no molde de `Door` e `Memory` (`scene-discovery-controls.tsx`). O tiro precisa de um
 * número que diga onde ele nasce: um número escrito fixo (400) ou um número lido de onde ele está
 * guardado (o lugar da nave). Nada de campo, bloco nem "x do tiro = …": os blocos ficam para a
 * montagem do Estúdio. O que cada número faz só aparece depois de a criança testar aquele número.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_NUMERO_DO_TIRO = ['same-spot', 'follows', 'box-marks'] as const
export const OBJETIVOS_DO_NUMERO_DO_TIRO = [
  'Com o número escrito, atire com a nave em dois lugares e compare as marcas.',
  'Com o número lido da nave, atire com a nave em dois lugares e compare as marcas.',
  'Mostre as marcas da nave e veja de que ponto dela o tiro sai.',
]

/** Os três lugares da nave: o meio (400) é onde o número escrito e o lido coincidem. */
export const LUGARES_DA_NAVE = [
  { x: 200, rotulo: 'Esquerda' },
  { x: 400, rotulo: 'Meio' },
  { x: 600, rotulo: 'Direita' },
] as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`).
 * Para comparar um número, a criança precisa de dois tiros dele com a nave em lugares diferentes:
 * sem tiro daquele número, atirar; com tiros só no lugar de agora, mudar a nave (`lugar` diz para
 * onde); com um tiro noutro lugar, atirar de novo.
 */
export type GestoDoNumeroDoTiro =
  | { gesto: 'atirar' | 'escrito' | 'lido' | 'marcas' }
  | { gesto: 'mover'; lugar: number }
  | null
export function proximoGestoDoNumeroDoTiro(
  fala: string | undefined,
  f: SceneState['fixedRead'],
): GestoDoNumeroDoTiro {
  const comparar = (fonte: 'fixed' | 'read'): GestoDoNumeroDoTiro => {
    if (f.source !== fonte) return { gesto: fonte === 'fixed' ? 'escrito' : 'lido' }
    const tiros = f.marks.filter((m) => m.source === fonte)
    if (tiros.length > 0 && tiros.every((m) => m.heroX === f.heroX))
      return { gesto: 'mover', lugar: f.heroX === 600 ? 200 : 600 }
    return { gesto: 'atirar' }
  }
  switch (fala) {
    case 'fixed-vs-read-start':
    case 'fixed-vs-read-start-read':
    case 'fixed-vs-read-after-marks':
      return comparar(f.source)
    case 'fixed-vs-read-read':
      return comparar('read')
    case 'fixed-vs-read-fixed':
      return comparar('fixed')
    case 'fixed-vs-read-marks':
      if (!f.boxMarks) return { gesto: 'marcas' }
      return f.source === 'read' ? { gesto: 'atirar' } : { gesto: 'lido' }
    default:
      return null
  }
}

/** Os dois números e as marcas da nave, com o que cada um faz revelado só depois do teste. */
function IdeiaDoNumeroDoTiro({
  f,
  visto,
}: {
  f: SceneState['fixedRead']
  visto: { escrito: boolean; lido: boolean; marcas: boolean }
}) {
  const descobrir = 'Teste para descobrir'
  return (
    <figure className="sz-scene-regra door-rule fixed-read-idea">
      <figcaption className="sz-scene-regra-titulo">Onde o tiro nasce?</figcaption>
      <div className="door-question">
        <Hash size={20} />
        <strong>
          O tiro usa {f.source === 'fixed' ? 'um número escrito: 400' : 'um número lido da nave'}
        </strong>
      </div>
      <div className="door-forks">
        <div data-selected={f.source === 'fixed'} data-muted={f.source !== 'fixed'}>
          <span>Número escrito</span>
          {visto.escrito ? (
            <Hash size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>
            {visto.escrito ? 'Sempre no mesmo lugar, onde quer que a nave esteja' : descobrir}
          </strong>
        </div>
        <div data-selected={f.source === 'read'} data-muted={f.source !== 'read'}>
          <span>Número lido da nave</span>
          {visto.lido ? (
            <Rocket size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.lido ? 'Onde a nave está na hora do tiro' : descobrir}</strong>
        </div>
      </div>
      <div className="memory-actions">
        <div data-lit={visto.marcas}>
          <Crosshair size={20} />
          <span>
            As marcas da nave
            <small>
              {visto.marcas ? 'O tiro sai do meio da nave, da beirada de cima.' : descobrir}
            </small>
          </span>
        </div>
      </div>
    </figure>
  )
}

export function LivreFixedVsRead() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const f = state.fixedRead
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DO_NUMERO_DO_TIRO.map(has)
  const g = proximoGestoDoNumeroDoTiro(discoveryGuidance(activity, state)?.id, f)
  const tom = (qual: string) => (g?.gesto === qual ? 'gesto' : 'ferramenta')
  const fonte = (source: 'fixed' | 'read') => (
    <SceneButton
      aria-pressed={f.source === source}
      tom={
        g?.gesto === (source === 'fixed' ? 'escrito' : 'lido')
          ? 'gesto'
          : f.source === source
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => dispatch({ type: 'value-source', source })}
    >
      {source === 'fixed' ? 'Número escrito: 400' : 'Número lido da nave'}
    </SceneButton>
  )
  return (
    <Frame
      title="O número escrito e o número lido"
      kind="numero-do-tiro"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DO_NUMERO_DO_TIRO}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <div className="walk-hud">
          <strong>{f.source === 'fixed' ? 'Número escrito: 400' : 'Número lido da nave'}</strong>
          <span>
            {f.marks.length === 1 ? '1 marca de tiro' : `${f.marks.length} marcas de tiro`}
          </span>
        </div>
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <FixedVsReadStage state={state} cast={activity.cast} semCodigo />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoNumeroDoTiro
          f={f}
          visto={{
            escrito: completed[0] ?? false,
            lido: completed[1] ?? false,
            marcas: completed[2] ?? false,
          }}
        />
      }
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">De onde vem o número do tiro?</legend>
        {fonte('fixed')}
        {fonte('read')}
      </fieldset>
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">Mudar a nave de lugar</legend>
        {LUGARES_DA_NAVE.map(({ x, rotulo }) => (
          <SceneButton
            key={x}
            aria-pressed={f.heroX === x}
            tom={
              g?.gesto === 'mover' && g.lugar === x
                ? 'gesto'
                : f.heroX === x
                  ? 'ligado'
                  : 'ferramenta'
            }
            onClick={() => dispatch({ type: 'place', x, y: 0 })}
          >
            {rotulo}
          </SceneButton>
        ))}
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton tom={tom('atirar')} onClick={() => dispatch({ type: 'shoot' })}>
          <Rocket size={16} /> Atirar
        </SceneButton>
        <SceneButton
          aria-pressed={f.boxMarks}
          tom={g?.gesto === 'marcas' ? 'gesto' : f.boxMarks ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'box-marks', on: !f.boxMarks })}
        >
          <Crosshair size={16} />{' '}
          {f.boxMarks ? 'Esconder as marcas da nave' : 'Mostrar as marcas da nave'}
        </SceneButton>
        <SceneButton
          disabled={f.marks.length === 0}
          onClick={() => dispatch({ type: 'clear-marks' })}
        >
          <Eraser size={16} /> Apagar as marcas dos tiros
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Cada tiro deixa uma marca no lugar onde nasceu. Apagar as marcas recomeça as comparações;
        suas descobertas continuam marcadas.
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
        quiser.
      </p>
    </Frame>
  )
}
