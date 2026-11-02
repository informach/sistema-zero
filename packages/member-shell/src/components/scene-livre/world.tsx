'use client'

import { castText, discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Eye, EyeOff, NotebookPen } from 'lucide-react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, useMetasLivres } from './nave-a-comum'

/**
 * A experiência `world` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` e dos Poderes. "Existir no jogo" (os bastidores) e "aparecer na tela" (o palco) são duas
 * coisas: a criança cria a nave nos bastidores, mostra e tira da tela, e compara os dois lados. O
 * bloco que cria e o que desenha ficam para a montagem do Estúdio.
 */

/** O que comparar, por meta. Com "o Dino" para o elenco vestir ("a nave"). */
const O_QUE_COMPARAR: Record<string, string> = {
  hidden: 'Compare os bastidores e a tela do jogo depois de criar o Dino.',
  visible: 'Compare os bastidores e a tela do jogo depois de mostrar o Dino.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDoMundo = 'criar' | 'mostrar' | 'tirar' | null
export function proximoGestoDoMundo(
  fala: string | undefined,
  w: Pick<SceneState['world'], 'created' | 'drawn'>,
): GestoDoMundo {
  switch (fala) {
    case 'world-start':
      return 'criar'
    case 'world-created':
      return w.drawn ? null : 'mostrar'
    case 'world-shown':
      return w.drawn ? 'tirar' : null
    default:
      return null
  }
}

export function LivreWorld() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const w = state.world
  const { tem, goals, completed, done } = useMetasLivres(O_QUE_COMPARAR)
  const gesto = proximoGestoDoMundo(discoveryGuidance(activity, state)?.id, w)
  const vestir = (texto: string) => castText(texto, activity.cast)
  const naTela = w.created && w.drawn
  return (
    <Frame
      title="Criar e mostrar são duas coisas diferentes"
      kind="world"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals.map(vestir)}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <div className="position-hud">
          <span>
            Existe no jogo <b>{w.created ? 'sim' : 'não'}</b>
          </span>
          <span>
            Aparece na tela <b>{naTela ? 'sim' : 'não'}</b>
          </span>
        </div>
      }
      stage={<ExplorationStage activity={activity} state={state} />}
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">
            Existir no jogo e aparecer na tela
          </figcaption>
          <div className="memory-actions">
            <LinhaDaIdeia
              icone={<NotebookPen size={19} />}
              caso="Nos bastidores"
              agora={w.created && !w.drawn}
              revelado={tem('hidden')}
              resultado={vestir('O Dino existe no jogo, com nome e lugar, mesmo sem aparecer.')}
            />
            <LinhaDaIdeia
              icone={<Eye size={19} />}
              caso="Na tela do jogo"
              agora={naTela}
              revelado={tem('visible')}
              resultado={vestir('Aparece o mesmo Dino que já existia nos bastidores.')}
            />
          </div>
        </figure>
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'criar' ? 'gesto' : 'ferramenta'}
          fechado={w.created}
          onClick={() => dispatch({ type: 'create' })}
        >
          <NotebookPen size={16} /> {vestir('Criar o Dino nos bastidores')}
        </SceneButton>
        <SceneButton
          aria-pressed={w.drawn}
          tom={
            gesto === 'mostrar' || gesto === 'tirar' ? 'gesto' : w.drawn ? 'ligado' : 'ferramenta'
          }
          fechado={!w.created}
          onClick={() => dispatch({ type: 'connect', port: 'draw', enabled: !w.drawn })}
        >
          {w.drawn ? <EyeOff size={16} /> : <Eye size={16} />}{' '}
          {vestir(w.drawn ? 'Tirar o Dino da tela' : 'Mostrar o Dino na tela')}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        {w.created
          ? vestir('O Dino já existe nos bastidores. Mostre e tire da tela quantas vezes quiser.')
          : vestir('Para aparecer na tela, o Dino precisa existir no jogo primeiro.')}
      </p>
      <DicaLivre />
    </Frame>
  )
}
