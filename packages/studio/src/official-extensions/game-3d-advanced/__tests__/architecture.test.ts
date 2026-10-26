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

  it('os três runtimes 3D usam o MESMO carregador de modelos (decoder, GLTFLoader e HDR)', () => {
    const shared = source('../../three3dModelsRuntime.ts')
    expect(shared).toContain("from './assetRuntime'")
    expect(shared).toContain('GLTFLoader().parse')
    expect(source('../../assetRuntime.ts')).toContain('function dataUrlToBuffer(url)')
    const fragments: Record<string, string[]> = {
      'game-3d': ['runtime.ts', 'runtimeModelAssets.ts'],
      'game-3d-advanced': ['runtime.ts', 'runtimeModelAssets.ts'],
      'world-3d': ['runtime.ts'],
    }
    for (const [dir, files] of Object.entries(fragments)) {
      expect(source(`../../${dir}/runtime.ts`)).toContain("from '../three3dModelsRuntime'")
      for (const file of files) {
        const text = source(`../../${dir}/${file}`)
        expect(text).not.toContain('GLTFLoader().parse')
        expect(text).not.toContain('HDRLoader().parse')
        expect(text).not.toContain('function dataUrlToBuffer')
        expect(text).not.toContain("from '../assetRuntime'")
      }
    }
  })
})
