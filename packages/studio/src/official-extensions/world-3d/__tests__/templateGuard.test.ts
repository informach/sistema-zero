import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { world3DPromptContext } from '../ai'
import { world3DManifest } from '../manifest'
import { world3DRuntime } from '../runtime'

/**
 * A guarda anti-crase (herdada do Jogo 3D Avançado, que caiu nesse buraco SEIS
 * vezes): `runtime.ts`, `ai.ts` e o `docs` do `manifest.ts` são UM template
 * literal cada — uma crase CRUA lá dentro fecha a string no meio e o módulo
 * inteiro deixa de parsear, com o sintoma caindo longe da causa.
 *
 * A regra: DENTRO do literal, crase só escapada (\\`). Fora dele (o JSDoc do
 * topo do arquivo) crase é markdown normal e pode.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com crase NÃO escapada no MIOLO do literal — entre a linha
 * que o abre e a que o fecha. Fora desse intervalo é comentário de TS, não string.
 */
function rawBackticksInside(src: string, openerNeedle: string): number[] {
  const lines = src.split('\n')
  const opener = lines.findIndex((l) => l.includes(openerNeedle))
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  for (let i = opener + 1; i < lines.length; i++) {
    const line = lines[i] as string
    // O FECHO pretendido é uma linha que só tem a crase (com ou sem vírgula).
    if (line.trim() === '`' || line.trim() === '`,') return out
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== '`') continue
      if (c > 0 && line[c - 1] === '\\') continue // escapada: ok
      out.push(i + 1) // crase CRUA antes do fecho = o bug
    }
  }
  return out
}

/** `${` cru dentro do literal interpola em silêncio — igualmente proibido. */
function rawInterpolationsInside(src: string, openerNeedle: string): number[] {
  const lines = src.split('\n')
  const opener = lines.findIndex((l) => l.includes(openerNeedle))
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  for (let i = opener + 1; i < lines.length; i++) {
    const line = lines[i] as string
    if (line.trim() === '`' || line.trim() === '`,') return out
    for (let c = 0; c + 1 < line.length; c++) {
      if (line[c] !== '$' || line[c + 1] !== '{') continue
      if (c > 0 && line[c - 1] === '\\') continue
      out.push(i + 1)
    }
  }
  return out
}

describe('Guarda dos template literals do Mundo 3D', () => {
  it('runtime.ts: nenhuma crase crua no miolo do literal', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(rawBackticksInside(src, 'world3DRuntime =')).toEqual([])
  })

  it('runtime.ts: nenhuma interpolação ${ crua (interpola em silêncio)', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(rawInterpolationsInside(src, 'world3DRuntime =')).toEqual([])
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawBackticksInside(src, 'world3DPromptContext =')).toEqual([])
  })

  it('manifest.ts: o docs escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'manifest.ts'), 'utf8')
    expect(rawBackticksInside(src, 'docs: ')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    expect(world3DRuntime.length).toBeGreaterThan(1000)
    expect(world3DPromptContext.length).toBeGreaterThan(500)
    expect(world3DManifest.docs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    const body = world3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
    expect(() => new Function('THREE', 'window', body)).not.toThrow()
  })
})
