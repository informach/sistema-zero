import { expect, test } from 'bun:test'
import { createBlankProjectSnapshot } from '../core/blankProject'
import { proRegionalEngineCopy } from '../modes/pro/pintaRegionalProRuntime'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { convertClassicToProTree } from '../state/convertToPro'
import { regionalSceneMaterial } from '../testing/pintaRegionalMaterialFixture'
import { buildClassicFileMap } from './fileMap'
import { identityMinifiers } from './minify'

test('o jogo regional baixa com seu motor e converte para Pro mantendo a fonte e a cópia atual da plataforma', async () => {
  const material = await regionalSceneMaterial()
  const project = {
    ...createBlankProjectSnapshot('regional-export', 'Vila'),
    assets: [material],
    installedExtensions: [
      { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 0 },
    ],
  }
  const before = JSON.stringify(project)
  const exported = await buildClassicFileMap(project, identityMinifiers)
  expect(exported.warnings).toEqual([])
  expect(exported.files['public/sz-ext/game-2d.js']).toContain('_pintaRegionFactory')
  expect(exported.files['public/sz-assets.js']).toContain(material.dataUrl)
  const tree = await convertClassicToProTree(project)
  expect(await proRegionalEngineCopy(tree, 'game-2d')).toBe('current')
  expect(tree['public/sz-assets.js']).toBeUndefined()
  expect(JSON.stringify(project)).toBe(before)
  await expect(
    buildClassicFileMap(
      {
        ...project,
        assets: [{ ...material, regional: { ...material.regional, sha256: '0'.repeat(64) } }],
      },
      identityMinifiers,
    ),
  ).rejects.toThrow()
})
