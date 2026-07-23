import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { THREE_CDN } from '../../../three/threeRuntimeContract'
import { gameThreeDPromptContext } from '../ai'
import { gameThreeDExtension } from '../index'
import { gameThreeDManifest } from '../manifest'
import { gameThreeDRuntime } from '../runtime'

/**
 * Full review (R4): guarda de template literal do Jogo 3D (clone do g2d/g3k).
 *
 * `runtime.ts`, `ai.ts` e o `docs` do `manifest.ts` são UM template literal cada.
 * Uma crase CRUA lá dentro fecha a string no meio e o módulo inteiro deixa de
 * parsear — e o sintoma cai LONGE da causa. `${` cru é sempre acidente aqui (o
 * runtime é string pura de ES5). A regra: DENTRO do literal, crase só escapada
 * (\\`) e cifrão-chave só escapado (\\$\\{); fora dele (JSDoc) é markdown normal.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com `${` NÃO escapado no MIOLO do literal — entre a linha
 * que o abre e a que o fecha. Fora do intervalo é TS normal.
 */
function rawTemplateHazardsInside(src: string, openerNeedle: string): number[] {
  const declaration = src.indexOf(openerNeedle)
  if (declaration < 0) throw new Error(`não achei a declaração: ${openerNeedle}`)
  const opener = src.indexOf('`', declaration)
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  let line = src.slice(0, opener).split('\n').length
  for (let index = opener + 1; index < src.length; index += 1) {
    const char = src[index]
    if (char === '\n') line += 1
    let backslashes = 0
    for (let cursor = index - 1; cursor >= 0 && src[cursor] === '\\'; cursor -= 1) {
      backslashes += 1
    }
    const escaped = backslashes % 2 === 1
    if (char === '`' && !escaped) return out
    if (char === '$' && src[index + 1] === '{' && !escaped) out.push(line)
  }
  throw new Error(`não achei o fechamento do literal: ${openerNeedle}`)
}

describe('Guarda dos template literals do Jogo 3D', () => {
  it('runtime.ts: o gameThreeDRuntime é UM literal — sem `${` cru no miolo', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameThreeDRuntime =')).toEqual([])
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameThreeDPromptContext =')).toEqual([])
  })

  it('manifest.ts: o docs escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'manifest.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'docs:')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameThreeDRuntime.length).toBeGreaterThan(1000)
    expect(gameThreeDPromptContext.length).toBeGreaterThan(500)
    expect((gameThreeDManifest.docs ?? '').length).toBeGreaterThan(500)
  })

  it('o runtime (sem a linha de import) avalia como corpo de função', () => {
    const body = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')
    expect(() => new Function('THREE', 'window', 'document', body)).not.toThrow()
  })

  it('o import ESM do three usa o pino central (nunca uma URL/versão solta)', () => {
    // O three entra pelo importmap/CSP pinado; a versão vive em threeRuntimeContract.
    expect(gameThreeDExtension.runtime.esmImports?.three).toBe(THREE_CDN)
    expect(THREE_CDN).toContain('three@0.180.0')
  })
})
