'use client'

import {
  type SceneCast,
  type SceneCenarioId,
  type SceneId,
  sceneCenario,
} from '@sistemazero/core/learning/scene'
import { createContext, type ReactNode, useContext } from 'react'

const CenarioDaAula = createContext<SceneCenarioId | undefined>(undefined)

export function SceneCenarioProvider({
  cenario,
  children,
}: {
  cenario?: SceneCenarioId
  children: ReactNode
}) {
  return <CenarioDaAula.Provider value={cenario}>{children}</CenarioDaAula.Provider>
}

/** O cenário declarado pela aula prevalece sobre a inferência pelo elenco. */
export function useSceneCenario(cast: SceneCast | undefined, scene: SceneId): SceneCenarioId {
  return sceneCenario(cast, scene, useContext(CenarioDaAula))
}
