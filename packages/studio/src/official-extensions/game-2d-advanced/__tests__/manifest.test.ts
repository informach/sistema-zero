import { describe, expect, it } from 'bun:test'
import { gameKitManifest } from '../manifest'
import { gameKitRuntime } from '../runtime'

describe('game-2d-advanced — capacidades declaradas', () => {
  it('declara storage quando o runtime usa Web Storage', () => {
    const usesWebStorage = /\b(?:local|session)Storage\b/.test(gameKitRuntime)

    expect(usesWebStorage).toBe(true)
    expect(gameKitManifest.permissions).toContain('storage')
  })

  it('mantém margem para evoluir a documentação dentro do limite do manifest', () => {
    expect(gameKitManifest.docs?.length ?? 0).toBeLessThanOrEqual(48_000)
  })
})
