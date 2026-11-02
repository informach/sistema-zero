'use client'

import { discoveryGuidance, sceneCactiOnScreen } from '@sistemazero/core/learning/scene'
import { EyeOff, Trash2 } from 'lucide-react'
import { CleanupStage } from '../../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import { proximoGestoDaLimpeza } from '../cleanup'
import {
  BotaoDoTempo,
  DicaLivre,
  LinhaDaIdeia,
  Numeros,
  useDescobertas,
  useTempo,
} from '../nave-b-comum'
import { semDino } from './comum'

/**
 * A `cleanup` do Corre Dino em exploração livre (Aula 6, 02/11/2026): só a IDEIA, no molde da tela da
 * Nave (`scene-livre/cleanup.tsx`), com os cactos que saem pela borda da ESQUERDA (o caso
 * `cacto-esquerda`). O grupo é a lista de cactos que o jogo guarda e move; o nome do bloco fica para a
 * montagem do Estúdio. Para onde vai o cacto que sai só aparece depois de a criança testar cada jeito.
 * O destaque segue a régua da Nave (as falas do Dino são o espelho das dela).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'invisible-stored':
    'Sem tirar ninguém do jogo, deixe dois cactos saírem da tela e observe o grupo.',
  'rule-removes': 'Tirando do jogo quem sai da tela, deixe dois cactos saírem e compare o grupo.',
}

export function LivreCleanupDino() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.crowd
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaLimpeza(semDino(discoveryGuidance(activity, state)?.id), c)
  const tempo = useTempo(false)
  return (
    <Frame
      title="Para onde vai o cacto que sai da tela?"
      kind="limpeza"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => {
        tempo.parar()
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Cactos na tela', sceneCactiOnScreen(c)],
            ['Cactos no grupo', c.born - c.removed],
            // Como no palco: os removidos só aparecem com a limpeza (antes, diriam que ela existe).
            ...(c.cleanup || c.removed > 0 ? [['Removidos', c.removed] as [string, number]] : []),
          ]}
        />
      }
      stage={
        <CleanupStage
          state={state}
          cast={activity.cast}
          preset={activity.setup?.preset}
          cenario={activity.cenario}
        />
      }
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">
            Para onde vai o cacto que sai da tela?
          </figcaption>
          <div className="memory-actions">
            <LinhaDaIdeia
              icone={<EyeOff size={20} />}
              caso="Sem tirar ninguém do jogo"
              revelado={tem('invisible-stored')}
              resultado="O cacto some da tela, mas continua no grupo: o jogo ainda guarda e move cada um"
            />
            <LinhaDaIdeia
              icone={<Trash2 size={20} />}
              caso="Tirando do jogo quem sai da tela"
              revelado={tem('rule-removes')}
              resultado="O cacto sai do grupo assim que passa da borda, e vai para os removidos"
            />
          </div>
        </figure>
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={c.cleanup}
          tom={gesto === 'limpeza' ? 'gesto' : c.cleanup ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'connect', port: 'cleanup', enabled: !c.cleanup })}
        >
          {c.cleanup ? 'Parar de tirar do jogo quem sai da tela' : 'Tirar do jogo quem sai da tela'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        O grupo é a lista de cactos que o jogo guarda e move em cada quadro. Os bastidores, ao lado
        da tela, mostram quem está no grupo sem aparecer.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'passar' ? 'gesto' : 'ferramenta'}
          onClick={() => tempo.passar(1)}
        >
          Passar 1 segundo
        </SceneButton>
        <BotaoDoTempo running={tempo.running} onClick={tempo.alternar} />
      </div>
      <DicaLivre />
    </Frame>
  )
}
