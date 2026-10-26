import type { ExecutionMotionSample } from '@sistemazero/core/learning'

/** Only renderer-applied poses are retained. Model values from Python are never sampled here. */
export function createPythonMissionPoseTracker(limit: number) {
  const staged = new Map<number, { x: number; y: number }>()
  let presented = new Map<number, { x: number; y: number }>()
  let turn = 0
  let retired = false
  return {
    stage(id: number, x: number, y: number, visible: boolean) {
      if (
        retired ||
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      )
        throw new Error('A posição gráfica da missão é inválida.')
      if (!visible) {
        staged.delete(id)
        return
      }
      if (!staged.has(id) && staged.size >= limit)
        throw new Error('Muitos objetos gráficos para observar.')
      staged.set(id, { x, y })
    },
    clearStage() {
      staged.clear()
    },
    present() {
      if (!retired && (staged.size || presented.size)) presented = new Map(staged)
    },
    advance() {
      if (!retired) turn++
    },
    read(id: number): ExecutionMotionSample | null {
      const pose = presented.get(id)
      return !retired && turn > 0 && pose
        ? { ...pose, frame: turn, generation: 1, errors: 0, paused: false }
        : null
    },
    retire() {
      retired = true
      staged.clear()
      presented.clear()
    },
  }
}
