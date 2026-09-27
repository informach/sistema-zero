import { type BbmodelVec3, bbmodelBoolean, bbmodelVec3 } from './bbmodelValues'

export interface BbmodelRestPose {
  origin: BbmodelVec3
  rotation: BbmodelVec3
}
export interface BbmodelNodeProperties extends BbmodelRestPose {
  sourcePath: string
  visible: boolean
  export: boolean
}

/** Known cube/mesh source defaults; groups use these defaults only in the free format. */
export function readBbmodelRestPose(
  source: Readonly<Record<string, unknown>>,
  path: string,
): BbmodelRestPose {
  return {
    origin: bbmodelVec3(source.origin === undefined ? [0, 0, 0] : source.origin, `${path}.origin`),
    rotation: bbmodelVec3(
      source.rotation === undefined ? [0, 0, 0] : source.rotation,
      `${path}.rotation`,
    ),
  }
}
export function readBbmodelNodeProperties(
  source: Readonly<Record<string, unknown>>,
  path: string,
): BbmodelNodeProperties {
  return {
    sourcePath: path,
    ...readBbmodelRestPose(source, path),
    visible: bbmodelBoolean(source.visibility, `${path}.visibility`, true),
    export: bbmodelBoolean(source.export, `${path}.export`, true),
  }
}
