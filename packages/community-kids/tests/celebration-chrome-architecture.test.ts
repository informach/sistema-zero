import { describe, expect, test } from 'bun:test'

const layoutSource = await Bun.file(new URL('../src/app/(app)/layout.tsx', import.meta.url)).text()

describe('chrome global de comemoração', () => {
  test('não carrega a união completa de blocos em toda navegação', () => {
    expect(layoutSource).not.toContain('getStudioUnlocksReadonly')
    expect(layoutSource).not.toContain('drawersForBlocks')
  })

  test('passa somente o sinal leve e o estado explícito de acesso ao watcher', () => {
    expect(layoutSource).toContain('toolsRevision=')
    expect(layoutSource).toContain('ownsStudio=')
  })
})
