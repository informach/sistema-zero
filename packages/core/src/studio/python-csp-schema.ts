import { config } from 'zod'

/** Call before schema construction, only inside the dedicated Python runtime realm. */
export function configureStudioPythonCspSchemas() {
  config({ jitless: true })
}
