import { STUDIO_PYTHON_MATERIAL_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import type { PythonInputGcBucket } from './python-input-gc'
import type { PythonInputBucket } from './python-inputs'

type InputBinding = PythonInputBucket & Pick<PythonInputGcBucket, 'list'>

/** R2 requires a native known-length stream. The neutral store still owns content verification. */
export function createPythonR2InputStorage(bucket: InputBinding): InputBinding {
  return {
    get: (key) => bucket.get(key),
    delete: (keys) => bucket.delete(keys),
    list: (options) => bucket.list(options),
    async put(key, value, options) {
      const { bytes, ...nativeOptions } = options
      if (value instanceof Uint8Array) return bucket.put(key, value, nativeOptions)
      if (
        !Number.isSafeInteger(bytes) ||
        bytes === undefined ||
        bytes < 0 ||
        bytes > STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes
      )
        throw new Error('O tamanho registrado é obrigatório para enviar um stream Python ao R2.')
      const fixed = new FixedLengthStream(bytes)
      const lifetime = new AbortController()
      const piping = value.pipeTo(fixed.writable, { signal: lifetime.signal })
      void piping.catch(() => {})
      try {
        const stored = await bucket.put(key, fixed.readable, nativeOptions)
        if (stored === null) {
          // Conditional writes can refuse the body without consuming it. Retire this
          // pipe; the store verifies the already-stored immutable object's metadata.
          lifetime.abort(new Error('Upload Python já presente no R2.'))
          void fixed.readable.cancel().catch(() => {})
          return null
        }
        await piping
        return stored
      } catch (error) {
        lifetime.abort(error)
        void fixed.readable.cancel(error).catch(() => {})
        throw error
      }
    },
  }
}
