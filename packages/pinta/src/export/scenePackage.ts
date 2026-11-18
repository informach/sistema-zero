import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { mapTwoDSource } from '@sistemazero/core/studio/pinta-scene-player'
import { sceneObjects } from '@sistemazero/core/studio/pinta-scene-runtime'
import type { PintaAsset, TilemapAsset } from '../core/project'
import { assetBundleToJson } from './assetJson'
import { dataUrlToBlob } from './png'
import { galleryToPintaJson, importPintaJson } from './projectJson'
import { exportPintaScene } from './scene'
import {
  TiledSceneCompatibilityError,
  tiledMap,
  tiledMapXml,
  tiledTilesetXml,
} from './tiled/export'
export type ScenePackageTarget = 'tiled' | 'phaser' | 'pygame' | 'godot'
export async function buildScenePackage(
  root: TilemapAsset,
  assets: readonly PintaAsset[],
  target: ScenePackageTarget,
  options: { imageOf?: (asset: PintaAsset) => Promise<string | null> } = {},
): Promise<Record<string, Uint8Array | string>> {
  const files: Record<string, Uint8Array | string> = {},
    maps = new Map<string, TilemapAsset>([[root.id, root]]),
    byId = new Map(assets.map((a) => [a.id, a])),
    prepared = new Map<string, PintaScene>()
  for (const map of maps.values()) {
    const scene = await exportPintaScene(map, (id) => byId.get(id) ?? null, options.imageOf)
    prepared.set(map.id, scene)
    for (const o of sceneObjects(scene)) {
      if (o.role === 'door') {
        const raw = o.properties.destino ?? o.properties.destination,
          ref = typeof raw === 'object' ? raw.value : raw
        const found = assets.find((a) => a.id === ref || a.name === ref)
        if (found?.kind === 'tilemap') {
          maps.set(found.id, found)
          if (maps.size > 16)
            throw new Error('Este pacote tem mais de 16 mapas ligados por portas.')
        }
      }
    }
  }
  if (maps.size > 16) throw new Error('Este pacote tem mais de 16 mapas ligados por portas.')
  const scenes: Record<string, PintaScene> = {},
    native = new Map<string, PintaAsset>(),
    tiledWarnings: string[] = []
  let start = '',
    tiledStart = '',
    index = 0
  for (const map of maps.values()) {
    const scene = prepared.get(map.id)!,
      folder = `mapas/mapa-${index++}`
    if (!start) {
      start = map.name
      tiledStart = `${folder}/mapa.json`
    }
    try {
      const tiled = tiledMap(scene)
      files[`${folder}/mapa.json`] = JSON.stringify(tiled, null, 2)
      files[`${folder}/mapa.tmx`] = tiledMapXml(tiled, true)
      for (const [i, ts] of (tiled.tilesets as Record<string, unknown>[]).entries())
        files[`${folder}/tiles-${i}.tsx`] = tiledTilesetXml(ts)
    } catch (error) {
      if (
        !(error instanceof TiledSceneCompatibilityError) ||
        (target !== 'pygame' && target !== 'godot')
      )
        throw error
      tiledWarnings.push(
        `Mapa ${map.name}: ${error.message}\nNão foram criados ${folder}/mapa.json, mapa.tmx nem as folhas tiles-N.tsx. O mapa completo continua em maps.json e desenhos.pinta.json para o destino ${target}.`,
      )
    }
    for (const [i, ts] of scene.tilesets.entries()) {
      const path = `${folder}/images/tiles-${i}.png`,
        blob = dataUrlToBlob(ts.image)
      if (!blob) throw new Error('Não foi possível preparar uma imagem do cenário.')
      files[path] = new Uint8Array(await blob.arrayBuffer())
      ts.image = path
    }
    for (const [i, art] of (scene.art ?? []).entries()) {
      const path = `${folder}/images/art-${i}.png`,
        blob = dataUrlToBlob(art.image)
      if (!blob) throw new Error('Não foi possível preparar um desenho dos objetos.')
      files[path] = new Uint8Array(await blob.arrayBuffer())
      art.image = path
    }
    scenes[map.name] = scene
    const bundle = assetBundleToJson(map, assets)
    if (!bundle) throw new Error('Falta um desenho ou conjunto usado pelo mapa.')
    for (const a of importPintaJson(bundle).assets) native.set(a.id, a)
  }
  files['maps.json'] = JSON.stringify(scenes, null, 2)
  files['start.json'] = JSON.stringify(start)
  files['desenhos.pinta.json'] = galleryToPintaJson([...native.values()])
  const readme = [
    'Meu cenário do Pinta',
    '',
    `Mapa inicial: ${root.name}`,
    `Destino: ${target}`,
    '',
    'O arquivo desenhos.pinta.json conserva os desenhos editáveis.',
    'Os mapas compatíveis com Tiled ficam em mapas/mapa-N/mapa.json e mapa.tmx; as folhas externas estão em tiles-N.tsx.',
    'As propriedades, papéis, conjuntos e dados de camada também estão em maps.json.',
    '',
  ]
  if (tiledWarnings.length) {
    files['COMPATIBILIDADE-TILED.txt'] =
      `Suplementos Tiled não criados\n\n${tiledWarnings.join('\n\n')}\n`
    readme.push(
      'Leia COMPATIBILIDADE-TILED.txt: alguns mapas deste projeto não têm suplemento Tiled; os dados do destino escolhido foram conservados.',
      '',
    )
  }
  if (target === 'phaser') {
    const [{ phaserSource, phaserLicense }, { phaserPlayer }] = await Promise.all([
      import('./phaser/phaser.generated'),
      import('./phaser/player'),
    ])
    files['phaser.min.js'] = phaserSource
    files['PHASER-LICENSE.txt'] = phaserLicense
    files['index.html'] =
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meu mapa do Pinta</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#e8edf4}canvas{max-width:100%;height:auto}p{font:16px sans-serif}</style><main><div id="jogo"></div><p>Use as setas para andar.</p></main><script src="phaser.min.js"></script><script src="main.js"></script></html>'
    files['main.js'] =
      `const PINTA_MAPS=${JSON.stringify(scenes)};const PINTA_START=${JSON.stringify(start)};const PINTA_TILED=${JSON.stringify(tiledStart)};\n${mapTwoDSource}\n${phaserPlayer}`
    readme.push(
      'Execute python -m http.server 8000 nesta pasta e abra http://localhost:8000.',
      'O Phaser 3.90.0 está incluído no pacote (licença MIT). Não precisa de internet.',
    )
  } else if (target === 'pygame') {
    const { pygameSceneModule, pygameMain } = await import('./pygameProject')
    files['pinta_cenario.py'] = pygameSceneModule
    files['main.py'] = pygameMain
    files['requirements.txt'] = 'pygame-ce==2.5.8\n'
    readme.push(
      'Instale: python -m pip install -r requirements.txt',
      'Rode: python main.py',
      'Use as setas; Esc fecha. Para capturar: python main.py --frames 60 --screenshot mapa.png',
    )
  } else if (target === 'godot') {
    const g = await import('./godot/project')
    files['project.godot'] = g.godotProject
    files['main.tscn'] = g.godotScene
    files['pinta.gd'] = g.godotScript
    readme.push(
      'Abra project.godot no Godot 4.7.2 (versão homologada) e execute a cena.',
      'O projeto cria TileMapLayer, TileSetAtlasSource, objetos e jogador a partir de maps.json.',
    )
  }
  files['LEIA-ME.txt'] = readme.join('\n')
  const bytes = Object.values(files).reduce(
    (n, v) => n + (typeof v === 'string' ? new TextEncoder().encode(v).length : v.byteLength),
    0,
  )
  if (bytes > 128 * 1024 * 1024)
    throw new Error('O pacote passou de 128 MiB. Exporte os mapas separadamente.')
  return files
}
export async function scenePackageBlob(files: Record<string, string | Uint8Array>): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate')
  return new Blob(
    [
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v]),
        ),
        { level: 6 },
      ),
    ],
    { type: 'application/zip' },
  )
}
