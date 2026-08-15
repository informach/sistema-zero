/**
 * "Criar um desenho com tipo e tamanho" — a fábrica PURA, sem zustand e sem React.
 *
 * ⭐ Ela mora aqui, e não no `galleryStore`, porque tem dois consumidores fora do navegador: o
 * ADMIN pré-cria o desenho inicial do bloco de aula, e o SERVIDOR valida na borda. Puxar a store
 * da galeria arrastaria zustand e a persistência do IndexedDB para dentro de um serviço Bun.
 *
 * A store da galeria continua sendo a única dona do que é EFEITO (nome único, cota, gravar):
 * daqui sai um asset em memória e nada mais.
 */
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
  type PintaProjectRef,
  sanitizeProjectRef,
} from './project'

export type NewAssetInput = (
  | {
      kind: 'pixel-sprite'
      name: string
      frameSize: number
      frameWidth?: number
      frameHeight?: number
    }
  | { kind: 'pixel-background'; name: string; width: number; height: number }
  | { kind: 'tileset'; name: string; tileSize: number }
  | { kind: 'tilemap'; name: string; tilesetId: string; cols: number; rows: number }
  | {
      kind: 'vector-sprite'
      name: string
      frameSize: number
      frameWidth?: number
      frameHeight?: number
    }
  | { kind: 'vector-background'; name: string; width: number; height: number }
  | { kind: 'vector-tileset'; name: string; tileSize: number }
) & {
  /** Vínculo com o projeto do Pensa (agrupa a galeria; paleta nos swatches do vetor). */
  projectRef?: PintaProjectRef
}

/**
 * Os tamanhos que a AUTORIA de uma aula oferece — um subconjunto CURADO do que o Pinta aceita.
 *
 * ⚠️⚠️ O teto não é estética, é o que garante que a criança consiga ENVIAR: o desenho atravessa a
 * borda, e lá o corpo é capado (ver `MAX_PINTA_ASSET_CHARS` no members). Uma tela de 512x512 com as
 * 4 camadas cheias chega a 2,6 M chars no pior caso e NÃO passa — a criança desenharia uma hora e
 * o botão recusaria. Em 256x256 o mesmo pior caso cai a ~650 k, com folga sobrando.
 *
 * Quem quiser telas maiores usa o Pinta solto, onde o desenho fica no navegador e não trafega.
 */
export const PINTA_LESSON_ASSET_OPTIONS = [
  { kind: 'pixel-sprite', label: 'Personagem (pixel art)', sizes: [16, 32, 48, 64] },
  { kind: 'pixel-background', label: 'Cenário (pixel art)', sizes: [64, 128, 192, 256] },
  { kind: 'vector-sprite', label: 'Personagem (formas)', sizes: [32, 64, 128] },
  { kind: 'vector-background', label: 'Cenário (formas)', sizes: [240, 360, 480] },
] as const satisfies ReadonlyArray<{
  kind: NewAssetInput['kind']
  label: string
  sizes: readonly number[]
}>

export type PintaLessonAssetKind = (typeof PINTA_LESSON_ASSET_OPTIONS)[number]['kind']

/**
 * Monta o desenho inicial de um bloco de aula a partir do tipo + tamanho escolhidos.
 * Personagem usa quadro quadrado; cenário usa a medida nos dois lados.
 */
export function createLessonAsset(
  kind: PintaLessonAssetKind,
  size: number,
  name = 'desenho-da-aula',
): PintaAsset {
  if (kind === 'pixel-sprite' || kind === 'vector-sprite') {
    return createAsset({ kind, name, frameSize: size })
  }
  return createAsset({ kind, name, width: size, height: size })
}

/**
 * Monta o asset do tipo pedido. O `name` vem separado porque quem chama de dentro da galeria já
 * resolveu a colisão de nomes; quem chama de fora passa o do próprio input.
 */
export function createAsset(input: NewAssetInput, name: string = input.name): PintaAsset {
  const built = buildAssetByKind(input, name)
  // Vínculo com o projeto do Pensa (07/2026): passa pelo MESMO portão do load
  // (hex minúsculo, teto de nome/cores) p/ o asset nascer igual ao round-trip.
  const projectRef = sanitizeProjectRef(input.projectRef)
  return projectRef ? { ...built, projectRef } : built
}

function buildAssetByKind(input: NewAssetInput, name: string): PintaAsset {
  switch (input.kind) {
    case 'pixel-sprite':
      return createPixelSpriteAsset({
        name,
        frameSize: input.frameSize,
        frameWidth: input.frameWidth,
        frameHeight: input.frameHeight,
      })
    case 'pixel-background':
      return createPixelBackgroundAsset({ name, width: input.width, height: input.height })
    case 'tileset':
      return createTilesetAsset({ name, tileSize: input.tileSize })
    case 'tilemap':
      return createTilemapAsset({
        name,
        tilesetId: input.tilesetId,
        cols: input.cols,
        rows: input.rows,
      })
    case 'vector-sprite':
      return createVectorSpriteAsset({
        name,
        frameSize: input.frameSize,
        frameWidth: input.frameWidth,
        frameHeight: input.frameHeight,
      })
    case 'vector-background':
      return createVectorBackgroundAsset({ name, width: input.width, height: input.height })
    case 'vector-tileset':
      return createVectorTilesetAsset({ name, tileSize: input.tileSize })
  }
}
