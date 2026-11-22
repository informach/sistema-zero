import { expect, test } from 'bun:test'
import type { PythonProjectDocument } from '../core/editableProject'
import type { ProAssetManifestEntry } from '../core/proAssets'
import { RAYLIB_3D_EXTENSION } from '../runtime/python/raylib/contract'
import { documentFixture } from '../state/fixtures/projectDocuments'
import { pythonProAssetExample } from './proExamples'

/**
 * O trecho "usar o cenário … no Raylib" do Pro (revisão do lote 7b, 22/11/2026): com regiões, o
 * cenário carrega pela posição do personagem, então o trecho ensina a chamar o atualizar a cada
 * quadro, além de desenhar e descartar.
 */
test('o trecho do cenário no Raylib ensina o atualizar das regiões', () => {
  const base = documentFixture('python', 'pro') as PythonProjectDocument
  const project = {
    ...base,
    installedExtensions: [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }],
    assets: [
      { id: 'c1', name: 'vila', kind: 'scene3d', cena3dPython: { modulo: 'src/cenario_abc.py' } },
    ],
  } as unknown as PythonProjectDocument
  const exemplo = pythonProAssetExample(
    { id: 'c1', name: 'vila' } as ProAssetManifestEntry,
    'src/main.py',
    project,
  )
  expect(exemplo?.code).toContain('lugar.desenhar()')
  expect(exemplo?.code).toContain('lugar.atualizar(x, z)')
})
