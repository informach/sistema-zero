'use client'

import {
  castText,
  discoveryGuidance,
  HITBOX_DRAWINGS_TOUCH,
  SCENE_LIMITS,
  type SceneContact,
  sceneAreaPercent,
  sceneAreaWidth,
  sceneContact,
  sceneTargets,
} from '@sistemazero/core/learning/scene'
import { ChevronLeft, ChevronRight, Scan, ScanLine, Square } from 'lucide-react'
import { ExperienceScene } from '../experience-scene'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `hitbox` em exploração livre (Corre Dino, aulas 9 e 10, 02/11/2026): só a IDEIA. O
 * jogo olha a ÁREA DE CONTATO (o retângulo pontilhado), não o desenho. O palco é o laboratório de
 * sempre (`ExperienceScene`, com o cacto que se arrasta); a bancada troca os campos do Estúdio
 * ("Distância do cacto", "Tamanho da área do Dino") por aproximar, afastar e três tamanhos de área.
 *
 * ⚠️ A aula 9 só cobra o BATEU com os desenhos separados: sem meta da área no bloco, os tamanhos de
 * área nem aparecem (a área fica em 100%, como na aula). ⚠️ As áreas são 100, 80 e 40%: com 80 ou 40
 * o BATEU nunca tem vão à vista, então `contact` só cai com a área inteira (travado no core).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  contact:
    'Com a área em 100%, aproxime o cacto um toque de cada vez e observe os desenhos quando aparecer BATEU.',
  'early-hit':
    'Com a área em 100%, aproxime o cacto um toque de cada vez e observe os desenhos quando aparecer BATEU.',
  'area-contrast': 'Sem mexer no cacto, diminua a área e compare a indicação.',
  'fair-hit': 'Sem mexer no cacto, leve a área para 80% e compare a indicação.',
  'too-small': 'Com os desenhos se encostando, leve a área para 40% e observe a indicação.',
}

/** Os tamanhos de área que a tela oferece (a aula compara a área inteira com 80% e 40%). */
export const AREAS = [100, 80, 40] as const
type Area = (typeof AREAS)[number]
/** As metas que pedem os tamanhos de área (sem elas, a tela só aproxima e afasta). */
const METAS_DA_AREA = ['area-contrast', 'fair-hit', 'too-small']
const PASSO = 10

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaArea = Area | 'aproximar' | 'afastar' | null
export function proximoGestoDaArea(fala: string | undefined, c: SceneContact): GestoDaArea {
  const pct = sceneAreaPercent(c.width)
  const bate = sceneContact(c)
  /** Bateria com esta área, neste mesmo lugar? */
  const bateCom = (p: Area) => sceneContact({ distance: c.distance, width: sceneAreaWidth(p) })
  switch (fala) {
    case 'hitbox-start':
      if (pct !== 100) return 100
      // O BATEU já na tela (a área voltou a 100% com o cacto perto) não conta: o teste é chegar.
      return bate ? 'afastar' : 'aproximar'
    case 'hitbox-area':
    case 'hitbox-area-perto':
      if (pct !== 100) return 100
      if (!bate) return 'aproximar'
      // Perto demais, a área de 80% ainda bate: o contraste pede o lugar do primeiro BATEU.
      return bateCom(80) ? 'afastar' : 80
    case 'hitbox-small':
    case 'hitbox-small-first':
      if (c.distance > HITBOX_DRAWINGS_TOUCH) return 'aproximar'
      if (bateCom(40)) return 'afastar'
      return pct > 40 ? 40 : null
    default:
      return null
  }
}

/** A ideia: o que o jogo olha para saber se bateu, revelado depois de cada teste. */
function IdeiaDaArea({ metas, tem }: { metas: readonly string[]; tem: (m: string) => boolean }) {
  const pede = (...ids: string[]) => ids.some((id) => metas.includes(id))
  const viu = (...ids: string[]) => ids.some(tem)
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">
        O que o jogo olha para saber se bateu
      </figcaption>
      <div className="memory-actions">
        {pede('contact', 'early-hit') && (
          <LinhaDaIdeia
            icone={<Scan size={20} />}
            caso="Área de 100%, o cacto chegando"
            revelado={viu('contact', 'early-hit')}
            resultado="BATEU com os desenhos ainda separados: as áreas se encostaram primeiro"
          />
        )}
        {pede('area-contrast', 'fair-hit') && (
          <LinhaDaIdeia
            icone={<ScanLine size={20} />}
            caso="Área menor, o cacto no mesmo lugar"
            revelado={viu('area-contrast', 'fair-hit')}
            resultado="A batida sumiu: o jogo olha a área, não o desenho"
          />
        )}
        {pede('too-small') && (
          <LinhaDaIdeia
            icone={<Square size={20} />}
            caso="Área de 40%, os desenhos se encostando"
            revelado={tem('too-small')}
            resultado="Os desenhos se tocam, e o jogo não marca a batida"
          />
        )}
      </div>
    </figure>
  )
}

export function LivreHitbox() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.contact
  const metas = sceneTargets(activity)
  const comArea = metas.some((id) => METAS_DA_AREA.includes(id))
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaArea(discoveryGuidance(activity, state)?.id, c)
  const pct = sceneAreaPercent(c.width)
  const nome = (texto: string) => castText(texto, activity.cast)
  const mover = (distance: number) => dispatch({ type: 'move', distance })
  const { min, max } = SCENE_LIMITS.move
  return (
    <Frame
      title="Quando o jogo diz BATEU?"
      kind="area"
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
            ['Distância', c.distance],
            ['Área de contato', `${pct}%`],
            ['Indicação', sceneContact(c) ? 'BATEU!' : 'ainda não bateu'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <ExperienceScene activity={activity} state={state} onDistance={mover} />
        </SceneCenarioProvider>
      }
      after={<IdeiaDaArea metas={metas} tem={tem} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'aproximar' ? 'gesto' : 'ferramenta'}
          fechado={c.distance <= min}
          onClick={() => mover(Math.max(min, c.distance - PASSO))}
        >
          <ChevronLeft size={16} /> {nome('Aproximar o cacto')}
        </SceneButton>
        <SceneButton
          tom={gesto === 'afastar' ? 'gesto' : 'ferramenta'}
          fechado={c.distance >= max}
          onClick={() => mover(Math.min(max, c.distance + PASSO))}
        >
          {nome('Afastar o cacto')} <ChevronRight size={16} />
        </SceneButton>
      </div>
      {comArea && (
        <fieldset className="sz-discovery-choices">
          <legend className="frame-controls-label">
            {nome('Tamanho da área de contato do Dino')}
          </legend>
          {AREAS.map((p) => (
            <SceneButton
              key={p}
              aria-pressed={pct === p}
              tom={gesto === p ? 'gesto' : pct === p ? 'ligado' : 'ferramenta'}
              onClick={() => dispatch({ type: 'resize', width: sceneAreaWidth(p) })}
            >
              {p}%
            </SceneButton>
          ))}
        </fieldset>
      )}
      <p className="sz-discovery-small">
        {nome(
          'Cada toque anda 10. Você também pode arrastar o cacto no desenho. O retângulo pontilhado é a área de contato; o desenho é o Dino.',
        )}
      </p>
      <DicaLivre />
    </Frame>
  )
}
