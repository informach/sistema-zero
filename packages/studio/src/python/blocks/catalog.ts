import { PYTHON_ADVANCED_BLOCK_CODECS } from './advancedCatalog'
import { PYTHON_CALL_BLOCK_CODECS, PYTHON_MATH_PI_CODEC } from './callCatalog'
import type { PythonBlockCodec } from './contract'
import { PYTHON_CORE_BLOCK_CODECS } from './coreCatalog'
import { PYTHON_STRUCTURE_BLOCK_CODECS } from './structureCatalog'

/** Specific APIs precede the general call/attribute codecs. Product activation is a later gate. */
export const PYTHON_PROGRAMMING_CODECS: readonly PythonBlockCodec[] = Object.freeze([
  ...PYTHON_CORE_BLOCK_CODECS,
  ...PYTHON_ADVANCED_BLOCK_CODECS,
  ...PYTHON_CALL_BLOCK_CODECS,
  PYTHON_MATH_PI_CODEC,
  ...PYTHON_STRUCTURE_BLOCK_CODECS,
])
export const PYTHON_PROGRAMMING_CODEC_BY_ID: ReadonlyMap<string, PythonBlockCodec> = new Map(
  PYTHON_PROGRAMMING_CODECS.map((codec) => [codec.id, codec]),
)
