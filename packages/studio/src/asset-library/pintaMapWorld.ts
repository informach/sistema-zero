import type {
  PintaScene,
  PintaSceneLayer,
  PintaSceneObject,
} from '@sistemazero/core/studio/pinta-scene'
import type { StudioPintaImportedAsset } from '../studio/pinta-library'
import type { PersonalAsset } from './personal'

type SceneDrawing = PersonalAsset & { scene: PintaScene }
const isMap = (asset: PersonalAsset | undefined): asset is SceneDrawing =>
  asset?.kind === 'image' && asset.origin !== 'molda' && asset.scene !== undefined

function references(scene: PintaScene): { doors: string[]; assets: string[] } {
  const doors = new Set<string>(),
    assets = new Set<string>()
  const local = new Set([
    scene.id,
    ...scene.tilesets.map((a) => a.id),
    ...(scene.art ?? []).map((a) => a.id),
    ...(scene.sets ?? []).map((a) => a.id),
  ])
  const properties = (values: PintaSceneObject['properties'] | undefined) => {
    for (const value of Object.values(values ?? {}))
      if (
        value &&
        typeof value === 'object' &&
        value.type === 'asset' &&
        typeof value.value === 'string' &&
        !local.has(value.value)
      )
        assets.add(value.value)
  }
  const layers = (items: PintaSceneLayer[]) => {
    for (const layer of items) {
      properties(layer.properties)
      if (layer.kind !== 'objects') continue
      for (const object of layer.objects) {
        properties(object.properties)
        if (object.role !== 'door') continue
        const unwrap = (value: PintaSceneObject['properties'][string] | undefined) =>
          value && typeof value === 'object' ? value.value : value
        const destination =
          unwrap(object.properties.destino) || unwrap(object.properties.destination)
        if (!destination) continue
        if (typeof destination !== 'string')
          throw new Error('Uma porta deste cenário não tem um destino válido. O jogo foi mantido.')
        doors.add(destination)
      }
    }
  }
  layers(scene.layers)
  for (const set of scene.sets ?? []) layers(set.layers)
  for (const tileset of scene.tilesets)
    for (const values of Object.values(tileset.tileProperties ?? {})) properties(values)
  return { doors: [...doors], assets: [...assets] }
}

/** Ordinary edits without external map references keep the point-read path. */
export function pintaWorldNeedsInventory(root: PersonalAsset): boolean {
  if (!isMap(root)) return false
  const refs = references(root.scene)
  const self = new Set([root.id, root.name, root.scene.id, root.scene.name])
  return [...refs.doors, ...refs.assets].some((id) => !self.has(id))
}

const imported = (map: SceneDrawing): Omit<StudioPintaImportedAsset, 'maps' | 'pintaImage'> => ({
  id: map.id,
  name: map.name,
  dataUrl: map.dataUrl,
  width: map.width,
  height: map.height,
  sprite: map.sprite,
  tileset: map.tileset,
  tilemap: map.tilemap,
  tilemapFront: map.tilemapFront,
  scene: map.scene,
  libRevision: map.updatedAt,
})

/** Derived scene boundary; the native Pinta document remains the authoring authority. */
export function pintaMapWorld(
  root: PersonalAsset,
  inventory: readonly PersonalAsset[],
): StudioPintaImportedAsset {
  if (!isMap(root)) throw new Error('Este desenho não contém um cenário completo.')
  const byId = new Map(inventory.map((asset) => [asset.id, asset]))
  byId.set(root.id, root)
  const all = [...byId.values()]
  const found = new Map<string, SceneDrawing>([[root.id, root]])
  const queue: SceneDrawing[] = [root]
  const add = (map: SceneDrawing) => {
    if (found.has(map.id)) return
    if (found.size >= 16)
      throw new Error('Este jogo passou de 16 mapas ligados. O jogo anterior foi mantido.')
    found.set(map.id, map)
    queue.push(map)
  }
  for (let index = 0; index < queue.length; index++) {
    const map = queue[index]
    if (!map) continue
    const refs = references(map.scene)
    for (const destination of refs.doors) {
      const exact =
        byId.get(destination) ?? all.find((asset) => isMap(asset) && asset.scene.id === destination)
      if (exact) {
        if (!isMap(exact))
          throw new Error('O destino de uma porta não é um mapa. O jogo foi mantido.')
        add(exact)
        continue
      }
      const candidates = all.filter(
        (asset): asset is SceneDrawing =>
          isMap(asset) && (asset.name === destination || asset.scene.name === destination),
      )
      if (candidates.length > 1)
        throw new Error('Há mais de um mapa com o nome usado por uma porta. O jogo foi mantido.')
      const target = candidates[0]
      if (!target) throw new Error('Falta o mapa de destino de uma porta. O jogo foi mantido.')
      add(target)
    }
    for (const id of refs.assets) {
      const target = byId.get(id)
      if (isMap(target)) add(target)
    }
  }
  const [first, ...maps] = queue
  if (!first) throw new Error('O cenário principal não foi encontrado.')
  return { ...imported(first), ...(maps.length ? { maps: maps.map(imported) } : {}) }
}
