import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameKitPromptContext } from '../ai'
import { gameKitManifest } from '../manifest'
import { gameKitRuntime } from '../runtime'

/**
 * ⭐ A mesma guarda do kit 3D (templateGuard de lá), agora aqui — o gk caiu na
 * crase crua 7 vezes em 4 lotes antes de o irmão ganhar o teste.
 *
 * `runtime.ts`, `ai.ts` e o `docs` do `manifest.ts` são UM template literal
 * cada. Uma crase CRUA lá dentro fecha a string no meio e o módulo inteiro
 * deixa de parsear — e o sintoma cai longe da causa. Além da crase, este clone
 * também pega `${` cru: interpolação dentro do literal avalia no load do
 * módulo e é SEMPRE acidente aqui (o runtime é string pura de JS ES5).
 *
 * A regra: DENTRO do literal, crase só escapada (\\`) e cifrão-chave só
 * escapado (\\$\{). Fora dele (o JSDoc do topo) é markdown normal e pode.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com crase OU `${` NÃO escapados no MIOLO do literal —
 * entre a linha que o abre e a que o fecha. Fora do intervalo é TS normal.
 */
function rawTemplateHazardsInside(src: string, openerNeedle: string): number[] {
  const lines = src.split('\n')
  const opener = lines.findIndex((l) => l.includes(openerNeedle))
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  for (let i = opener + 1; i < lines.length; i++) {
    const line = lines[i] as string
    // O FECHO pretendido é uma linha que só tem a crase (com ou sem vírgula).
    if (line.trim() === '`' || line.trim() === '`,') return out
    for (let c = 0; c < line.length; c++) {
      const escaped = c > 0 && line[c - 1] === '\\'
      if (line[c] === '`' && !escaped) out.push(i + 1) // crase CRUA antes do fecho
      if (line[c] === '$' && line[c + 1] === '{' && !escaped) out.push(i + 1) // interpolação CRUA
    }
  }
  return out
}

describe('Guarda dos template literals do gk (Jogo 2D Avançado)', () => {
  it('runtime.ts: nenhuma crase/interpolação crua no miolo do literal', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameKitRuntime =')).toEqual([])
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameKitPromptContext =')).toEqual([])
  })

  it('manifest.ts: o docs escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'manifest.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'docs: ')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameKitRuntime.length).toBeGreaterThan(1000)
    expect(gameKitPromptContext.length).toBeGreaterThan(500)
    expect(gameKitManifest.docs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    expect(() => new Function('window', 'requestAnimationFrame', gameKitRuntime)).not.toThrow()
  })
})
