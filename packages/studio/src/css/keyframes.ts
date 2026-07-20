const SIMPLE_KEYFRAMES_NAME = /^[A-Za-z_-][\w-]*$/
const RESERVED_KEYFRAMES_NAMES = new Set([
  'none',
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
])

/** Identificador simples que os blocos e o parser estruturado conseguem representar. */
export function isCSSKeyframesName(value: string): boolean {
  const clean = value.trim()
  return SIMPLE_KEYFRAMES_NAME.test(clean) && !RESERVED_KEYFRAMES_NAMES.has(clean.toLowerCase())
}

function isSingleKeyframeSelector(value: string): boolean {
  if (value === 'from' || value === 'to') return true
  const match = /^(\d+(?:\.\d+)?)%$/.exec(value)
  if (!match) return false
  const percentage = Number(match[1])
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
}

/** `from`, `to` ou percentuais de 0% a 100%, inclusive listas separadas por vírgula. */
export function isCSSKeyframeSelector(value: string): boolean {
  const parts = value
    .trim()
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
  return (
    parts.length > 0 && parts.every((part) => part.length > 0 && isSingleKeyframeSelector(part))
  )
}
