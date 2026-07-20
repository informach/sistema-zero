import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameTwoDPromptContext } from '../ai'
import { gameTwoDManifest } from '../manifest'
import { gameTwoDRuntime } from '../runtime'

/**
 * Clone da guarda de template do gk (Jogo 2D Avançado): o `runtime.ts`, o `ai.ts`
 * e o `docs` do `manifest.ts` são UM template literal cada. Uma crase CRUA lá
 * dentro fecha a string no meio e o módulo inteiro deixa de parsear — e o sintoma
 * cai LONGE da causa. Além da crase, também pega `${` cru: interpolação dentro do
 * literal avalia no load e é SEMPRE acidente aqui (o runtime é string pura de ES5).
 *
 * A regra: DENTRO do literal, crase só escapada (\\`) e cifrão-chave só escapado
 * (\\$\{). Fora dele (o JSDoc do topo) é markdown normal e pode.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com crase OU `${` NÃO escapados no MIOLO do literal — entre
 * a linha que o abre e a que o fecha. Fora do intervalo é TS normal.
 */
/**
 * O FECHO é uma linha que TERMINA numa crase não-escapada (com ou sem vírgula):
 * cobre tanto o estilo `,`/`` ` `` sozinho na linha (ai.ts, manifest.docs) quanto
 * o `})();` do IIFE do runtime, que fecha o literal na MESMA linha. Como todo o
 * miolo do template tem as crases escapadas (é o que este teste garante), a 1ª
 * linha que termina em crase crua é, necessariamente, o fecho pretendido.
 */
function isCloserLine(line: string): boolean {
  const t = line.replace(/,\s*$/, '').replace(/\s+$/, '')
  if (!t.endsWith('`')) return false
  let backslashes = 0
  for (let k = t.length - 2; k >= 0 && t[k] === '\\'; k--) backslashes++
  return backslashes % 2 === 0
}

function rawTemplateHazardsInside(src: string, openerNeedle: string): number[] {
  const lines = src.split('\n')
  const opener = lines.findIndex((l) => l.includes(openerNeedle))
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  for (let i = opener + 1; i < lines.length; i++) {
    const line = lines[i] as string
    if (isCloserLine(line)) return out
    for (let c = 0; c < line.length; c++) {
      const escaped = c > 0 && line[c - 1] === '\\'
      if (line[c] === '`' && !escaped) out.push(i + 1) // crase CRUA antes do fecho
      if (line[c] === '$' && line[c + 1] === '{' && !escaped) out.push(i + 1) // interpolação CRUA
    }
  }
  return out
}

function composedTemplateHazards(
  src: string,
  openerNeedle: string,
  expectedBoundaries: number,
): { interpolations: number[]; boundaryCount: number } {
  const start = src.indexOf(openerNeedle)
  if (start < 0) throw new Error(`não achei a composição: ${openerNeedle}`)
  const content = src.slice(start)
  const interpolations: number[] = []
  let inTemplate = false
  let boundaryCount = 0
  let line = src.slice(0, start).split('\n').length
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (char === '\n') line += 1
    let slashes = 0
    for (let cursor = index - 1; cursor >= 0 && content[cursor] === '\\'; cursor -= 1) {
      slashes += 1
    }
    const escaped = slashes % 2 === 1
    if (char === '`' && !escaped) {
      inTemplate = !inTemplate
      boundaryCount += 1
    } else if (inTemplate && char === '$' && content[index + 1] === '{' && !escaped) {
      interpolations.push(line)
    }
  }
  expect(boundaryCount).toBe(expectedBoundaries)
  return { interpolations, boundaryCount }
}

describe('Guarda dos template literals do Jogo 2D', () => {
  it('runtime composto: limites esperados e nenhuma interpolação acidental', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(composedTemplateHazards(src, 'gameTwoDRuntime =', 4).interpolations).toEqual([])
    for (const [file, declaration] of [
      ['runtime/arcadeKits.ts', 'gameTwoDArcadeKitsRuntime ='],
      ['runtime/audio.ts', 'gameTwoDAudioRuntime ='],
      ['runtime/casualKits.ts', 'gameTwoDCasualKitsRuntime ='],
      ['runtime/inputAndMotion.ts', 'gameTwoDInputAndMotionRuntime ='],
      ['runtime/lifecycle.ts', 'gameTwoDLifecycleRuntime ='],
      ['runtime/physics.ts', 'gameTwoDPhysicsRuntime ='],
      ['runtime/sprites.ts', 'gameTwoDSpritesRuntime ='],
      ['runtime/stage.ts', 'gameTwoDStageRuntime ='],
      ['runtime/utilities.ts', 'gameTwoDUtilitiesRuntime ='],
      ['runtime/world.ts', 'gameTwoDWorldRuntime ='],
    ] as const) {
      const fragment = readFileSync(join(DIR, file), 'utf8')
      expect(composedTemplateHazards(fragment, declaration, 2).interpolations).toEqual([])
    }
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameTwoDPromptContext =')).toEqual([])
  })

  it('manifest.ts: o docs escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'manifest.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'docs: ')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameTwoDRuntime.length).toBeGreaterThan(1000)
    expect(gameTwoDPromptContext.length).toBeGreaterThan(500)
    expect(gameTwoDManifest.docs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    expect(() => new Function('window', 'requestAnimationFrame', gameTwoDRuntime)).not.toThrow()
  })
})
