import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

describe('bundle inicial do Jogo 2D', () => {
  it('mantém runtime e exemplos em chunks sob demanda', () => {
    const entrypoint = resolve(import.meta.dir, '../index.ts')
    const probe = spawnSync(
      process.execPath,
      [
        '-e',
        `
          const build = await Bun.build({
            entrypoints: [${JSON.stringify(entrypoint)}],
            target: 'browser',
            minify: true,
            splitting: true,
            write: false,
          })
          if (!build.success) {
            console.error(build.logs.map((log) => log.message).join('\\n'))
            process.exit(1)
          }
          const entry = build.outputs.find((output) => output.kind === 'entry-point')
          if (!entry) throw new Error('build do Jogo 2D sem entry-point')
          const source = await entry.text()
          console.log(JSON.stringify({
            rawBytes: entry.size,
            gzipBytes: Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength,
            chunks: build.outputs.filter((output) => output.kind === 'chunk').length,
            containsRuntime: source.includes('Jogo 2D interativo'),
            containsExample: source.includes('Pegue a moeda'),
            containsFullDocs: source.includes('Receitas que a gente monta com o que já existe'),
          }))
        `,
      ],
      { encoding: 'utf8' },
    )
    expect(probe.status, probe.stderr).toBe(0)

    const metrics = JSON.parse(probe.stdout.trim()) as {
      rawBytes: number
      gzipBytes: number
      chunks: number
      containsRuntime: boolean
      containsExample: boolean
      containsFullDocs: boolean
    }
    // O teto histórico virou uma linha colada à medição. Exigimos 5% de margem
    // real e mantemos os três conteúdos pesados em chunks sob demanda.
    expect(metrics.rawBytes).toBeLessThan(Math.floor(193_300 * 0.95))
    expect(metrics.gzipBytes).toBeLessThan(Math.floor(51_700 * 0.95))
    expect(metrics.chunks).toBeGreaterThanOrEqual(6)
    expect(metrics.containsRuntime).toBe(false)
    expect(metrics.containsExample).toBe(false)
    expect(metrics.containsFullDocs).toBe(false)
  })
})
