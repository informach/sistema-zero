'use client'

import type { SceneSkin, SceneSkinGame } from '@sistemazero/core/learning/scene'
import { Pause, Play, Shirt, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton } from '../scene-discovery-frame'
import { SameRulesStage } from '../scene-same-rules'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `same-rules-new-skin` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * A ideia: trocar a história muda só a APARÊNCIA; o que o jogo faz quando você aperta a tecla continua o
 * mesmo. Desligar o tiro muda o jogo de verdade. ⚠️ Sem "regra" (decisão de 02/11/2026): o palco mostra
 * "O que o jogo faz" (`SameRulesStage` com `livre`), e o botão é "Desligar o tiro".
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_TEMA = ['skin-only', 'three-skins', 'rule-off'] as const
const OBJETIVOS_DO_TEMA = [
  'Troque a nave pelo carrinho e observe o que o jogo faz.',
  'Passe pelas três histórias e compare.',
  'Desligue o tiro, clique em Tecla de tiro e observe o jogo.',
]
const HISTORIAS: { id: SceneSkin; rotulo: string }[] = [
  { id: 'space', rotulo: 'Nave no espaço' },
  { id: 'road', rotulo: 'Carrinho na estrada' },
  { id: 'sea', rotulo: 'Submarino no mar' },
]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoTema =
  | { gesto: 'historia'; tema: SceneSkin }
  | { gesto: 'desligar' | 'ligar' | 'atirar' | 'jogar' }
  | null
export function proximoGestoDoTema(
  fala: string | undefined,
  g: SceneSkinGame,
  rodando: boolean,
): GestoDoTema {
  switch (fala) {
    case 'same-rules-new-skin-start':
    case 'same-rules-new-skin-after-off':
      return g.shootEnabled ? { gesto: 'historia', tema: 'road' } : { gesto: 'ligar' }
    case 'same-rules-new-skin-road':
      if (!g.shootEnabled) return { gesto: 'ligar' }
      // Com o mar já à vista (visitado com o tiro desligado), a outra história fecha a comparação.
      return { gesto: 'historia', tema: g.theme === 'sea' ? 'space' : 'sea' }
    case 'same-rules-new-skin-skins':
      return g.shootEnabled ? { gesto: 'desligar' } : { gesto: 'atirar' }
    case 'same-rules-new-skin-off':
      return rodando ? { gesto: 'atirar' } : { gesto: 'jogar' }
    case 'same-rules-new-skin-back':
      return { gesto: 'ligar' }
    default:
      return null
  }
}

export function LivreSameRulesNewSkin() {
  const { activity, state, dispatch, instruction, has, fala, running, setRunning } = useTelaLivre()
  const game = state.skinGame
  const completed = METAS_DO_TEMA.map(has)
  const g = proximoGestoDoTema(fala, game, running)
  const tom = (qual: string) => (g?.gesto === qual ? 'gesto' : 'ferramenta')
  // O jogo anda sozinho, como na bancada de antes: é jogando que se vê o que ele faz.
  useEffect(() => {
    setRunning(true)
    return () => setRunning(false)
  }, [setRunning])
  return (
    <Frame
      title="O mesmo jogo, outra história"
      kind="tema"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DO_TEMA}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <FaixaLivre
          itens={[
            ['História', HISTORIAS.find((h) => h.id === game.theme)?.rotulo ?? ''],
            ['Tiro', game.shootEnabled ? 'ligado' : 'desligado'],
            ['Vidas', game.lives],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <SameRulesStage state={state} cast={activity.cast} dispatch={dispatch} livre />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaRevelada
          titulo="O que muda no jogo"
          casos={[
            {
              gesto: 'Trocar a história',
              resposta: 'Muda só a aparência; o que o jogo faz continua o mesmo',
              visto: (completed[0] ?? false) || (completed[1] ?? false),
              icone: <Shirt size={20} />,
            },
            {
              gesto: 'Desligar o tiro',
              resposta: 'A tecla não solta tiro: o jogo muda de verdade',
              visto: completed[2] ?? false,
              icone: <Zap size={20} />,
            },
          ]}
        />
      }
    >
      <EscolhaLivre
        legenda="A história do mesmo jogo"
        valor={game.theme}
        gesto={g?.gesto === 'historia' ? g.tema : null}
        opcoes={HISTORIAS.map((h) => ({ id: h.id, rotulo: h.rotulo }))}
        onEscolher={(theme) => dispatch({ type: 'skin', theme })}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={!game.shootEnabled}
          tom={tom(game.shootEnabled ? 'desligar' : 'ligar')}
          onClick={() => dispatch({ type: 'rule-toggle', enabled: !game.shootEnabled })}
        >
          {game.shootEnabled ? 'Desligar o tiro' : 'Ligar o tiro de volta'}
        </SceneButton>
      </div>
      <fieldset>
        <legend className="frame-controls-label">Jogar</legend>
        <div className="sz-discovery-controls free-controls">
          <SceneButton onClick={() => dispatch({ type: 'play-move', direction: -1 })}>
            ← Mover
          </SceneButton>
          <SceneButton onClick={() => dispatch({ type: 'play-move', direction: 1 })}>
            Mover →
          </SceneButton>
          <SceneButton tom={tom('atirar')} onClick={() => dispatch({ type: 'play-shoot' })}>
            Tecla de tiro
          </SceneButton>
          <SceneButton
            tom={tom('jogar')}
            aria-pressed={running}
            onClick={() => setRunning(!running)}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}{' '}
            {running ? 'Pausar o jogo' : 'Jogar'}
          </SceneButton>
        </div>
      </fieldset>
      <p className="sz-discovery-small">
        No palco, as setas do teclado movem e o Espaço faz o mesmo que Tecla de tiro. O obstáculo
        vem de cima nas três histórias.
      </p>
      <DicaLivre />
    </Frame>
  )
}
