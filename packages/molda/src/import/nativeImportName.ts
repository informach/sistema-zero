/** Source readers bound names; native node/material/image/clip names use 128 UTF-16 units. */
export function nativeImportName(value: string | null, fallback: string) {
  if (value === null || value === '') return { name: fallback, change: 'name-generated' as const }
  if (value.length <= 128) return { name: value, change: null }
  let end = 128
  // Do not split an authored surrogate pair. No trim or Unicode normalization.
  const last = value.charCodeAt(end - 1),
    next = value.charCodeAt(end)
  if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end--
  return { name: value.slice(0, end), change: 'name-shortened' as const }
}
