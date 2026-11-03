'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Maximize2, Monitor, Square } from 'lucide-react'
import { useId } from 'react'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { StageSizeStage } from '../scene-stages'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `stage-size` em exploração livre (Corre Dino, Aula 1, 02/11/2026): só a IDEIA, no
 * molde das telas livres do Construtor. A tela do jogo tem largura e altura, e a borda mostra onde ela
 * acaba; o bloco que prepara a tela e o da borda ficam para a montagem do Estúdio. O que a borda mostra
 * e o que acontece com ela quando o número muda só aparecem depois de testados. Os números ficam
 * abertos o tempo todo (a criança escolhe a ordem); sem a borda, mudar o número não mostra nada, e o
 * Zappy devolve o convite da borda.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'border-on': 'Ligue a borda e observe o palco.',
  resized: 'Com a borda à vista, mude a largura ou a altura e observe o contorno.',
  follows: 'Com a borda à vista, mude a largura ou a altura e observe o contorno.',
  target: 'Deixe a tela em 480 por 270, com a borda à vista, e compare com a de 800 por 480.',
}

/** As larguras e as alturas que a tela oferece: a de abertura, uma no meio e a do jogo da aula. */
export const LARGURAS = [800, 600, 480] as const
export const ALTURAS = [480, 300, 270] as const

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDaTela =
  | 'borda'
  | 'largura-800'
  | 'largura-600'
  | 'largura-480'
  | 'altura-270'
  | null
export function proximoGestoDaTela(
  fala: string | undefined,
  t: Pick<SceneState['stage'], 'width'>,
): GestoDaTela {
  switch (fala) {
    case 'stage-size-start':
    case 'stage-size-sized-hidden':
    case 'stage-size-border-off':
      return 'borda'
    case 'stage-size-border':
      return 'largura-600'
    case 'stage-size-border-600':
      return 'largura-800'
    case 'stage-size-resized':
      return t.width !== 480 ? 'largura-480' : 'altura-270'
    case 'stage-size-at-target-hidden':
      return 'largura-600'
    default:
      return null
  }
}

/** A ideia: o que a borda mostra e o que acontece com ela, revelado depois de cada teste. */
function IdeiaDaTela({ visto }: { visto: { borda: boolean; mudou: boolean; alvo: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Onde a tela do jogo acaba?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Square size={20} />}
          caso="Com a borda ligada"
          revelado={visto.borda}
          resultado="Aparece um contorno em volta da tela: é ali que a tela do jogo acaba"
        />
        <LinhaDaIdeia
          icone={<Maximize2 size={20} />}
          caso="Mudando a largura ou a altura, com a borda à vista"
          revelado={visto.mudou}
          resultado="O contorno muda junto: a tela do jogo fica de outro tamanho"
        />
        <LinhaDaIdeia
          icone={<Monitor size={20} />}
          caso="A tela de 480 por 270"
          revelado={visto.alvo}
          resultado="Menor que a de 800 por 480: é a tela do seu jogo, e tudo o que o jogo mostrar cabe dentro dela"
        />
      </div>
    </figure>
  )
}

export function LivreStageSize() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const t = state.stage
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaTela(discoveryGuidance(activity, state)?.id, t)
  const ajuda = useId()
  const tom = (alvo: GestoDaTela, escolhido: boolean) =>
    gesto === alvo ? 'gesto' : escolhido ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="Onde a tela do jogo acaba?"
      kind="tela"
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
            ['Largura', t.width],
            ['Altura', t.height],
            ['Borda', t.border ? 'ligada' : 'desligada'],
          ]}
        />
      }
      stage={<StageSizeStage state={state} alvo={false} />}
      after={
        <IdeiaDaTela
          visto={{
            borda: tem('border-on'),
            mudou: tem('resized') || tem('follows'),
            alvo: tem('target'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={t.border}
          tom={tom('borda', t.border)}
          onClick={() => dispatch({ type: 'border', visible: !t.border })}
        >
          <Square size={16} /> {t.border ? 'Desligar a borda' : 'Ligar a borda'}
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Largura da tela</legend>
        {LARGURAS.map((w) => (
          <SceneButton
            key={w}
            aria-pressed={t.width === w}
            tom={tom(`largura-${w}`, t.width === w)}
            onClick={() => dispatch({ type: 'stage', width: w, height: t.height })}
          >
            Largura {w}
          </SceneButton>
        ))}
      </fieldset>
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Altura da tela</legend>
        {ALTURAS.map((h) => (
          <SceneButton
            key={h}
            aria-pressed={t.height === h}
            tom={
              gesto === 'altura-270' && h === 270
                ? 'gesto'
                : t.height === h
                  ? 'ligado'
                  : 'ferramenta'
            }
            onClick={() => dispatch({ type: 'stage', width: t.width, height: h })}
          >
            Altura {h}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        A largura e a altura dizem o tamanho da tela do jogo, em pixels, os pontinhos da tela. O
        espaço em volta é a página, fora do jogo.
      </p>
      <DicaLivre />
    </Frame>
  )
}
