export type GamepadVisibilityOverride = boolean | null

export function resolveGamepadVisibility(
  automaticVisibility: boolean,
  override: GamepadVisibilityOverride,
): boolean {
  return override ?? automaticVisibility
}

export function toggledGamepadOverride(currentVisibility: boolean): boolean {
  return !currentVisibility
}
