'use client'

import {
  discoveryGuidance,
  type SceneState,
  sceneCactiOnScreen,
} from '@sistemazero/core/learning/scene'
import { EyeOff, Trash2 } from 'lucide-react'
import { CleanupStage } from '../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import {
  BotaoDoTempo,
  DicaLivre,
  LinhaDaIdeia,
  Numeros,
  useDescobertas,
  useTempo,
} from './nave-b-comum'

/**
 * A experiência `cleanup` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde dos
 * Poderes. "Tirar do jogo os tiros que saíram da tela"; o grupo é a lista de tiros que o jogo guarda
 * e move. O nome do bloco fica para a montagem do Estúdio. Para onde vai o tiro que sai (continua no
 * grupo, ou sai dele) só aparece depois de a criança testar cada jeito.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'invisible-stored':
    'Sem tirar ninguém do jogo, deixe dois tiros saírem da tela e observe o grupo.',
  'rule-removes': 'Tirando do jogo quem sai da tela, deixe dois tiros saírem e compare o grupo.',
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * passar o tempo, ou trocar o jeito antes de passar.
 */
export type GestoDaLimpeza = 'passar' | 'limpeza' | null
export function proximoGestoDaLimpeza(
  fala: string | undefined,
  c: Pick<SceneState['crowd'], 'cleanup'>,
): GestoDaLimpeza {
  switch (fala) {
    case 'cleanup-start':
    case 'cleanup-on-first':
      return 'passar'
    case 'cleanup-stored':
      return c.cleanup ? 'passar' : 'limpeza'
    case 'cleanup-removed':
      return c.cleanup ? 'limpeza' : 'passar'
    default:
      return null
  }
}

/** A ideia: o que acontece com o tiro que sai, nos dois jeitos, revelado depois do teste de cada um. */
function IdeiaDaLimpeza({ visto }: { visto: { guardou: boolean; tirou: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">
        Para onde vai o tiro que sai da tela?
      </figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<EyeOff size={20} />}
          caso="Sem tirar ninguém do jogo"
          revelado={visto.guardou}
          resultado="O tiro some da tela, mas continua no grupo: o jogo ainda guarda e move cada um"
        />
        <LinhaDaIdeia
          icone={<Trash2 size={20} />}
          caso="Tirando do jogo quem sai da tela"
          revelado={visto.tirou}
          resultado="O tiro sai do grupo assim que passa da borda, e vai para os removidos"
        />
      </div>
    </figure>
  )
}

export function LivreCleanup() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.crowd
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaLimpeza(discoveryGuidance(activity, state)?.id, c)
  const tempo = useTempo(false)
  return (
    <Frame
      title="Para onde vai o tiro que sai da tela?"
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
            ['Tiros na tela', sceneCactiOnScreen(c)],
            ['Tiros no grupo', c.born - c.removed],
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
        <IdeiaDaLimpeza visto={{ guardou: tem('invisible-stored'), tirou: tem('rule-removes') }} />
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
        O grupo é a lista de tiros que o jogo guarda e move em cada quadro. Os bastidores, ao lado
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
