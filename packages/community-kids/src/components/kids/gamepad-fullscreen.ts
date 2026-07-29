export interface GamepadFullscreenTarget {
  requestFullscreen?: () => Promise<void>
}

/**
 * Coloca em tela cheia o console inteiro — moldura, jogo e controles. O alvo é
 * deliberadamente o ancestral comum, pois a Fullscreen API só leva o elemento
 * solicitado e seus descendentes.
 */
export async function requestGamepadFullscreen(
  gamepad: GamepadFullscreenTarget | null,
): Promise<boolean> {
  if (!gamepad?.requestFullscreen) return false
  try {
    await gamepad.requestFullscreen()
    return true
  } catch {
    return false
  }
}
