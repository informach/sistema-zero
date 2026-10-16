import { getMoldaStorageNamespace } from './persistence'

/** Same profile/host scope as local creations; never part of a scene or its undo history. */
export function moldaPreferenceKey(name: string) {
  return `molda:preferences:${JSON.stringify([getMoldaStorageNamespace(), name])}`
}
