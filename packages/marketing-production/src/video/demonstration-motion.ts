import type { DemonstrationRecipeId } from '@sistemazero/marketing-contracts'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
/** Pure frame evaluation: no wall clock, state carried between frames or second playback rate. */
export function demonstrationFrame(recipe: DemonstrationRecipeId, frame: number, duration: number) {
  const progress = duration <= 1 ? 1 : clamp(frame / (duration - 1))
  const context =
    recipe === 'detail-context-v1'
      ? smooth((progress - 0.25) / 0.45)
      : 1 - smooth((progress - 0.1) / 0.2) + smooth((progress - 0.75) / 0.2)
  return { context, activeSource: progress < 0.5 ? 0 : 1 }
}

export function fitDemonstrationImage(
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number,
) {
  const scale = Math.min(boxWidth / width, boxHeight / height)
  return {
    width: width * scale,
    height: height * scale,
    left: (boxWidth - width * scale) / 2,
    top: (boxHeight - height * scale) / 2,
  }
}
