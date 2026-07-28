import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const lineCount = (file: string) => readFileSync(file, 'utf8').split('\n').length

describe('gk — limites arquiteturais dos catálogos e do runtime', () => {
  it('mantém os três pontos de entrada como composição de módulos menores', () => {
    expect(lineCount(join(ROOT, 'runtime.ts'))).toBeLessThan(6_000)
    expect(lineCount(join(ROOT, 'blocks.ts'))).toBeLessThan(1_300)
    expect(lineCount(join(ROOT, 'examples.ts'))).toBeLessThan(100)
  })

  it('mantém cada catálogo extraído pequeno o bastante para revisão isolada', () => {
    const blockModules = readdirSync(join(ROOT, 'blocks')).filter((file) => file.endsWith('.ts'))
    const exampleModules = readdirSync(join(ROOT, 'examples')).filter((file) =>
      file.endsWith('.ts'),
    )
    const runtimeModules = readdirSync(join(ROOT, 'runtime')).filter((file) => file.endsWith('.ts'))

    expect(blockModules.length).toBeGreaterThanOrEqual(7)
    expect(exampleModules.length).toBeGreaterThanOrEqual(20)
    expect(runtimeModules).toContain('monsterBattle.ts')
    expect(runtimeModules).toContain('animation.ts')
    expect(runtimeModules).toContain('cards.ts')
    expect(runtimeModules).toContain('platformer.ts')
    expect(runtimeModules).toContain('visualEffects.ts')
    // Catálogos de LÓGICA (blocos/runtime) ficam pequenos p/ revisão isolada.
    for (const file of blockModules) {
      expect(lineCount(join(ROOT, 'blocks', file))).toBeLessThan(1_200)
    }
    for (const file of runtimeModules) {
      expect(lineCount(join(ROOT, 'runtime', file))).toBeLessThan(1_200)
    }
    // Exemplos são DADOS (a IR completa de um jogo "Profissional" — Mundo Pirata,
    // Fazenda Feliz, Herói que Evolui, Safári — é longa por natureza); teto mais
    // generoso, mas ainda um jogo por arquivo.
    for (const file of exampleModules) {
      expect(lineCount(join(ROOT, 'examples', file))).toBeLessThan(2_600)
    }
  })
})
