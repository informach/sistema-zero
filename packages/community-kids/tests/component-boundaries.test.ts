import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_ORCHESTRATOR_LINES = 650

function sourceLines(relativePath: string): number {
  const source = readFileSync(join(import.meta.dir, '..', 'src', relativePath), 'utf8')
  const content = source.trimEnd()
  return content === '' ? 0 : content.split(/\r?\n/).length
}

describe('orquestradores cliente mantêm responsabilidades focadas', () => {
  test.each([
    'app/perfis/perfis-client.tsx',
    'components/kids/kids-space-view-client.tsx',
    'components/kids/room/room-builder.tsx',
  ])('%s permanece abaixo do teto arquitetural', (file) => {
    expect(sourceLines(file)).toBeLessThanOrEqual(MAX_ORCHESTRATOR_LINES)
  })
})
