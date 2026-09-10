import { readMtlDocument } from './mtlDocument'
import { MTL_INPUT_LIMITS, type MtlReadLimits } from './mtlInput'
import type { MtlDocument } from './mtlTypes'
import { type ObjDocument, readObjDocument } from './objDocument'
import { ObjInputError } from './objInput'
import { type ObjLocalFile, ObjLocalResources } from './objLocalResources'

export interface ObjMaterialLibrary {
  path: string
  source: MtlDocument
}
export type ObjBundleRead =
  | { status: 'missing'; paths: string[] }
  | {
      status: 'ready'
      /** Canonical OBJ entry path, retained for source context, not the original bytes. */
      entryPath: string
      source: ObjDocument
      libraries: ObjMaterialLibrary[]
      /** One ordered library-index list per original mtllib declaration. Not material precedence. */
      librarySets: number[][]
      /** Own copies per referenced companion path, shared read-only by later consumers. */
      resources: Map<string, Uint8Array>
      resourceBytes: number
    }

function inLibrary<T>(path: string, read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (!(error instanceof ObjInputError)) throw error
    throw new ObjInputError(
      error.reason,
      `files[${JSON.stringify(path)}].${error.path}`,
      error.message,
      { cause: error },
    )
  }
}
/** Discover all currently knowable companions. No native/raster/material conversion or filesystem/URL IO. */
export function readObjBundle(
  bytes: Uint8Array,
  files: readonly ObjLocalFile[] = [],
  entryPath = 'model.obj',
): ObjBundleRead {
  const local = new ObjLocalResources(bytes, entryPath, files),
    source = readObjDocument(bytes),
    libraries: ObjMaterialLibrary[] = [],
    libraryIds = new Map<string, number>(),
    librarySets: number[][] = [],
    remaining: MtlReadLimits = {
      materials: MTL_INPUT_LIMITS.materials,
      properties: MTL_INPUT_LIMITS.properties,
      options: MTL_INPUT_LIMITS.options,
    }
  for (const declaration of source.libraries) {
    const set: number[] = []
    for (const name of declaration.names) {
      const resource = local.reference(name, local.entryPath, `lines[${declaration.line}].mtllib`)
      const libraryBytes = resource.bytes
      if (libraryBytes === null) continue
      let index = libraryIds.get(resource.path)
      if (index === undefined) {
        const mtl = inLibrary(resource.path, () => readMtlDocument(libraryBytes, remaining))
        remaining.materials -= mtl.costs.materials
        remaining.properties -= mtl.costs.properties
        remaining.options -= mtl.costs.options
        index = libraries.length
        libraries.push({ path: resource.path, source: mtl })
        libraryIds.set(resource.path, index)
        inLibrary(resource.path, () => {
          for (const material of mtl.materials)
            for (const property of material.properties) {
              if (property.kind === 'map')
                local.reference(
                  property.value.filename,
                  resource.path,
                  `lines[${property.line}].filename`,
                )
              else if (property.kind === 'color' && property.value.space === 'spectral')
                local.reference(
                  property.value.filename,
                  resource.path,
                  `lines[${property.line}].filename`,
                )
            }
        })
      }
      set.push(index)
    }
    librarySets.push(set)
  }
  const result = local.finish()
  return result.status === 'missing'
    ? result
    : { ...result, entryPath: local.entryPath, source, libraries, librarySets }
}
