/** Closed bounds shared by the CPython extractor and the detached evidence reader. */
export const STUDIO_PYTHON_STRUCTURE_LIMITS = Object.freeze({
  nodes: 100_000,
  depth: 512,
  namesPerCategory: 2048,
  names: 4096,
  nameChars: 256,
  callTargetChars: 1024,
  evidenceBytes: 64 * 1024,
})
