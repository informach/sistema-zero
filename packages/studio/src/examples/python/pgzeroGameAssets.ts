import { normalizeAssetName, type ProjectAsset } from '../../core/projectAssets'

const KIND: Readonly<Record<string, ProjectAsset['kind']>> = {
  images: 'image',
  sounds: 'audio',
  music: 'audio',
  fonts: 'font',
}

/**
 * Media of a Pygame Zero example, at the paths Pygame Zero reads (images/, sounds/, music/,
 * fonts/) next to main.py. The same paths serve Classic, Pro, the browser and the desktop
 * export. A font keeps its file name: the store crosses its extension with the bytes.
 */
export function pgzeroGameAssets(
  game: string,
  media: Readonly<Record<string, string>>,
): ProjectAsset[] {
  return Object.entries(media).map(([path, dataUrl]) => {
    const [folder, file] = path.split('/') as [string, string]
    const kind = KIND[folder]
    if (!kind) throw new Error(`O material do exemplo está numa pasta desconhecida: ${path}`)
    const name = normalizeAssetName(
      `${folder === 'images' ? '' : `${folder}-`}${file.replace(/\.[^.]+$/, '')}`,
    )
    if (!name) throw new Error('O material do exemplo precisa de um nome válido.')
    return {
      id: `${game}-${folder}-${name}`,
      name,
      kind,
      source: 'upload',
      proPath: path,
      dataUrl,
      ...(kind === 'font' ? { originalFileName: file } : {}),
      license:
        kind === 'font'
          ? {
              name: 'OFL-1.1',
              attribution:
                'Press Start 2P, de CodeMan38 (SIL Open Font License 1.1, LICENSE-fonte.txt).',
            }
          : {
              name: 'MIT',
              attribution:
                'Sistema Zero (2026). Desenhos e sons originais; veja LICENSE e NOTICE.md.',
            },
    }
  })
}
