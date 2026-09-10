import { GLTF_INPUT_LIMITS, GltfInputError, gltfList, gltfRecord, requireGltf } from './gltfInput'
import { gltfName, gltfNumber } from './gltfMetadata'

export type GltfCamera = { name: string | null } & (
  | {
      kind: 'perspective'
      yfov: number
      aspectRatio: number | null
      znear: number
      zfar: number | null
    }
  | { kind: 'orthographic'; xmag: number; ymag: number; znear: number; zfar: number }
)

function positive(input: unknown, path: string) {
  const value = gltfNumber(input, path)
  requireGltf(value > 0, path, 'Este valor de projeção precisa ser positivo.')
  return value
}

/** Metadata only. Preserve valid-but-discouraged FOV/magnification; no camera or matrix is created. */
export function readGltfCameras(input: unknown): GltfCamera[] {
  return gltfList(input, 'cameras', GLTF_INPUT_LIMITS.cameras).map((value, i) => {
    const path = `cameras[${i}]`,
      row = gltfRecord(value, path),
      name = gltfName(row.name, `${path}.name`)
    requireGltf(typeof row.type === 'string', `${path}.type`, 'Falta o tipo da câmera.')
    requireGltf(
      row.perspective === undefined || row.orthographic === undefined,
      path,
      'A câmera não pode misturar duas projeções.',
    )
    if (row.type === 'perspective') {
      requireGltf(
        row.orthographic === undefined,
        `${path}.orthographic`,
        'A projeção não corresponde ao tipo da câmera.',
      )
      const at = `${path}.perspective`,
        projection = gltfRecord(row.perspective, at),
        znear = positive(projection.znear, `${at}.znear`),
        zfar = projection.zfar === undefined ? null : positive(projection.zfar, `${at}.zfar`)
      requireGltf(
        zfar === null || zfar > znear,
        `${at}.zfar`,
        'O plano distante precisa vir depois do plano próximo.',
      )
      return {
        kind: 'perspective',
        name,
        znear,
        zfar,
        yfov: positive(projection.yfov, `${at}.yfov`),
        aspectRatio:
          projection.aspectRatio === undefined
            ? null
            : positive(projection.aspectRatio, `${at}.aspectRatio`),
      }
    }
    if (row.type === 'orthographic') {
      requireGltf(
        row.perspective === undefined,
        `${path}.perspective`,
        'A projeção não corresponde ao tipo da câmera.',
      )
      const at = `${path}.orthographic`,
        projection = gltfRecord(row.orthographic, at),
        xmag = gltfNumber(projection.xmag, `${at}.xmag`),
        ymag = gltfNumber(projection.ymag, `${at}.ymag`),
        znear = gltfNumber(projection.znear, `${at}.znear`, 0),
        zfar = positive(projection.zfar, `${at}.zfar`)
      requireGltf(xmag !== 0 && ymag !== 0, at, 'A ampliação da câmera não pode ser zero.')
      requireGltf(
        zfar > znear,
        `${at}.zfar`,
        'O plano distante precisa vir depois do plano próximo.',
      )
      return { kind: 'orthographic', name, xmag, ymag, znear, zfar }
    }
    throw new GltfInputError(
      'unsupported',
      `${path}.type`,
      'Este tipo de câmera ainda não é suportado.',
    )
  })
}
