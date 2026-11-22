/**
 * Congela, uma vez por versão, as fixtures dos contratos que o Estúdio lê do Pinta e do Molda
 * Cenários (`src/testing/contracts/`). Cada arquivo sai do PRODUTOR real daquela versão:
 *
 * - `pinta-scene-v1.json` e `pinta-scene-v2.json`: as cenas de "A Vila e a Floresta", geradas pelo
 *   Pinta (`packages/pinta/scripts/homologacao/studio-assets.ts` → `examples/pintaScenes.generated.ts`);
 * - `pinta-scene-v3.json`: `exportPintaScene` do Pinta com um objeto de colisão (o que exige a 3);
 * - `molda-scene3d-v1.json`: os materiais que a importação do Estúdio monta a partir do pacote do
 *   compilador real do Molda Cenários (`testing/scene3dTransportFixture.ts`);
 * - `molda-scene3d-regioes-v1.json`: o mesmo, com duas regiões vizinhas no documento (a cena
 *   compilada leva as listas de cada região; lote 5 da conclusão, 22/11/2026).
 *
 *   bun scripts/freeze-contract-fixtures.ts            # recusa sobrescrever o que já existe
 *   bun scripts/freeze-contract-fixtures.ts --nova pinta-scene-v4   # só grava a que falta
 *
 * As fixtures já gravadas NUNCA são regeradas: o teste delas prova que esta versão do Estúdio
 * continua lendo o que as versões antigas dos produtores gravaram. Depois de gravar uma nova, passe
 * o `bunx biome format --write` nela (só espaços) antes do commit.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createTilemapAsset, createTilesetAsset } from '../../pinta/src/core/project'
import { exportPintaScene } from '../../pinta/src/export/scene'
import { createMapObject } from '../../pinta/src/tiles/mapObjects'
import { VILA_SCENE_ASSETS } from '../src/examples/pintaScenes.generated'
import { criarTransporteDeEnsaio } from '../src/testing/scene3dTransportFixture'

const PASTA = resolve(import.meta.dir, '../src/testing/contracts')
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='

function sceneOfVersion(version: number): unknown {
  const asset = VILA_SCENE_ASSETS.find((item) => item.scene?.version === version)
  if (!asset?.scene) throw new Error(`A Vila não tem cena na versão ${version}.`)
  return asset.scene
}

async function sceneV3(): Promise<unknown> {
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16, now: 1 })
  const map = createTilemapAsset({ name: 'mapa', tilesetId: tileset.id, cols: 4, rows: 4, now: 1 })
  map.layers.push({
    id: 'objects',
    kind: 'objects',
    name: 'Paredes',
    visible: true,
    objects: [
      createMapObject({
        id: 'wall',
        x: 16,
        y: 16,
        width: 16,
        height: 8,
        shape: 'ellipse',
        collision: true,
      }),
    ],
  })
  const scene = await exportPintaScene(
    map,
    (id) => (id === tileset.id ? tileset : null),
    async () => PNG_1X1,
  )
  if (scene.version !== 3) throw new Error(`O produtor gravou a versão ${scene.version}, não a 3.`)
  return scene
}

async function moldaScene3dV1(): Promise<unknown> {
  // O exportador de GLB do three usa o FileReader do navegador; os testes têm o happy-dom no preload.
  const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
  if (typeof globalThis.FileReader === 'undefined') GlobalRegistrator.register()
  const { assets } = await criarTransporteDeEnsaio()
  return assets
}

async function moldaScene3dRegioesV1(): Promise<unknown> {
  const { GlobalRegistrator } = await import('@happy-dom/global-registrator')
  if (typeof globalThis.FileReader === 'undefined') GlobalRegistrator.register()
  const { assets } = await criarTransporteDeEnsaio({ comRegioes: true })
  return assets
}

const produtores: Record<string, () => Promise<unknown>> = {
  'pinta-scene-v1': async () => sceneOfVersion(1),
  'pinta-scene-v2': async () => sceneOfVersion(2),
  'pinta-scene-v3': sceneV3,
  'molda-scene3d-v1': moldaScene3dV1,
  'molda-scene3d-regioes-v1': moldaScene3dRegioesV1,
}

const pedida = process.argv.indexOf('--nova')
const nomes = pedida >= 0 ? [process.argv[pedida + 1] ?? ''] : Object.keys(produtores)
mkdirSync(PASTA, { recursive: true })
for (const nome of nomes) {
  const produzir = produtores[nome]
  if (!produzir) throw new Error(`Não há produtor para "${nome}".`)
  const arquivo = resolve(PASTA, `${nome}.json`)
  if (existsSync(arquivo)) {
    console.log(`${nome}: já congelada, não mexo`)
    continue
  }
  writeFileSync(arquivo, `${JSON.stringify(await produzir(), null, 1)}\n`)
  console.log(`${nome}: gravada`)
}
