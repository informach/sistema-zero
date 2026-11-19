import { gzipSync } from 'node:zlib'
import { mapTwoDBootstrap } from '../src/official-extensions/map-2d/bootstrap'

const results = []
for (const target of ['g2d', 'gk'] as const) {
  for (const scene of [false, true]) {
    const source = await mapTwoDBootstrap(target, {
      code: scene ? 'SZGame2D.createMapScene("mapa","mapa");' : 'SZGame2D.clear();',
    })
    const compilation: number[] = []
    for (let i = 0; i < 20; i++) {
      const begin = performance.now()
      new Function(source)
      compilation.push(performance.now() - begin)
    }
    compilation.sort((a, b) => a - b)
    results.push({
      target,
      scene,
      chars: source.length,
      utf8: Buffer.byteLength(source),
      gzip: gzipSync(source).length,
      compileMs: { median: compilation[10], p95: compilation[18], max: compilation[19] },
    })
  }
}
console.log(JSON.stringify({ bun: Bun.version, platform: process.platform, results }, null, 2))
