import { PYTHON_ADVANCED_BLOCK_CODECS } from './advancedCatalog'
import { PYTHON_CALL_BLOCK_CODECS, PYTHON_MATH_PI_CODEC } from './callCatalog'
import type { PythonBlockCodec } from './contract'
import { PYTHON_CORE_BLOCK_CODECS } from './coreCatalog'
import { PYTHON_FLOW_BLOCK_CODECS } from './flowCatalog'
import { PYTHON_STRUCTURE_BLOCK_CODECS } from './structureCatalog'

const GENERIC_CALLS = new Set([
  'sz_py_run',
  'sz_py_run_value',
  'sz_py_method',
  'sz_py_method_value',
])
const LAST = new Set(['sz_py_expression'])

/**
 * Catalog order is decoding priority (projection keeps it through its index): specific forms
 * (for _ in range, while True, official APIs) come before the general ones that would also
 * accept the same code (any call, any method, any expression statement).
 */
export const PYTHON_PROGRAMMING_CODECS: readonly PythonBlockCodec[] = Object.freeze([
  ...PYTHON_CORE_BLOCK_CODECS.filter((codec) => !LAST.has(codec.id)),
  ...PYTHON_FLOW_BLOCK_CODECS.filter((codec) => !GENERIC_CALLS.has(codec.id)),
  ...PYTHON_ADVANCED_BLOCK_CODECS,
  ...PYTHON_CALL_BLOCK_CODECS,
  PYTHON_MATH_PI_CODEC,
  ...PYTHON_FLOW_BLOCK_CODECS.filter((codec) => GENERIC_CALLS.has(codec.id)),
  ...PYTHON_STRUCTURE_BLOCK_CODECS,
  ...PYTHON_CORE_BLOCK_CODECS.filter((codec) => LAST.has(codec.id)),
])
export const PYTHON_PROGRAMMING_CODEC_BY_ID: ReadonlyMap<string, PythonBlockCodec> = new Map(
  PYTHON_PROGRAMMING_CODECS.map((codec) => [codec.id, codec]),
)
