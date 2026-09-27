import {
  MTL_INPUT_LIMITS as limits,
  type MtlReadLimits,
  mtlFilename,
  mtlName,
  mtlReadLimits,
} from './mtlInput'
import { readMtlTexture } from './mtlMap'
import type { MtlColor, MtlDocument, MtlMaterial, MtlProperty } from './mtlTypes'
import { ObjInputError, objBudget, objNumber, requireObj } from './objInput'
import { type ObjStatement, objStatements } from './objText'

function arity(args: string[], minimum: number, maximum: number, path: string) {
  requireObj(
    args.length >= minimum && args.length <= maximum,
    path,
    'Quantidade inválida de argumentos MTL.',
  )
}
function color(args: string[], path: string): MtlColor {
  if (args[0] === 'spectral') {
    arity(args, 2, 3, path)
    return {
      space: 'spectral',
      filename: mtlFilename(args[1]!, `${path}.filename`),
      factor: args.length === 3 ? objNumber(args[2]!, path) : 1,
    }
  }
  const xyz = args[0] === 'xyz',
    offset = Number(xyz),
    count = args.length - offset
  requireObj(count === 1 || count === 3, path, 'A cor precisa de um valor ou três componentes.')
  const first = objNumber(args[offset]!, path)
  return {
    space: xyz ? 'xyz' : 'rgb',
    value: [
      first,
      count === 3 ? objNumber(args[offset + 1]!, path) : first,
      count === 3 ? objNumber(args[offset + 2]!, path) : first,
    ],
  }
}
function property(
  statement: ObjStatement,
  budget: { options: number; limit: number },
): MtlProperty {
  const { line, keyword, args } = statement,
    path = `lines[${line}]`
  switch (keyword) {
    case 'Ka':
    case 'Kd':
    case 'Ks':
    case 'Tf':
    case 'Ke':
      return { line, kind: 'color', keyword, value: color(args, path) }
    case 'Ns':
    case 'Ni':
    case 'sharpness':
    case 'Tr':
    case 'Pr':
    case 'Pm':
    case 'Ps':
    case 'Pc':
    case 'Pcr':
    case 'aniso':
    case 'anisor':
      arity(args, 1, 1, path)
      return { line, kind: 'scalar', keyword, value: objNumber(args[0]!, path) }
    case 'd': {
      const halo = args[0] === '-halo'
      arity(args, halo ? 2 : 1, halo ? 2 : 1, path)
      return { line, kind: 'dissolve', keyword, halo, value: objNumber(args[Number(halo)]!, path) }
    }
    case 'illum': {
      arity(args, 1, 1, path)
      requireObj(
        /^\+?\d+$/.test(args[0]!),
        path,
        'O modelo de iluminação precisa ser um inteiro não negativo.',
      )
      const value = Number(args[0])
      requireObj(
        Number.isSafeInteger(value),
        path,
        'O modelo de iluminação precisa ser um inteiro seguro.',
      )
      if (value > 10)
        throw new ObjInputError(
          'unsupported',
          path,
          'Este modelo de iluminação MTL não é conhecido.',
        )
      return { line, kind: 'illumination', keyword, value }
    }
    case 'map_aat':
      arity(args, 1, 1, path)
      requireObj(args[0] === 'on' || args[0] === 'off', path, 'A suavização precisa ser on ou off.')
      return { line, kind: 'antialias', keyword, value: args[0] === 'on' }
    case 'map_Ka':
    case 'map_Kd':
    case 'map_Ks':
    case 'map_Ns':
    case 'map_d':
    case 'decal':
    case 'disp':
    case 'bump':
    case 'refl':
    case 'map_Tr':
    case 'map_Pr':
    case 'map_Pm':
    case 'map_Ps':
    case 'map_Ke':
    case 'norm':
    case 'map_Bump':
    case 'map_bump':
    case 'map_disp':
    case 'map_Disp':
      return { line, kind: 'map', keyword, value: readMtlTexture(statement, keyword, budget) }
    default:
      throw new ObjInputError(
        'unsupported',
        path,
        `A instrução MTL ${keyword} ainda não é suportada.`,
      )
  }
}

/** Source only: preserve authored declarations, never resolve resources or guess native material semantics. */
export function readMtlDocument(bytes: Uint8Array, remaining: MtlReadLimits = limits): MtlDocument {
  const ceilings = mtlReadLimits(remaining),
    materials: MtlMaterial[] = [],
    budget = { options: 0, limit: ceilings.options }
  let current: MtlMaterial | undefined,
    properties = 0
  for (const statement of objStatements(bytes)) {
    const path = `lines[${statement.line}]`
    if (statement.keyword === 'newmtl') {
      objBudget(materials.length + 1, ceilings.materials, path)
      current = {
        line: statement.line,
        name: mtlName(statement.rest, `${path}.name`),
        properties: [],
      }
      materials.push(current)
    } else {
      requireObj(
        current !== undefined,
        path,
        'Declare um material com newmtl antes de suas propriedades.',
      )
      objBudget(properties + 1, ceilings.properties, 'properties')
      current.properties.push(property(statement, budget))
      properties++
    }
  }
  return { materials, costs: { materials: materials.length, properties, options: budget.options } }
}
