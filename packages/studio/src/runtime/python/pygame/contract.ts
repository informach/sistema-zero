export const PYGAME_EXTENSION = Object.freeze({ id: 'python-pygame', version: '1.0.0' })
/** The pygame-ce the browser runs (Pyodide's build); desktop exports pin the same release. */
export const PYGAME_CE_VERSION = '2.5.7'

/** pygame-ce for Pyodide, pinned beside the worker by the distribution (pyodide-lock.json). */
export const PYGAME_CE_WHEEL = Object.freeze({
  file: 'pygame_ce-2.5.7-cp314-cp314-pyemscripten_2026_0_wasm32.whl',
  bytes: 1_528_232,
  sha256: '4113d62cc8dfabb110b6cc0921167ae10ee0cd2c8c5778f9b3c467a92847af8f',
})

/**
 * The platform fonts (OFL; licences in official-extensions/fonts). `pinta.fonte(id, size)` opens
 * them from fontes/ beside pinta.py; a desktop export copies them to fontes/ beside main.py.
 */
export const PYGAME_FONTS = ['bungee', 'press-start-2p', 'nunito', 'fredoka'] as const

/** The host bridge, the learner module and its fonts, relative to the pygame/ folder. */
export const PYGAME_MODULE_FILES = [
  '_szpygame/__init__.py',
  '_szpygame/mixer.py',
  'pinta.py',
  ...PYGAME_FONTS.map((font) => `fontes/${font}.ttf` as const),
] as const

/** Learner-facing modules a desktop export copies beside main.py (the bridge stays behind). */
export const PYGAME_EXPORTED_MODULES = ['pinta.py'] as const

export function hasPygameExtension(extensions: readonly { id: string; version: string }[]) {
  return extensions.some(
    (entry) => entry.id === PYGAME_EXTENSION.id && entry.version === PYGAME_EXTENSION.version,
  )
}
