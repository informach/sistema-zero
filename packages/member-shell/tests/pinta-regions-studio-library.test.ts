import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { IDBFactory } from 'fake-indexeddb'
import { scene4Fixture } from '../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../pinta/src/export/regionImage'
import { savePintaStudioBundle } from '../src/components/creator/save-pinta-studio-bundle'

// Etapa 1 das regiões (23/11/2026). A biblioteca protegida do Estúdio é de outra frente: aqui só
// se lê e se testa por fora, pela ponte que o host do Pinta usa ("Usar no Estúdio"). A captura
// regional (PNG 5 com a cena 4 embutida) não entra pela ponte publicada, que não tem a capacidade
// privada: a recusa é clara e nada do que já estava na biblioteca muda.

const { createCanvas } = createRequire(new URL('../../pinta/package.json', import.meta.url))(
  '@napi-rs/canvas',
)
const png = (width: number, height: number) =>
  new Uint8Array(createCanvas(width, height).toBuffer('image/png'))
const dataUrl = (bytes: Uint8Array) =>
  `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
const idb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
let regional = { id: 'mundo', name: 'mundo', dataUrl: '', width: 64, height: 32 }

beforeAll(async () => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  const root = scene4Fixture()
  const embedded = await embedPintaRegionImage(
    png(64, 32),
    JSON.stringify({
      ...root,
      physics: 'precise',
      tilesets: root.tilesets.map((t) => ({ ...t, image: dataUrl(png(64, 16)) })),
      art: root.art.map((a) => ({ ...a, image: dataUrl(png(a.width, a.height)) })),
    }),
  )
  regional = { ...regional, dataUrl: dataUrl(embedded.png) }
})

afterAll(async () => {
  const library = await import('@sistemazero/studio/personal-assets')
  library.setPersonalAssetsNamespace('')
  if (idb) Object.defineProperty(globalThis, 'indexedDB', idb)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})

test('a ponte do host recusa o mapa regional com recado e não toca no que já estava na biblioteca', async () => {
  const library = await import('@sistemazero/studio/personal-assets')
  const namespace = `regioes-biblioteca-${crypto.randomUUID()}`
  const heroi = { id: 'heroi', name: 'heroi', dataUrl: dataUrl(png(32, 16)), width: 32, height: 16 }
  const saved = await savePintaStudioBundle(heroi, namespace)
  expect(saved.ok).toBe(true)
  const before = await library.listPersonalAssets({ namespace })

  const refused = await savePintaStudioBundle(regional, namespace)
  expect(refused.ok).toBe(false)
  expect(refused.ok ? '' : refused.error).toBeTruthy()
  expect(await library.getPersonalAsset('mundo', { namespace })).toBeNull()
  expect(await library.listPersonalAssets({ namespace })).toEqual(before)
  expect(await library.getPersonalAsset('heroi', { namespace })).toMatchObject({
    dataUrl: heroi.dataUrl,
    width: 32,
    height: 16,
  })

  // Um mapa regional junto com outro desenho no mesmo pacote também não grava pela metade.
  const bundle = await savePintaStudioBundle(
    { ...heroi, id: 'heroi-2', name: 'heroi-2', maps: [regional] },
    namespace,
  )
  expect(bundle.ok).toBe(false)
  expect(await library.getPersonalAsset('heroi-2', { namespace })).toBeNull()
  expect(await library.listPersonalAssets({ namespace })).toEqual(before)
})
