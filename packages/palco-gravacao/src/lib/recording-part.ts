/** Recording plans number parts from one; bad input must not silently record the first part. */
export function recordingPart(value: string | undefined): number | null {
  if (value === undefined) return null
  if (!/^[1-9]\d?$/.test(value)) throw new RangeError('Parte da gravação inválida')
  return Number(value)
}
