import type { StudioPythonActivity } from '@sistemazero/core/studio/python-activity'

/** Streaming stdout matching retains only each pattern's bounded suffix, never the full output. */
export function createPythonActivityConsoleMatcher(activity: StudioPythonActivity) {
  const patterns = activity.checks.flatMap((check) =>
    check.kind === 'behavior' && check.rule.type === 'consoleContains'
      ? [{ id: check.id, text: check.rule.text, tail: '', found: false }]
      : [],
  )
  const decoder = new TextDecoder()
  function append(text: string) {
    for (const pattern of patterns) {
      if (pattern.found) continue
      const candidate = pattern.tail + text
      pattern.found = candidate.includes(pattern.text)
      const retained = pattern.text.length - 1
      pattern.tail = pattern.found || !retained ? '' : candidate.slice(-retained)
    }
  }
  return {
    write(bytes: Uint8Array) {
      if (!patterns.length) return
      for (let offset = 0; offset < bytes.byteLength; offset += 4096)
        append(decoder.decode(bytes.subarray(offset, offset + 4096), { stream: true }))
    },
    matches(id: string) {
      return patterns.find((pattern) => pattern.id === id)?.found === true
    },
  }
}
