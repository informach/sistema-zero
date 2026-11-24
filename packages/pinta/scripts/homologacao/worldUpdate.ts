import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { vilaEFloresta } from './fixture'

// The cabana exists in the gallery but is not yet linked to the first exported game.
const { assets, map } = vilaEFloresta()
for (const asset of assets) {
  const source = asset.kind === 'tilemap' ? asset : asset.kind === 'map-set' ? asset.map : null
  if (!source || source.id === 'cabana') continue
  for (const layer of source.layers)
    if (layer.kind === 'objects')
      for (const object of layer.objects)
        if (object.role === 'door') object.properties = { destino: '' }
}
if (
  !map.layers.some(
    (layer) => layer.kind === 'objects' && layer.objects.some((object) => object.role === 'door'),
  )
)
  throw new Error('A fixture precisa de uma porta para configurar no editor.')
const output = resolve(process.argv[2] ?? '.tmp/pinta-scenes-e2e')
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'vila-porta-sem-destino.pinta.json'), galleryToPintaJson(assets))
