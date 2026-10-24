import { DK_ART } from './pgzero-art'
import { WIREFRAME_A_ART } from './pgzero-art-wireframe-a'

/** All examples: the DK book and the Wireframe recipes, one art module per sub-batch. */
export const PGZERO_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  ...DK_ART,
  ...WIREFRAME_A_ART,
}
