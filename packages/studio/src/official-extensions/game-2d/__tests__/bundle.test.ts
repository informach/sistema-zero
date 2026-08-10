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
    }
    // Os contratos explícitos de Mapas, Mundos e Fases acrescentaram 22 blocos
    // e tooltips pedagógicos ao catálogo inicial (≈ 8 KiB minificados). Runtime
    // e exemplos continuam fora deste entrypoint; ambos os tamanhos ficam
    // travados logo acima da medição atual para detectar nova regressão.
    expect(metrics.rawBytes).toBeLessThan(189_000)
    expect(metrics.gzipBytes).toBeLessThan(50_500)
    expect(metrics.chunks).toBeGreaterThanOrEqual(5)
    expect(metrics.containsRuntime).toBe(false)
    expect(metrics.containsExample).toBe(false)
  })
})
