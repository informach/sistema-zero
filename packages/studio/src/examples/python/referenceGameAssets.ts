import { normalizeAssetName, type ProjectAsset } from '../../core/projectAssets'

/** Source and media paths are identical in Classic, Pro, browser and exported desktop projects. */
export function referenceGameAssets(
  game: string,
  sounds: Readonly<Record<string, string>>,
): ProjectAsset[] {
  return Object.entries(sounds).map(([path, dataUrl]) => {
    const name = normalizeAssetName(path.slice(0, -4))
    if (!name) throw new Error('O som original precisa de um nome de material válido.')
    return {
      id: `${game}-${name}`,
      name,
      kind: 'audio',
      source: 'upload',
      proPath: path,
      dataUrl,
      license: {
        name: 'MIT',
        attribution:
          'Sistema Zero (2026). Composição e síntese originais; veja LICENSE e NOTICE.md.',
      },
    }
  })
}
