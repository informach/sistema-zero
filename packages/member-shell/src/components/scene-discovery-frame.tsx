'use client'
import type { SceneAction, SceneActivity, SceneState } from '@sistemazero/core/learning/scene'
import { Check, RotateCcw } from 'lucide-react'
import { createContext, type ReactNode, useContext } from 'react'
import { SceneButton } from './exploration-stage'
import {
  ConsoleActions,
  ConsoleFala,
  ConsoleMundo,
  ConsolePrancha,
  ConsoleVisual,
  SceneConsole,
} from './scene-console'
import { SceneReadoutBand } from './scene-frame'

export { SceneButton }
export const DiscoveryContext = createContext<{
  activity: SceneActivity
  state: SceneState
  dispatch: (a: SceneAction) => void
  instruction: string
  running: boolean
  setRunning: (v: boolean) => void
  dialogue: (text: string) => ReactNode
  tools: ReactNode
} | null>(null)
export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw Error('Discovery context missing')
  return context
}
function Talk({ text }: { text: string }) {
  return useDiscovery().dialogue(text)
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
    <div className="sz-discovery-note" data-tone={tone}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}
export function Frame({
  activity,
  state,
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
  activity: SceneActivity
  state: SceneState
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
  const context = useDiscovery()
  return (
    <div className="sz-scene-workspace-body sz-discovery-proposed">
      <SceneConsole>
        <ConsoleVisual>
          {hud ? (
            <div className="sz-discovery-simple-hud">
              <div className="sz-discovery-simple-hud-top">
                <span className="sz-scene-placa sz-scene-momento">
                  {done === goals.length ? 'Você descobriu!' : 'Sua vez'}
                </span>
                <span className="sz-discovery-count">
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
              <span className="sz-discovery-count">
                {done} de {goals.length} descobertas
              </span>
            </SceneReadoutBand>
          )}
          <ConsoleMundo>{stage}</ConsoleMundo>
          {after && (
            <div className="sz-discovery-evidence" aria-live="polite">
              {after}
            </div>
          )}
        </ConsoleVisual>
        <ConsoleActions>
          <ConsoleFala>
            <Talk text={text} />
          </ConsoleFala>
          <ConsolePrancha>{children}</ConsolePrancha>
          <ol className="sz-discovery-discoveries">
            {goals.map((g, i) => (
              <li key={g} data-done={completed?.[i] ?? i < done}>
                <span>{(completed?.[i] ?? i < done) ? <Check size={16} /> : '○'}</span>
                {completed ? g : i < done ? g : 'Uma descoberta para testar'}
              </li>
            ))}
          </ol>
          {context.tools}
          <SceneButton onClick={reset}>
            <RotateCcw size={15} /> Recomeçar experiência
          </SceneButton>
        </ConsoleActions>
      </SceneConsole>
    </div>
  )
}
