export const TURTLE_EXTENSION = Object.freeze({ id: 'python-turtle', version: '1.0.0' })
/** APIs implemented by the current bundled engine, independent of host permissions. */
export const TURTLE_RUNTIME_FEATURES = ['turtle-compound-shapes'] as const
export const TURTLE_MODULE_FILES = [
  'turtle.py',
  '_sz_turtle_backend.py',
  '_sz_turtle_colors.py',
  '_sz_turtle_limits.py',
  // Pinta drawings as compound turtle shapes; plain Python, the desktop gets the same file.
  'formas_do_pinta.py',
] as const
export function hasTurtleExtension(extensions: readonly { id: string; version: string }[]) {
  return extensions.some(
    (entry) => entry.id === TURTLE_EXTENSION.id && entry.version === TURTLE_EXTENSION.version,
  )
}
