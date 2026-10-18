export const TURTLE_EXTENSION = Object.freeze({ id: 'python-turtle', version: '1.0.0' })
export const TURTLE_MODULE_FILES = [
  'turtle.py',
  '_sz_turtle_backend.py',
  '_sz_turtle_colors.py',
  '_sz_turtle_limits.py',
] as const
export function hasTurtleExtension(extensions: readonly { id: string; version: string }[]) {
  return extensions.some(
    (entry) => entry.id === TURTLE_EXTENSION.id && entry.version === TURTLE_EXTENSION.version,
  )
}
