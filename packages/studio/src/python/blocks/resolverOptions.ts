import type { PythonBlockCodec, PythonBlockShape, PythonDecodeContext } from './contract'
import type { PythonResolverOptions } from './scope'

/** Public names of stdlib modules whose `from module import *` the blocks understand. */
const STDLIB_STAR_EXPORTS: ReadonlyMap<string, readonly string[]> = new Map([
  [
    'math',
    [
      'pi',
      'e',
      'tau',
      'inf',
      'nan',
      'sqrt',
      'floor',
      'ceil',
      'sin',
      'cos',
      'tan',
      'asin',
      'acos',
      'atan',
      'atan2',
      'hypot',
      'radians',
      'degrees',
      'fabs',
      'pow',
      'exp',
      'log',
      'log10',
      'log2',
      'copysign',
      'trunc',
      'isclose',
      'dist',
      'gcd',
      'factorial',
      'isqrt',
    ],
  ],
  [
    'random',
    [
      'random',
      'randint',
      'randrange',
      'choice',
      'choices',
      'shuffle',
      'sample',
      'uniform',
      'seed',
      'gauss',
    ],
  ],
])

const attached = new WeakMap<readonly PythonBlockCodec[], PythonResolverOptions>()

/** Extensions loaded with a codec list declare the names they provide (built-ins, star exports). */
export function attachPythonResolverOptions(
  codecs: readonly PythonBlockCodec[],
  options: PythonResolverOptions,
) {
  attached.set(codecs, options)
  return codecs
}
export function pythonResolverOptionsOf(
  codecs: readonly PythonBlockCodec[],
): PythonResolverOptions {
  const own = attached.get(codecs)
  const starExports = new Map(STDLIB_STAR_EXPORTS)
  for (const [module, names] of own?.starExports ?? []) starExports.set(module, names)
  return { builtins: own?.builtins ?? new Map(), starExports }
}

/** Saved block layouts remember whether a Name receiver was the module or an object. */
export function pythonDecodeContextFromExtra(
  extra: PythonBlockShape['extra'],
): PythonDecodeContext {
  return {
    isModule: (nameNode) =>
      extra?.style === 'module' &&
      typeof extra.root === 'string' &&
      nameNode.fields.id === extra.root,
  }
}
