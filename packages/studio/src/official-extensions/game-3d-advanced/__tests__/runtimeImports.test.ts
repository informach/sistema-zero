import { describe, expect, it } from 'bun:test'
import { gameKit3DExtension } from '../index'
import { gameKit3DRuntime } from '../runtime'

function importMapResolves(specifier: string, imports: Record<string, string>): boolean {
  return Object.keys(imports).some(
    (key) => key === specifier || (key.endsWith('/') && specifier.startsWith(key)),
  )
}

describe('Jogo 3D Avançado — imports do runtime', () => {
  it('todo import dinâmico do bootstrap é resolvido pelo importmap da extensão', () => {
    const imports = gameKit3DExtension.runtime.esmImports ?? {}
    const dynamicSpecifiers = Array.from(gameKit3DRuntime.matchAll(/import\('([^']+)'\)/g)).flatMap(
      (match) => (match[1] ? [match[1]] : []),
    )

    expect(dynamicSpecifiers).not.toHaveLength(0)
    expect(dynamicSpecifiers.filter((specifier) => !importMapResolves(specifier, imports))).toEqual(
      [],
    )
    expect(imports['three/addons/loaders/HDRLoader.js']).toContain(
      '/examples/jsm/loaders/HDRLoader.js',
    )
  })
})
