import { describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { resolveCoverAsset } from '../coverAsset'

const imagem: ProjectAsset = {
  id: 'a1',
  name: 'tela-inicial',
  kind: 'image',
  dataUrl: 'data:image/png;base64,AAA',
  source: 'upload',
}
const som: ProjectAsset = {
  id: 'a2',
  name: 'musica',
  kind: 'audio',
  dataUrl: 'data:audio/mpeg;base64,AAA',
  source: 'upload',
}

describe('resolveCoverAsset: a capa escolhida resolve pelo NOME na hora de usar', () => {
  it('sem escolha, ou sem assets, é a foto automática (null)', () => {
    expect(resolveCoverAsset({ assets: [imagem] })).toBeNull()
    expect(resolveCoverAsset({ coverAssetName: 'tela-inicial' })).toBeNull()
    expect(resolveCoverAsset({ coverAssetName: 'tela-inicial', assets: [] })).toBeNull()
  })

  it('acha a imagem pelo nome', () => {
    expect(resolveCoverAsset({ coverAssetName: 'tela-inicial', assets: [som, imagem] })).toBe(
      imagem,
    )
  })

  it('nome pendurado (imagem apagada) ou asset que não é imagem caem na automática', () => {
    expect(resolveCoverAsset({ coverAssetName: 'apagada', assets: [imagem] })).toBeNull()
    expect(resolveCoverAsset({ coverAssetName: 'musica', assets: [som] })).toBeNull()
  })
})
