import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { gameKit3DRuntime } from '../runtime'

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('arquitetura do runtime do Jogo 3D Avançado', () => {
  it('mantém o ciclo de vida do projeto em um fragmento próprio', () => {
    const runtime = source('../runtime.ts')
    const projectRuntime = source('../runtimeProject.ts')

    expect(runtime).toContain("from './runtimeProject'")
    expect(runtime).not.toContain('function transitionGameState(n)')
    expect(projectRuntime).toContain('function transitionGameState(n)')
    expect(gameKit3DRuntime).toContain('function transitionGameState(n)')
    expect(gameKit3DRuntime).not.toContain('__SZ_GAME_KIT_3D_PROJECT_RUNTIME__')
  })

  it('reutiliza o mesmo decoder de data URL entre os runtimes 3D', () => {
    const modelAssets = source('../runtimeModelAssets.ts')
    const worldRuntime = source('../../world-3d/runtime.ts')
    const sharedAssetRuntime = source('../../assetRuntime.ts')

    expect(modelAssets).toContain("from '../assetRuntime'")
    expect(worldRuntime).toContain("from '../assetRuntime'")
    expect(modelAssets).not.toContain('function dataUrlToBuffer(url)')
    expect(worldRuntime).not.toContain('function dataUrlToBuffer(url)')
    expect(sharedAssetRuntime).toContain('function dataUrlToBuffer(url)')
  })
})
