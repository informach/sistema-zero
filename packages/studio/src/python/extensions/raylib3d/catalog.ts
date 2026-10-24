import type { PythonBlockCodec } from '../../blocks/contract'
import { RAYLIB_RESOLVER_OPTIONS, raylibCommonCodecs } from '../raylib/commonCatalog'

/**
 * 🧊 Raylib 3D: everything a 3D game needs on its own — the window, the loop, the HUD (text,
 * shapes, images), keyboard, mouse and sound from the common factory, plus the 3D blocks.
 */
export const PYTHON_RAYLIB_3D_CODECS: readonly PythonBlockCodec[] =
  raylibCommonCodecs('python-raylib-3d')
export { RAYLIB_RESOLVER_OPTIONS }
