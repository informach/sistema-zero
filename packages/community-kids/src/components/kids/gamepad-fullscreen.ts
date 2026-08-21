export interface GamepadFullscreenTarget {
  requestFullscreen?: () => Promise<void>
}

/** O documento, na parte que interessa — passado por parâmetro para dar teste sem DOM. */
export interface GamepadFullscreenDocument {
  fullscreenElement?: Element | null
  exitFullscreen?: () => Promise<void>
}

/**
 * Tem ALGUÉM em tela cheia?
 *
 * ⚠️ A pergunta não é "é o MEU elemento": quando é o jogo que toma a tela, quem
 * está em tela cheia é o `<iframe>` — e sair continua sendo a ação certa.
 */
export function isDocumentFullscreen(doc: GamepadFullscreenDocument | null | undefined): boolean {
  return Boolean(doc?.fullscreenElement)
}

/**
 * Volta ao normal.
 *
 * ⭐ Ao contrário de ENTRAR, sair não exige gesto do usuário — então isto sempre
 * funciona a partir do clique, inclusive quando quem tomou a tela foi o jogo.
 */
export async function exitGamepadFullscreen(
  doc: GamepadFullscreenDocument | null | undefined,
): Promise<boolean> {
  if (!doc?.exitFullscreen || !doc.fullscreenElement) return false
  try {
    await doc.exitFullscreen()
    return true
  } catch {
    return false
  }
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
