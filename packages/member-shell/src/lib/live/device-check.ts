/**
 * O teste do computador lembrado NESTE aparelho (proposta de 23/10/2026): a câmera e o
 * microfone que funcionaram no teste e o fone que a pessoa disse ter separado. É uma
 * conveniência do aparelho (o teste nunca sai do computador), então mora no `localStorage`, com
 * toda leitura e escrita protegidas: aba privada ou armazenamento bloqueado viram "não testado".
 */

const KEY = 'sz:live-device-check'
/** Um teste vale um mês: depois disso o aparelho pode ter mudado (outra câmera, outro fone). */
export const DEVICE_CHECK_VALID_MS = 30 * 24 * 60 * 60_000
export const DEVICE_CHECK_EVENT = 'sz:live-device-check'

export interface DeviceCheck {
  camera: boolean
  microphone: boolean
  headphones: boolean
}

interface Stored {
  camera?: string
  microphone?: string
  headphones?: boolean
}

function read(): Stored {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    return value && typeof value === 'object' ? (value as Stored) : {}
  } catch {
    return {}
  }
}

function write(next: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* Sem armazenamento: o teste vale só nesta visita. */
  }
  window.dispatchEvent(new Event(DEVICE_CHECK_EVENT))
}

const fresh = (at: string | undefined, now: number) =>
  Boolean(at) && now - Date.parse(at!) < DEVICE_CHECK_VALID_MS

export function readDeviceCheck(now = Date.now()): DeviceCheck {
  const stored = read()
  return {
    camera: fresh(stored.camera, now),
    microphone: fresh(stored.microphone, now),
    headphones: stored.headphones === true,
  }
}

export function recordDevicePassed(kind: 'camera' | 'microphone') {
  const stored = read()
  write({ ...stored, [kind]: new Date().toISOString() })
}

export function recordHeadphones(ready: boolean) {
  write({ ...read(), headphones: ready })
}

/** Câmera e microfone testados aqui (o fone é um lembrete, não um teste). */
export const devicesPassed = (check: DeviceCheck) => check.camera && check.microphone
