export interface PythonRendererFocusOptions {
  /** Background execution retains keyboard ownership in its host. */
  readonly focus?: boolean
}

/** Capture presentation once; drawing and synthetic input never change this policy. */
export function createPythonRendererFocus(options: PythonRendererFocusOptions) {
  const enabled = options.focus !== false
  return (canvas: HTMLElement) => {
    if (enabled) canvas.focus({ preventScroll: true })
  }
}
