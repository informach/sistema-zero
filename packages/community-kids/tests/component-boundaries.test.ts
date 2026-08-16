import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ORCHESTRATOR_LIMITS = {
  'app/perfis/perfis-client.tsx': 600,
  'components/kids/kids-space-view-client.tsx': 625,
  'components/kids/room/room-builder.tsx': 510,
} as const

function sourceLines(relativePath: string): number {
  const source = readFileSync(join(import.meta.dir, '..', 'src', relativePath), 'utf8')
  const content = source.trimEnd()
  return content === '' ? 0 : content.split(/\r?\n/).length
}

describe('orquestradores cliente mantêm responsabilidades focadas', () => {
  test.each(
    Object.entries(ORCHESTRATOR_LIMITS),
  )('%s permanece abaixo de %i linhas', (file, max) => {
    expect(sourceLines(file)).toBeLessThanOrEqual(max)
  })
})
