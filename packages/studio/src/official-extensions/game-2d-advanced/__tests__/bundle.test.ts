import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

/**
 * O que entra no chunk de ENTRADA da extensão — o pedaço que todo mundo baixa só
 * por abrir a lista de extensões, mesmo sem instalar nada.
 *
 * A gk não tinha este orçamento (o irmão do g2d tinha), e por isso o manual
 * inteiro viajava eager: 48 mil caracteres de `docs.ts` importados pelo
 * `manifest.ts`. Migrar para o provider preguiçoso do `index.ts` tirou
 * **50.431 bytes crus (−21%) e 20.584 gzipados (−31%)**.
 *
 * ⚠️ Prazo PRÓPRIO, como o do irmão: este caso empacota a extensão inteira num
 * processo filho. Sozinho fecha em segundos; dentro do `bun test src`, disputando
 * CPU com os outros 480 arquivos, o padrão de 5 s estoura — e o sintoma é o pior
 * possível: VERDE rodado sozinho e vermelho na suíte, com cara de regressão de
 * orçamento quando era só relógio.
 */
const PRAZO_DO_BUILD_MS = 120_000

describe('bundle inicial do Jogo 2D Avançado', () => {
  it(
    'mantém runtime, exemplos e manual em chunks sob demanda',
    () => {
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
          if (!entry) throw new Error('build do Jogo 2D Avançado sem entry-point')
          const source = await entry.text()
          console.log(JSON.stringify({
            rawBytes: entry.size,
            gzipBytes: Bun.gzipSync(new Uint8Array(await entry.arrayBuffer())).byteLength,
            chunks: build.outputs.filter((output) => output.kind === 'chunk').length,
            containsRuntime: source.includes('não existe — crie com'),
            containsExample: source.includes('encontre oito gemas'),
            containsFullDocs: source.includes('Começando (a receita)'),
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
      const evidencia = JSON.stringify(metrics)
      // Medido 186.253 / 45.941 depois da migração do manual. A folga é de ~2%,
      // apertada de propósito: teto largo é teto que não cobra, e o do irmão
      // envelheceu justamente assim (mede 152k contra um teto de 183k).
      expect(metrics.rawBytes, evidencia).toBeLessThan(190_000)
      expect(metrics.gzipBytes, evidencia).toBeLessThan(47_000)
      expect(metrics.chunks, evidencia).toBeGreaterThanOrEqual(6)
      // ⚠️ Os três marcadores são EXCLUSIVOS do módulo que vigiam, e isso foi
      // conferido: `window.SZGameKit` NÃO serve para o runtime (o `aiSummary`,
      // que é eager, também o cita) e `Reino Zero Pro` NÃO serve para o exemplo
      // (aparece no mesmo `aiSummary`). Os dois dariam vermelho de nascença, pelo
      // motivo errado.
      expect(metrics.containsRuntime, evidencia).toBe(false)
      expect(metrics.containsExample, evidencia).toBe(false)
      expect(metrics.containsFullDocs, evidencia).toBe(false)
    },
    PRAZO_DO_BUILD_MS,
  )
})
