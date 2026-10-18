/** Small worker-safe contract. Deployment verification and persistence stay in the trusted host. */
export const PYTHON_BOOT_RESOURCE_NAMES = [
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
] as const
export type PythonBootResourceName = (typeof PYTHON_BOOT_RESOURCE_NAMES)[number]
export const PYTHON_BOOT_RESOURCE_MIME = {
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
} as const
export const PYTHON_BOOT_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  requests: 3,
  deadlineMs: 30000,
} as const
export function isPythonBootResourceName(value: unknown): value is PythonBootResourceName {
  return typeof value === 'string' && PYTHON_BOOT_RESOURCE_NAMES.some((name) => name === value)
}
