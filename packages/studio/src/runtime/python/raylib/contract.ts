/**
 * The two Raylib extensions. They are independent for the learner (2D games use Raylib 2D,
 * 3D games use Raylib 3D) and share one module inside: `pyray`, `raylib` and `_szraylib`, the
 * same files for both, configured for 2D or 3D when the program starts.
 */
export const RAYLIB_2D_EXTENSION = Object.freeze({ id: 'python-raylib-2d', version: '1.0.0' })
export const RAYLIB_3D_EXTENSION = Object.freeze({ id: 'python-raylib-3d', version: '1.0.0' })
/** The desktop package the module follows; exports pin it. */
export const RAYLIB_UPSTREAM = Object.freeze({ package: 'raylib', version: '6.0.1.0' })
/** Distribution files, relative to the raylib/ folder next to the worker. */
export const RAYLIB_MODULE_FILES = [
  '_szraylib/__init__.py',
  '_szraylib/_api.py',
  '_szraylib/_args.py',
  '_szraylib/_assets.py',
  '_szraylib/_audio.py',
  '_szraylib/_camera2d.py',
  '_szraylib/_camera3d.py',
  '_szraylib/_collide2d.py',
  '_szraylib/_collide3d.py',
  '_szraylib/_colors.py',
  '_szraylib/_constants.py',
  '_szraylib/_core.py',
  '_szraylib/_default_font.py',
  '_szraylib/_draw2d.py',
  '_szraylib/_draw3d.py',
  '_szraylib/_ffi.py',
  '_szraylib/_float32.py',
  '_szraylib/_floatvec.py',
  '_szraylib/_gltf.py',
  '_szraylib/_models.py',
  '_szraylib/_names.py',
  '_szraylib/_random.py',
  '_szraylib/_raymath.py',
  '_szraylib/_rt.py',
  '_szraylib/_shaders.py',
  '_szraylib/_shapes.py',
  '_szraylib/_structs.py',
  '_szraylib/_text.py',
  'pyray/__init__.py',
  'raylib/__init__.py',
  'raylib/colors.py',
  'raylib/defines.py',
  'raylib/enums.py',
] as const
export type RaylibExtensionId = typeof RAYLIB_2D_EXTENSION.id | typeof RAYLIB_3D_EXTENSION.id
export const RAYLIB_EXTENSION_IDS: readonly RaylibExtensionId[] = [
  RAYLIB_2D_EXTENSION.id,
  RAYLIB_3D_EXTENSION.id,
]
export function raylibExtension(
  extensions: readonly { id: string; version: string }[],
): typeof RAYLIB_2D_EXTENSION | typeof RAYLIB_3D_EXTENSION | undefined {
  return [RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION].find((extension) =>
    extensions.some((entry) => entry.id === extension.id && entry.version === extension.version),
  )
}
