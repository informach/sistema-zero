export const PGZERO_EXTENSION = Object.freeze({ id: 'python-pgzero', version: '1.0.0' })
/** Pygame Zero release the module follows; desktop exports pin it with pygame-ce. */
export const PGZERO_UPSTREAM = Object.freeze({ pgzero: '1.2.1', pygameCe: '2.5.8' })
/** Distribution files, relative to the pgzero/ folder next to the worker. */
export const PGZERO_MODULE_FILES = [
  'pgzrun.py',
  'pgzero/__init__.py',
  'pgzero/_colors.py',
  'pgzero/_pgrect.py',
  'pgzero/_sz.py',
  'pgzero/actor.py',
  'pgzero/animation.py',
  'pgzero/builtins.py',
  'pgzero/clock.py',
  'pgzero/constants.py',
  'pgzero/game.py',
  'pgzero/keyboard.py',
  'pgzero/loaders.py',
  'pgzero/music.py',
  'pgzero/rect.py',
  'pgzero/runner.py',
  'pgzero/screen.py',
  'pgzero/spellcheck.py',
  'pgzero/tone.py',
  'pygame/__init__.py',
  'pygame/draw.py',
  'pygame/image.py',
  'pygame/math.py',
  'pygame/mixer.py',
  'freesansbold.ttf',
] as const
export function hasPgzeroExtension(extensions: readonly { id: string; version: string }[]) {
  return extensions.some(
    (entry) => entry.id === PGZERO_EXTENSION.id && entry.version === PGZERO_EXTENSION.version,
  )
}
