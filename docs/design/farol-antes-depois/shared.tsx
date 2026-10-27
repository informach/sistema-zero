import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { SceneButton } from '@sistemazero/member-shell/components/exploration-stage'
import { SceneCenarioProvider } from '@sistemazero/member-shell/components/scene-cenario-context'
import { CollectionMemoryStage } from '@sistemazero/member-shell/components/scene-collect-and-remember'
import {
  ConsoleActions,
  ConsoleFala,
  ConsoleMundo,
  ConsolePrancha,
  ConsoleVisual,
  SceneConsole,
} from '@sistemazero/member-shell/components/scene-console'
import { SceneReadoutBand } from '@sistemazero/member-shell/components/scene-frame'
import { LighthouseKeyStage } from '@sistemazero/member-shell/components/scene-lighthouse-key'
import { LighthousePositionStage } from '@sistemazero/member-shell/components/scene-lighthouse-position'
import { LighthouseWalkStage } from '@sistemazero/member-shell/components/scene-lighthouse-walk'
import { SceneWorkspace } from '@sistemazero/member-shell/components/scene-workspace'
import { Check, FlaskConical, RotateCcw } from 'lucide-react'
import { type ReactNode, useId } from 'react'

export { SceneButton }
export function Mascot() {
  return <img src="__ZAPPY_SPEAKING__" width="72" height="72" alt="" className="farol-mascot" />
}
export function Talk({ text }: { text: string }) {
  return (
    <DialogueBlockView
      content={{ kind: 'dialogue', text }}
      speech={{ texts: [text], fallbackToBrowser: true }}
      mascot={<Mascot />}
    />
  )
}
export function Stage({ kind, state }: { kind: string; state: any }) {
  return (
    <SceneCenarioProvider cenario="farol">
      {kind === 'quadro' || kind === 'limite' ? (
        <div className="farol-walk-boundary">
          <LighthouseWalkStage state={state} />
        </div>
      ) : kind === 'memoria' ? (
        <CollectionMemoryStage state={state} />
      ) : kind === 'porta' ? (
        <LighthouseKeyStage state={state} />
      ) : (
        <LighthousePositionStage state={state} />
      )}
    </SceneCenarioProvider>
  )
}
export function Note({
  label,
  children,
  tone = 'blue',
}: {
  label: string
  children: ReactNode
  tone?: string
}) {
  return (
    <div className="farol-note" data-tone={tone}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}
export function Frame({
  title,
  activity,
  state,
  kind,
  text,
  children,
  after,
  goals,
  done,
  reset,
  stage,
  hud,
  completed,
}: {
  title: string
  activity: any
  state: any
  kind: string
  text: string
  children: ReactNode
  after?: ReactNode
  goals: string[]
  done: number
  reset: () => void
  stage?: ReactNode
  hud?: ReactNode
  completed?: boolean[]
}) {
  const id = useId()
  return (
    <SceneWorkspace
      labelledBy={id}
      header={
        <div>
          <p
            className="sz-lesson-chip mb-2 inline-flex items-center gap-2"
            data-chip="experimentation"
          >
            <FlaskConical size={15} /> Experimente
          </p>
          <h3 id={id} className="sz-display text-2xl font-bold">
            {title}
          </h3>
        </div>
      }
    >
      <div className="sz-scene-workspace-body farol-proposed">
        <SceneConsole>
          <ConsoleVisual>
            {hud ? (
              <div className="farol-simple-hud">
                <div className="farol-simple-hud-top">
                  <span className="sz-scene-placa sz-scene-momento">
                    {done === goals.length ? 'Você descobriu!' : 'Sua vez'}
                  </span>
                  <span className="farol-count">
                    {done} de {goals.length} descobertas
                  </span>
                </div>
                {hud}
              </div>
            ) : (
              <SceneReadoutBand
                activity={activity}
                state={state}
                placa={
                  <span className="sz-scene-placa sz-scene-momento">
                    {done === goals.length ? 'Você descobriu!' : 'Sua vez'}
                  </span>
                }
              >
                <span className="farol-count">
                  {done} de {goals.length} descobertas
                </span>
              </SceneReadoutBand>
            )}
            <ConsoleMundo>{stage ?? <Stage kind={kind} state={state} />}</ConsoleMundo>
            {after && (
              <div className="farol-evidence" aria-live="polite">
                {after}
              </div>
            )}
          </ConsoleVisual>
          <ConsoleActions>
            <ConsoleFala>
              <Talk text={text} />
            </ConsoleFala>
            <ConsolePrancha>{children}</ConsolePrancha>
            <ol className="farol-discoveries">
              {goals.map((g, i) => (
                <li key={g} data-done={completed?.[i] ?? i < done}>
                  <span>{(completed?.[i] ?? i < done) ? <Check size={16} /> : '○'}</span>
                  {completed ? g : i < done ? g : 'Uma descoberta para testar'}
                </li>
              ))}
            </ol>
            <SceneButton onClick={reset}>
              <RotateCcw size={15} /> Recomeçar experiência
            </SceneButton>
          </ConsoleActions>
        </SceneConsole>
      </div>
    </SceneWorkspace>
  )
}
