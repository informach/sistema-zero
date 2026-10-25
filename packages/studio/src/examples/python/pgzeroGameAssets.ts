import { normalizeAssetName, type ProjectAsset } from '../../core/projectAssets'

/**
 * Media of a Pygame Zero example, at the paths Pygame Zero reads (images/, sounds/, music/)
 * next to main.py. The same paths serve Classic, Pro, the browser and the desktop export.
 */
export function pgzeroGameAssets(
  game: string,
  media: Readonly<Record<string, string>>,
): ProjectAsset[] {
  return Object.entries(media).map(([path, dataUrl]) => {
    const [folder, file] = path.split('/') as [string, string]
    const name = normalizeAssetName(
      `${folder === 'images' ? '' : `${folder}-`}${file.replace(/\.[^.]+$/, '')}`,
    )
    if (!name) throw new Error('O material do exemplo precisa de um nome válido.')
    return {
      id: `${game}-${folder}-${name}`,
      name,
      kind: folder === 'images' ? 'image' : 'audio',
      source: 'upload',
      proPath: path,
      dataUrl,
      license: {
        name: 'MIT',
        attribution: 'Sistema Zero (2026). Desenhos e sons originais; veja LICENSE e NOTICE.md.',
      },
    }
  })
}
