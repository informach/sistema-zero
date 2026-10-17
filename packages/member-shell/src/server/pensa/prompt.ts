import { PensaUnavailable } from './errors'

export function pensaBytes(value: unknown): number {
  return new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value))
    .byteLength
}

/** Canonical decisions are never clipped to fit a provider request. */
export function pensaPrompt(system: string, data: unknown, maxBytes: number): string {
  const prompt = JSON.stringify(data)
  if (pensaBytes(system) + pensaBytes(prompt) > maxBytes)
    throw new PensaUnavailable(
      'Esta parte ficou grande para organizar de uma vez. Sua ideia está guardada. Vamos organizar em partes menores.',
      'PLANNING_CAPACITY_EXCEEDED',
      422,
    )
  return prompt
}

export interface PensaPromptPartitionLimits {
  maxItems: number
  contextBytes: number
  outputTokens: number
}

/** Size admission uses the complete data of each proposed group, including cross references. */
export function partitionPensaWork<T>(
  items: readonly T[],
  system: string,
  dataFor: (group: readonly T[]) => unknown,
  outputTokensFor: (group: readonly T[]) => number,
  limits: PensaPromptPartitionLimits,
): T[][] {
  const partitions: T[][] = []
  let group: T[] = []
  const fits = (candidate: T[]) =>
    candidate.length <= limits.maxItems &&
    pensaBytes(system) + pensaBytes(dataFor(candidate)) <= limits.contextBytes &&
    outputTokensFor(candidate) <= limits.outputTokens
  for (const item of items) {
    const candidate = [...group, item]
    if (fits(candidate)) {
      group = candidate
      continue
    }
    if (group.length) partitions.push(group)
    group = [item]
    if (!fits(group))
      throw new PensaUnavailable(
        'Uma parte do jogo precisa ser organizada em resultados menores. Sua ideia continua guardada.',
        'PLANNING_CAPACITY_EXCEEDED',
        422,
      )
  }
  if (group.length) partitions.push(group)
  return partitions
}
