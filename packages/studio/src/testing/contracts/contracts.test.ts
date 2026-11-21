import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readPintaScene } from '@sistemazero/core/studio/pinta-scene'
import { type ProjectAsset, sanitizeProjectAssets } from '../../core/projectAssets'
import { ProjectDocumentError } from '../../core/projectDocument'
import { assertProjectContentPreserved } from '../../core/projectDocumentGuards'
import { isValidScene3DDataUrl } from '../../core/scene3d/assets'

/**
 * Contratos que o Estúdio lê do Pinta e do Molda Cenários, com as fixtures CONGELADAS de cada
 * versão (`scripts/freeze-contract-fixtures.ts`, saídas dos produtores reais; nunca regeradas).
 *
 * Regra decidida pela dona em 21/11/2026: campo ou versão que esta versão do Estúdio não conhece é
 * RECUSADO sem perder nada. O projeto não abre (a trava `assertProjectContentPreserved`) e nada é
 * regravado; os contratos estritos das outras frentes não mudam.
 */

const PASTA = import.meta.dir
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(PASTA, `${name}.json`), 'utf8'))
}

function drawingWithScene(scene: unknown): ProjectAsset {
  return {
    id: 'cenario',
    name: 'cenario',
    kind: 'image',
    source: 'upload',
    dataUrl: PNG_1X1,
    scene,
  } as ProjectAsset
}

/** Abre os materiais como o Estúdio abre: limpar e exigir que nada do disco tenha sumido. */
function open(assets: unknown[]): ProjectAsset[] {
  const sanitized = sanitizeProjectAssets(assets)
  assertProjectContentPreserved({ assets }, { assets: sanitized })
  return sanitized
}

describe('cena do Pinta: cada versão congelada abre e volta igual', () => {
  for (const version of [1, 2, 3]) {
    test(`versão ${version}`, () => {
      const scene = fixture(`pinta-scene-v${version}`) as { version: number }
      expect(scene.version).toBe(version)
      expect(readPintaScene(scene)).toEqual(scene as never)
      const [opened] = open([drawingWithScene(scene)])
      expect(opened?.scene).toEqual(scene as never)
    })
  }
})

describe('cena do Pinta: o que esta versão não conhece é recusado sem perda', () => {
  test('campo desconhecido', () => {
    const scene = { ...(fixture('pinta-scene-v3') as object), campoDoFuturo: true }
    expect(readPintaScene(scene)).toBeNull()
    expect(() => open([drawingWithScene(scene)])).toThrow(ProjectDocumentError)
  })

  test('versão desconhecida', () => {
    const scene = { ...(fixture('pinta-scene-v3') as object), version: 99 }
    expect(readPintaScene(scene)).toBeNull()
    expect(() => open([drawingWithScene(scene)])).toThrow(ProjectDocumentError)
  })
})

function sceneEnvelope(assets: ProjectAsset[]): ProjectAsset {
  const scene = assets.find((asset) => asset.kind === 'scene3d')
  if (!scene) throw new Error('A fixture do Molda não tem o material scene3d.')
  return scene
}

function rewriteEnvelope(dataUrl: string, change: (envelope: Record<string, unknown>) => void) {
  const comma = dataUrl.indexOf(',')
  const envelope = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(dataUrl.slice(comma + 1)), (c) => c.charCodeAt(0)),
    ),
  ) as Record<string, unknown>
  change(envelope)
  const bytes = new TextEncoder().encode(JSON.stringify(envelope))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `${dataUrl.slice(0, comma + 1)}${btoa(binary)}`
}

describe('cenário do Molda Cenários (studio-cena3d v1)', () => {
  test('a versão congelada abre inteira, com a cena e os arquivos dela', () => {
    const assets = fixture('molda-scene3d-v1') as ProjectAsset[]
    const scene = sceneEnvelope(assets)
    expect(isValidScene3DDataUrl(scene.dataUrl, 'scene3d', scene.originalFileName)).toBe(true)
    expect(open(assets)).toEqual(assets)
  })

  test('campo desconhecido no envelope é recusado sem perda', () => {
    const assets = fixture('molda-scene3d-v1') as ProjectAsset[]
    const scene = sceneEnvelope(assets)
    const changed = rewriteEnvelope(scene.dataUrl, (envelope) => {
      envelope.campoDoFuturo = true
    })
    expect(isValidScene3DDataUrl(changed, 'scene3d', scene.originalFileName)).toBe(false)
    const withChange = assets.map((asset) =>
      asset === scene ? { ...asset, dataUrl: changed } : asset,
    )
    expect(() => open(withChange)).toThrow(ProjectDocumentError)
  })
})
