import assert from 'node:assert/strict'

export interface RunEvidence {
  result: { ok: boolean; error: string; elapsedMs?: number }
  output: { type: string; text: string }[]
}

export function assertRun(
  evidence: RunEvidence,
  expectedOutput: string[],
  minimumMs = 0,
  expectedStderr?: RegExp,
) {
  assert.equal(evidence.result.ok, true, evidence.result.error)
  assert.deepEqual(
    evidence.output.filter((item) => item.type === 'stdout').map((item) => item.text),
    expectedOutput,
  )
  const stderr = evidence.output
    .filter((item) => item.type === 'stderr')
    .map((item) => item.text)
    .join('\n')
  if (expectedStderr) assert.match(stderr, expectedStderr)
  else
    assert.equal(
      evidence.output.some((item) => item.type === 'stderr'),
      false,
      'Unexpected stderr',
    )
  assert.equal(Number.isFinite(evidence.result.elapsedMs), true, 'Missing execution duration')
  assert.ok((evidence.result.elapsedMs ?? -1) >= minimumMs, 'Synchronous wait returned too early')
}

export function selectNames<T extends string>(
  choices: readonly T[],
  selected: string | undefined,
): readonly T[] {
  if (selected === undefined) return choices
  const match = choices.find((choice) => choice === selected)
  if (!match)
    throw new Error(`Invalid selection ${JSON.stringify(selected)}. Expected ${choices.join(', ')}`)
  return [match]
}

/** Cleanup and source-integrity checks are part of the result, not annotations. */
export function finalizeEvidence(evidence: Record<string, unknown>): void {
  if (['failure', 'cleanupFailure', 'profileFailure'].some((key) => evidence[key] !== undefined)) {
    evidence.qualification = 'failed'
  }
}

export async function deadline<T>(
  operation: Promise<T>,
  milliseconds: number,
  name: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${name} exceeded ${milliseconds}ms`)),
          milliseconds,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
