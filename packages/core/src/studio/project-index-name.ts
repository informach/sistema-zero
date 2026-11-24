/** The account index has a UTF-16 limit. Keep whole characters and the same
 * trimming rule as the reservation schema, without changing the authored title.
 */
export function studioProjectIndexName(value: string): string {
  let name = ''
  for (const character of value.trim()) {
    if (name.length + character.length > 120) break
    name += character
  }
  return name.trimEnd()
}
