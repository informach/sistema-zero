/**
 * Erros de câmera, microfone e compartilhamento na língua da criança, com o próximo passo. O
 * navegador devolve `DOMException` em inglês ("Permission denied", "Could not start video
 * source") e isso chegava cru à tela (full review de 14/10/2026). Mensagens que já são nossas
 * (em português) passam como vieram.
 */
export type LiveDeviceKind = 'microphone' | 'camera' | 'screen' | 'demo' | 'any'

const NAMES: Record<LiveDeviceKind, string> = {
  microphone: 'o microfone',
  camera: 'a câmera',
  screen: 'o compartilhamento da aba',
  demo: 'o compartilhamento da aba',
  any: 'a câmera ou o microfone',
}

const IN_USE: Record<LiveDeviceKind, string> = {
  microphone: 'O microfone está sendo usado por outro programa.',
  camera: 'A câmera está sendo usada por outro programa.',
  screen: 'A tela está sendo usada por outro programa.',
  demo: 'A tela está sendo usada por outro programa.',
  any: 'A câmera ou o microfone está sendo usado por outro programa.',
}

export function friendlyDeviceError(cause: unknown, kind: LiveDeviceKind = 'any'): string {
  const name = NAMES[kind]
  if (cause instanceof TypeError)
    return kind === 'screen' || kind === 'demo'
      ? 'Este navegador não consegue compartilhar a tela. Use o Chrome ou o Edge num computador.'
      : `Este navegador não conseguiu abrir ${name}. Use o Chrome ou o Edge atualizado.`
  if (cause instanceof DOMException) {
    switch (cause.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return kind === 'screen' || kind === 'demo'
          ? 'Nenhuma aba foi escolhida. Quando quiser, aperte de novo e escolha a aba do Sistema Zero.'
          : `O navegador bloqueou ${name}. Clique no cadeado ao lado do endereço do site, permita e tente de novo.`
      case 'NotFoundError':
      case 'OverconstrainedError':
        return kind === 'microphone'
          ? 'Não encontramos um microfone neste computador. Confira se ele está ligado.'
          : kind === 'camera'
            ? 'Não encontramos uma câmera neste computador. Confira se ela está ligada.'
            : `Não encontramos ${name} neste computador.`
      case 'NotReadableError':
      case 'AbortError':
        return `${IN_USE[kind]} Feche o outro programa e tente de novo.`
    }
    // Outra recusa do navegador: a mensagem dele vem em inglês, então não vai para a tela.
    return `Não foi possível ligar ${name}. Tente de novo.`
  }
  // As nossas mensagens (servidor e transporte da sala) já estão em português.
  if (cause instanceof Error && cause.message) return cause.message
  return `Não foi possível ligar ${name}. Tente de novo.`
}

/** Este navegador consegue mostrar a aba à professora com a verificação segura da aba? */
export function canShareLiveTab(): boolean {
  if (typeof navigator === 'undefined') return false
  const devices = navigator.mediaDevices as
    | (MediaDevices & { setCaptureHandleConfig?: unknown })
    | undefined
  return (
    typeof devices?.getDisplayMedia === 'function' &&
    typeof devices?.setCaptureHandleConfig === 'function'
  )
}
