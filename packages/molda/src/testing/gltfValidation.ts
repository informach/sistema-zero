import { expect } from 'bun:test'
import { validateBytes } from 'gltf-validator'
import { list, record } from '../scene/validation'

export async function expectValidGlb(bytes: Uint8Array, expectedWarnings: string[] = []) {
  const report = record(
    await validateBytes(bytes, { format: 'glb', maxIssues: 100, writeTimestamp: false }),
    'report',
  )
  const issues = record(report.issues, 'issues')
  const messages = list(issues.messages, 'messages', 100).map((message) =>
    record(message, 'message'),
  )
  expect(messages.filter((message) => message.severity === 0)).toEqual([])
  expect(
    messages.filter((message) => message.severity === 1).map((message) => message.code),
  ).toEqual(expectedWarnings)
  expect(issues.numErrors).toBe(0)
  expect(issues.numWarnings).toBe(expectedWarnings.length)
  return report
}
