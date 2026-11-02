'use client'

import { castText, discoveryGuidance } from '@sistemazero/core/learning/scene'
import { ArrowDown, ArrowRight, CornerLeftUp } from 'lucide-react'
import { ExplorationStage } from '../exploration-stage'
import { Medida } from '../scene-bench'
import { Frame, Note, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useMetasLivres } from './nave-a-comum'

/**
 * A experiência `coordinates` em exploração livre (Construtor, 02/11/2026): só a IDEIA (o x, o y e o
 * canto do 0, 0), no molde da `Position` do Farol e dos Poderes. Os campos "x" e "y" mudam um número
 * por vez; para onde cada número leva a nave só aparece na figura depois de a criança testar.
 */

/** O que comparar, por meta. Com "o Dino" para o elenco vestir ("a nave"). */
const O_QUE_COMPARAR: Record<string, string> = {
  right: 'Compare onde o Dino fica antes e depois de aumentar só o x.',
  down: 'Compare onde o Dino fica antes e depois de aumentar só o y.',
  origin: 'Leve o Dino para x 0 e y 0 e observe em que canto o Dino fica.',
}

/**
 * O campo em destaque é o gesto que a fala do Zappy pede agora: o x, o y ou os dois (o canto).
 * Os campos não são botões: o destaque é o contorno do campo (`data-gesto`).
 */
export type GestoDoEndereco = 'x' | 'y' | 'origem' | null
export function proximoGestoDoEndereco(fala: string | undefined): GestoDoEndereco {
  switch (fala) {
    case 'coordinates-start':
    case 'coordinates-x':
    case 'coordinates-origin-first':
      return 'x'
    case 'coordinates-y':
      return 'y'
    case 'coordinates-origin':
      return 'origem'
    default:
      return null
  }
}

export function LivreCoordinates() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const p = state.place
  const { tem, goals, completed, done } = useMetasLivres(O_QUE_COMPARAR)
  const gesto = proximoGestoDoEndereco(discoveryGuidance(activity, state)?.id)
  const vestir = (texto: string) => castText(texto, activity.cast)
  // O passo segue a tela do caso, como na bancada: 40 na tela de 800 × 480, 20 na do Corre Dino.
  const passo = p.width > 480 ? 40 : 20
  const campo = (eixo: 'x' | 'y') => {
    const destaque = gesto === eixo || gesto === 'origem'
    return (
      <div
        key={eixo}
        data-gesto={destaque || undefined}
        className={destaque ? 'rounded-2xl ring-2 ring-primary' : undefined}
      >
        <Medida
          label={eixo}
          value={p[eixo]}
          min={0}
          max={eixo === 'x' ? p.width : p.height}
          passo={passo}
          tom={eixo === 'x' ? 'text-scene-a' : 'text-scene-b-ink'}
          digitavel
          onChange={(valor) =>
            dispatch({
              type: 'place',
              // Um número por vez: o outro vem do estado, nunca do controle.
              x: eixo === 'x' ? valor : p.x,
              y: eixo === 'y' ? valor : p.y,
            })
          }
        />
      </div>
    )
  }
  return (
    <Frame
      title="O endereço na tela"
      kind="coordinates"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals.map(vestir)}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <Numeros
          itens={[
            ['x', String(p.x)],
            ['y', String(p.y)],
            ['Tela', `${p.width} por ${p.height}`],
          ]}
        />
      }
      stage={<ExplorationStage activity={activity} state={state} />}
      after={
        <>
          <figure className="sz-scene-regra door-rule">
            <figcaption className="sz-scene-regra-titulo">O que cada número faz</figcaption>
            <div className="memory-actions">
              <LinhaDaIdeia
                icone={<ArrowRight size={19} />}
                caso="Um x maior"
                revelado={tem('right')}
                resultado={vestir('Leva o Dino para a direita.')}
              />
              <LinhaDaIdeia
                icone={<ArrowDown size={19} />}
                caso="Um y maior"
                revelado={tem('down')}
                resultado={vestir('Leva o Dino para baixo: o y conta de cima para baixo.')}
              />
              <LinhaDaIdeia
                icone={<CornerLeftUp size={19} />}
                caso="x 0 e y 0"
                revelado={tem('origin')}
                resultado="O canto de cima, à esquerda."
              />
            </div>
          </figure>
          {state.caption && (
            <Note label="O que mudou" tone="blue">
              {vestir(state.caption)}
            </Note>
          )}
        </>
      }
    >
      <div className="sz-scene-pecas">
        {campo('x')}
        {campo('y')}
      </div>
      <p className="sz-discovery-small">Mude um número por vez e compare com o lugar de antes.</p>
      <DicaLivre />
    </Frame>
  )
}
