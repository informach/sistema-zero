import { encodeGlbContainer, readGltfDocument } from '@sistemazero/molda/gltf'

/** Raylib 6 aceita um esqueleto por modelo. Vínculos equivalentes escritos por
 * malha podem compartilhar uma pele; juntas ou bind poses diferentes não podem.
 * A cópia conserva BIN, acessores, clipes, materiais e transformações intactos. */
export function normalizarPelesParaRaylib(entrada: Uint8Array) {
  const leitura = readGltfDocument(entrada)
  if (leitura.status !== 'ready') throw Error('O modelo Raylib precisa ser autocontido.')
  const d = leitura.document,
    primeira = d.skins[0]
  if (d.skins.length <= 1)
    return { bytes: entrada, pelesAntes: d.skins.length, pelesDepois: d.skins.length }
  const valor = (pele: typeof primeira, i: number) =>
    pele!.inverseBindMatrices === null
      ? (i % 16) % 5 === 0
        ? 1
        : 0
      : d.accessors[pele!.inverseBindMatrices]!.values[i]
  for (const pele of d.skins.slice(1)) {
    if (
      pele.skeleton !== primeira!.skeleton ||
      pele.joints.length !== primeira!.joints.length ||
      pele.joints.some((j, i) => j !== primeira!.joints[i]) ||
      Array.from({ length: pele.joints.length * 16 }, (_, i) => i).some(
        (i) => valor(pele, i) !== valor(primeira, i),
      )
    )
      throw Error(
        'O modelo contém esqueletos diferentes. O Raylib aceita um por modelo; use Three/GLB ou separe os personagens na origem.',
      )
  }
  if (d.source.unknownChunkTypes.length || d.resources.buffers.length !== 1)
    throw Error('O modelo não pode ser adaptado ao Raylib sem perder recursos adicionais.')
  const json = structuredClone(d.source.json),
    skins = json.skins as Record<string, unknown>[]
  if (skins.some((s) => s.extensions !== undefined))
    throw Error('Uma extensão de pele precisa de um adaptador antes de exportar para Raylib.')
  json.skins = [skins[0]]
  for (const no of json.nodes as Record<string, unknown>[]) if (no.skin !== undefined) no.skin = 0
  const bytes = encodeGlbContainer(json, d.resources.buffers, 32 * 1024 * 1024)
  const conferido = readGltfDocument(bytes)
  if (conferido.status !== 'ready' || conferido.document.skins.length !== 1)
    throw Error('O modelo com vínculo compartilhado não reabriu corretamente.')
  return { bytes, pelesAntes: d.skins.length, pelesDepois: 1 }
}
