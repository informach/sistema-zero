import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { PintaApp } from '../../src/components/PintaApp'
import { isWorkshopProjectedMap } from '../../src/core/assetMemory'
import type { PintaExportedAsset } from '../../src/core/types'
import {
  pintaWorkshopAssetToJson,
  pintaWorkshopBackup,
  readPintaWorkshopBackup,
} from '../../src/export/workshopDocument'
import { setPintaStorageNamespace } from '../../src/state/persistence'
import { createWorkshopPintaPersistence } from '../../src/state/workshopPersistence'

const namespace = `qa-lg05-${new URL(location.href).searchParams.get('profile') ?? 'teste'}`
setPintaStorageNamespace(namespace)
const persistence = createWorkshopPintaPersistence({ namespace })
const source = await fetch('./fixture.json').then((response) => response.text())
const { assets, warnings } = await readPintaWorkshopBackup(source)
if (warnings.length || assets.length !== 4) throw Error('Fixture incompleta')
if (
  !(await persistence.listAllAssets()).length &&
  !new URL(location.href).searchParams.has('blank')
)
  await persistence.persistAssets(assets)
const exported: PintaExportedAsset[] = []
const qa = {
  async documents() {
    return (await persistence.listAllAssets()).map((asset) => ({
      id: asset.id,
      name: asset.name,
      text: pintaWorkshopAssetToJson(asset),
      projected: isWorkshopProjectedMap(asset),
    }))
  },
  async backup() {
    return pintaWorkshopBackup(await persistence.listAllAssets())
  },
  async library() {
    return (await import('../../src/export/studioLibrary')).listGalleryForStudio({ namespace })
  },
  async exportFromLibrary(id: string) {
    return (await import('../../src/export/studioLibrary')).exportAssetForStudio(id, { namespace })
  },
  exported,
}
Object.assign(window, { pintaProjectedQA: qa })
const root = document.getElementById('root')
if (!root) throw Error('Raiz ausente')
createRoot(root).render(
  <PintaApp
    persistence={persistence}
    adapter={{
      async sendGameToStudio(payload) {
        exported.push(payload)
        return { ok: true }
      },
    }}
  />,
)
