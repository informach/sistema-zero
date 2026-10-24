import { DK_ART } from './pgzero-art'
import { WIREFRAME_A_ART } from './pgzero-art-wireframe-a'
import { WIREFRAME_B_ART } from './pgzero-art-wireframe-b'
import { WIREFRAME_C_ART } from './pgzero-art-wireframe-c'
import { WIREFRAME_D_ART } from './pgzero-art-wireframe-d'

/** All examples: the DK book and the Wireframe recipes, one art module per sub-batch. */
export const PGZERO_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  ...DK_ART,
  ...WIREFRAME_A_ART,
  ...WIREFRAME_B_ART,
  ...WIREFRAME_C_ART,
  ...WIREFRAME_D_ART,
}
