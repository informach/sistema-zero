'use client'

import { castText, discoveryGuidance, quantos } from '@sistemazero/core/learning/scene'
import { Hand, Keyboard, Music, Volume2, VolumeX } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { JumpSoundStage } from '../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `jump-sound` em exploração livre (Corre Dino, Aula 4, 02/11/2026): só a IDEIA, no
 * molde das telas livres do Construtor. O som do pulo pode tocar em dois momentos: quando a tecla
 * Espaço é apertada, ou quando o Dino pula. Os nomes dos blocos (o efeito e os dois acontecimentos)
 * ficam para a montagem do Estúdio. O palco é a linha do tempo de sempre (`JumpSoundStage`); quantos
 * sons e quantos pulos cada teste dá só aparece depois de testado.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'false-sound':
    'Com o som na tecla, clique em Apertar Espaço duas vezes no mesmo pulo e conte os sons e os pulos.',
  'silent-jump': 'Com o som na tecla, pule tocando no Dino e conte os sons.',
  'quiet-air':
    'Com o som no pulo, clique em Apertar Espaço duas vezes no mesmo pulo e conte os sons.',
  'key-sound': 'Com o som no pulo, pule pela tecla Espaço e conte os sons.',
  'tap-sound': 'Com o som no pulo, pule tocando no Dino e conte os sons.',
  'every-jump': 'Com o som no pulo, pule pela tecla e pelo toque e compare os sons e os pulos.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDoSom = 'espaco' | 'toque' | 'som-tecla' | 'som-pulo' | null
export function proximoGestoDoSom(fala: string | undefined): GestoDoSom {
  switch (fala) {
    case 'jump-sound-key-mode':
    case 'jump-sound-in-air':
    case 'jump-sound-silent':
    case 'jump-sound-jump-mode':
    case 'jump-sound-tap-sound':
      return 'espaco'
    case 'jump-sound-false':
    case 'jump-sound-key-sound':
      return 'toque'
    case 'jump-sound-key-done':
    case 'jump-sound-settle':
      return 'som-pulo'
    case 'jump-sound-back-to-key':
      return 'som-tecla'
    default:
      return null
  }
}

/** A ideia: o que cada teste mostra, nos dois momentos do som, revelado depois de testado. */
function IdeiaDoSom({
  visto,
  t,
}: {
  visto: { semPulo: boolean; semSom: boolean; cadaPulo: boolean }
  t: (texto: string) => string
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Quando o som deve tocar?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Keyboard size={20} />}
          caso="Som na tecla, Espaço duas vezes no mesmo pulo"
          revelado={visto.semPulo}
          resultado="Dois sons para um pulo só: o segundo som veio sem pulo"
        />
        <LinhaDaIdeia
          icone={<VolumeX size={20} />}
          caso={t('Som na tecla, pulo tocando no Dino')}
          revelado={visto.semSom}
          resultado="O Dino pula e nenhum som toca: o pulo ficou sem som"
        />
        <LinhaDaIdeia
          icone={<Volume2 size={20} />}
          caso="Som no pulo, pela tecla e pelo toque"
          revelado={visto.cadaPulo}
          resultado="Um som em cada pulo, venha da tecla ou do toque"
        />
      </div>
    </figure>
  )
}

/** O "Apertar Espaço" da tela, com a mesma guarda do botão da bancada (`scene-frame.tsx`). */
function BotaoEspaco({ tom, onPress }: { tom: 'gesto' | 'ferramenta'; onPress: () => void }) {
  return (
    <SceneButton
      tom={tom}
      onClick={(e) => {
        // ⚠️ O Espaço já pulou no `keydown`: num navegador que ativa o botão no `keyup`, a mesma tecla
        // virava DOIS pulos, e o segundo, com o Dino no ar, fechava "som sem pulo" por acidente.
        if (e.currentTarget.dataset.espacoTratado) {
          delete e.currentTarget.dataset.espacoTratado
          return
        }
        onPress()
      }}
      onKeyUp={(e) => {
        const botao = e.currentTarget
        if (e.code === 'Space')
          setTimeout(() => {
            delete botao.dataset.espacoTratado
          }, 0)
      }}
      onKeyDown={(e) => {
        if (e.code === 'Space') {
          e.preventDefault()
          e.currentTarget.dataset.espacoTratado = '1'
          if (!e.repeat) onPress()
        }
      }}
    >
      <Keyboard size={16} /> Apertar Espaço
    </SceneButton>
  )
}

export function LivreJumpSound() {
  const { activity, state, dispatch, instruction, setRunning } = useDiscovery()
  const s = state.sound
  const t = (texto: string) => castText(texto, activity.cast)
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoSom(discoveryGuidance(activity, state)?.id)
  const ajuda = useId()
  const momento = (noPulo: boolean) => (
    <SceneButton
      aria-pressed={s.onJump === noPulo}
      tom={
        gesto === (noPulo ? 'som-pulo' : 'som-tecla')
          ? 'gesto'
          : s.onJump === noPulo
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => dispatch({ type: 'connect', port: 'sound', enabled: noPulo })}
    >
      {noPulo ? t('Quando o Dino pula') : 'Quando a tecla Espaço é apertada'}
    </SceneButton>
  )
  return (
    <Frame
      title="Quando o som deve tocar?"
      kind="som"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Pulos', quantos(s.jumps, 'pulo', 'pulos')],
            ['Sons', quantos(s.count, 'som', 'sons')],
            ['O som toca', s.onJump ? 'no pulo' : 'na tecla'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <JumpSoundStage
            state={state}
            cast={activity.cast}
            onJump={(input) => dispatch({ type: 'jump', input })}
          />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoSom
          t={t}
          visto={{
            semPulo: tem('false-sound'),
            semSom: tem('silent-jump'),
            cadaPulo: tem('every-jump'),
          }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">
          <Music size={14} aria-hidden /> Quando o som toca
        </legend>
        {momento(false)}
        {momento(true)}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        O mesmo som, em dois momentos diferentes. Escolha um e teste os dois jeitos de pular.
      </p>
      <div className="sz-discovery-controls free-controls">
        <BotaoEspaco
          tom={gesto === 'espaco' ? 'gesto' : 'ferramenta'}
          onPress={() => dispatch({ type: 'jump', input: 'key' })}
        />
        <SceneButton
          tom={gesto === 'toque' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'jump', input: 'tap' })}
        >
          <Hand size={16} /> Tocar para pular
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
