import type { PythonBlockCodec } from '../../blocks/contract'
import { pintaSceneCodecs } from '../pintaScenes'
import { RAYLIB_RESOLVER_OPTIONS, raylibCommonCodecs } from '../raylib/commonCatalog'

/** 🟦 Raylib 2D: the blocks of 2D raylib games, plain pyray in the Bridge. */
export const PYTHON_RAYLIB_2D_CODECS: readonly PythonBlockCodec[] =
  raylibCommonCodecs('python-raylib-2d')
export { RAYLIB_RESOLVER_OPTIONS }

export const PYTHON_RAYLIB_2D_PINTA_SCENE_CODECS = pintaSceneCodecs('python-raylib-2d')
