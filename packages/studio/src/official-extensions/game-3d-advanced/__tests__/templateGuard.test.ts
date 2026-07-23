import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameKit3DPromptContext } from '../ai'
import { gameKit3DManifest } from '../manifest'
import { gameKit3DRuntime } from '../runtime'
import { gameKit3DCameraRuntimeSource } from '../runtimeCamera'
import { gameKit3DPhysicsRuntimeSource } from '../runtimePhysics'

/**
 * ⭐ A guarda que eu devia ter escrito na primeira vez.
 *
 * As fontes em `runtime.ts`, `runtimeCamera.ts`, `runtimePhysics.ts`,
 * `runtimeModelAssets.ts`, `ai.ts` e no `docs` do `manifest.ts` são template
 * literals compostos no build.
 * Uma crase CRUA lá dentro fecha a string no meio e o módulo inteiro deixa de
 * parsear — e o sintoma cai longe da causa (a última vez derrubou o HMR do Vite em
 * cascata: ActivityPanel, StudioCore, BridgeMode… por causa de UM caractere dentro
 * do markdown do docs). Caí nisso SEIS vezes em quatro lotes. Da sétima, o teste
 * pega.
 *
 * A regra: DENTRO do literal, crase só escapada (\\`). Fora dele (o JSDoc do topo
 * do arquivo) crase é markdown normal e pode.
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
    // O FECHO pretendido é uma linha que só tem a crase, opcionalmente seguida
    // pela vírgula antiga ou pelo parêntese do wrapper da fonte local.
    if (/^`[,)]?$/.test(line.trim())) return out
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== '`') continue
      if (c > 0 && line[c - 1] === '\\') continue // escapada: ok
      out.push(i + 1) // crase CRUA antes do fecho = o bug
    }
  }
  return out
}

describe('Guarda dos template literals do kit 3D', () => {
  it('runtime.ts: nenhuma crase crua no miolo do literal', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(rawBackticksInside(src, 'gameKit3DRuntimeBeforeModelSource =')).toEqual([])
    expect(rawBackticksInside(src, 'gameKit3DRuntimeAfterModelSource =')).toEqual([])

    const modelAssets = readFileSync(join(DIR, 'runtimeModelAssets.ts'), 'utf8')
    expect(rawBackticksInside(modelAssets, 'gameKit3DModelAssetsRuntimeSource =')).toEqual([])

    const camera = readFileSync(join(DIR, 'runtimeCamera.ts'), 'utf8')
    expect(rawBackticksInside(camera, 'gameKit3DCameraRuntimeSource =')).toEqual([])

    const physics = readFileSync(join(DIR, 'runtimePhysics.ts'), 'utf8')
    expect(rawBackticksInside(physics, 'gameKit3DPhysicsRuntimeSource =')).toEqual([])
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawBackticksInside(src, 'gameKit3DPromptContext =')).toEqual([])
  })

  it('manifest.ts: o docs escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'manifest.ts'), 'utf8')
    expect(rawBackticksInside(src, 'docs: ')).toEqual([])
  })

  it('os módulos avaliam e entregam strings não-vazias (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameKit3DRuntime.length).toBeGreaterThan(1000)
    expect(gameKit3DCameraRuntimeSource.length).toBeGreaterThan(1000)
    expect(gameKit3DPhysicsRuntimeSource.length).toBeGreaterThan(1000)
    expect(gameKit3DPromptContext.length).toBeGreaterThan(500)
    expect(gameKit3DManifest.docs.length).toBeGreaterThan(500)
    expect(gameKit3DRuntime).not.toContain('__SZ_GAME_KIT_3D_CAMERA_RUNTIME__')
    expect(gameKit3DRuntime).not.toContain('__SZ_GAME_KIT_3D_PHYSICS_RUNTIME__')
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    const body = gameKit3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
    expect(() => new Function('THREE', 'window', body)).not.toThrow()
  })
})
