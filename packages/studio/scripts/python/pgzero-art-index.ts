import { DK_ART } from './pgzero-art'
import { WATKISS_ART } from './pgzero-art-watkiss'
import { WIREFRAME_A_ART } from './pgzero-art-wireframe-a'
import { WIREFRAME_B_ART } from './pgzero-art-wireframe-b'
import { WIREFRAME_C_ART } from './pgzero-art-wireframe-c'
import { WIREFRAME_D_ART } from './pgzero-art-wireframe-d'
import { WIREFRAME_E_ART } from './pgzero-art-wireframe-e'

/** All examples: the DK book, the Wireframe recipes and batch 3, one art module per sub-batch. */
export const PGZERO_GAME_ART: Record<string, () => Record<string, Uint8Array>> = {
  ...DK_ART,
  ...WIREFRAME_A_ART,
  ...WIREFRAME_B_ART,
  ...WIREFRAME_C_ART,
  ...WIREFRAME_D_ART,
  ...WIREFRAME_E_ART,
  ...WATKISS_ART,
}
