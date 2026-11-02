'use client'

import { discoveryGuidance, SCREEN_READER_EMPTY } from '@sistemazero/core/learning/scene'
import { Ear, MessageSquareText, VolumeX } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { ScreenReaderStage } from '../scene-stages'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `screen-reader` em exploração livre (Corre Dino, Aula 2, 02/11/2026): só a IDEIA, no
 * molde das telas livres do Construtor. O leitor de tela lê a tela em voz alta para quem não consegue
 * ver; a frase do campo "Descrição do jogo" é o que ele tem para contar. O nome do bloco fica para a
 * montagem do Estúdio (o palco recebe `soAIdeia`). O que a pessoa ouve, com e sem a frase, só aparece
 * depois de cada escuta. O campo abre depois da primeira escuta (o palco de sempre).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'heard-empty': 'Com o campo vazio, ouça a tela e repare no que a pessoa fica sabendo.',
  'says-goal': 'Escreva o que se faz no jogo, ouça de novo e compare com a escuta vazia.',
  'says-control': 'Escreva também como se joga, com a tecla, e ouça de novo.',
  'says-all-controls': 'Escreva os três jeitos de pular e ouça de novo.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora (os outros gestos são escrever). */
export type GestoDoLeitor = 'ouvir' | null
export function proximoGestoDoLeitor(fala: string | undefined): GestoDoLeitor {
  return fala === 'screen-reader-start' || fala === 'screen-reader-written' ? 'ouvir' : null
}

/** A ideia: o que a pessoa fica sabendo, sem a frase e com a frase, revelado depois de cada escuta. */
function IdeiaDoLeitor({ visto }: { visto: { vazio: boolean; frase: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">
        O que a pessoa fica sabendo do jogo?
      </figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<VolumeX size={20} />}
          caso="Com o campo vazio"
          revelado={visto.vazio}
          resultado="Ouve só “Tela do jogo. Imagem.”: o programa não vê o desenho"
        />
        <LinhaDaIdeia
          icone={<MessageSquareText size={20} />}
          caso="Com a sua frase"
          revelado={visto.frase}
          resultado="Ouve a sua frase inteira: é ela que conta o jogo para quem não vê a tela"
        />
      </div>
    </figure>
  )
}

export function LivreScreenReader() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const d = state.description
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoLeitor(discoveryGuidance(activity, state)?.id)
  const ouviuFrase = d.said !== '' && d.said !== SCREEN_READER_EMPTY
  return (
    <Frame
      title="O que o leitor de tela lê?"
      kind="leitor"
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
            ['Escutas', d.listens],
            ['Campo da descrição', d.text.trim() ? 'com frase' : 'vazio'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <ScreenReaderStage
            state={state}
            dispatch={dispatch}
            interactive
            cast={activity.cast}
            soAIdeia
          />
        </SceneCenarioProvider>
      }
      after={<IdeiaDoLeitor visto={{ vazio: tem('heard-empty'), frase: ouviuFrase }} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'ouvir' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'listen' })}
        >
          <Ear size={16} /> Ouvir a tela
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        O campo Descrição do jogo fica no palco, embaixo do que a pessoa ouve. Ele abre depois da
        primeira escuta.
      </p>
      <DicaLivre />
    </Frame>
  )
}
