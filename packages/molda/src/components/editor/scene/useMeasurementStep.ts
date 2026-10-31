import { useState } from 'react'
import {
  readSceneMeasurementStep,
  SCENE_MEASUREMENT_STEP_DEFAULT,
  SCENE_MEASUREMENT_STEP_STORAGE,
  type SceneMeasurementStep,
} from '../../../scene/measurementStep'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'

/** The step belongs to the profile, never the scene, undo stack or saved file. */
export function useMeasurementStep() {
  const [key] = useState(() => moldaPreferenceKey(SCENE_MEASUREMENT_STEP_STORAGE))
  const [step, setStep] = useState<SceneMeasurementStep>(() => {
    try {
      return readSceneMeasurementStep(localStorage.getItem(key))
    } catch {
      return SCENE_MEASUREMENT_STEP_DEFAULT
    }
  })
  const change = (next: SceneMeasurementStep) => {
    setStep(next)
    try {
      localStorage.setItem(key, String(next))
    } catch {
      // Sem armazenamento a escolha vale só até fechar a oficina.
    }
  }
  return [step, change] as const
}
