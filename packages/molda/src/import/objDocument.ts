import {
  OBJ_INPUT_LIMITS as limits,
  ObjInputError,
  objBudget,
  objIndex,
  objNumber,
  requireObj,
} from './objInput'
import { type ObjStatement, objStatements } from './objText'

export interface ObjElementState {
  object: string | null
  /** Declaration identity, even for repeated names. Zero denotes the implicit initial object. */
  objectLine: number
  /** Membership is not a parent hierarchy. Unchanged lists are shared read-only. */
  groups: readonly string[]
  material: string | null
  smoothing: number
  library: number | null
}
export interface ObjElement {
  kind: 'face' | 'line' | 'points'
  line: number
  state: number
  /** Corner offset, not an offset into the packed scalar array. */
  offset: number
  count: number
  /** Any corner has this attribute; faces require a uniform layout, polylines may omit UV per corner. */
  hasUv: boolean
  hasNormals: boolean
}
export interface ObjDocument {
  /** Packed xyzw. w is a rational weight, not an instruction to divide xyz. */
  positions: Float64Array
  /** Packed uvw, retaining a possible third texture coordinate. */
  texcoords: Float64Array
  normals: Float64Array
  /** Packed position/texture/normal indices, zero-based; missing optional indices are -1. */
  corners: Int32Array
  elements: ObjElement[]
  states: ObjElementState[]
  libraries: Array<{ line: number; names: string[] }>
}

/** Chunked construction avoids a per-coordinate object and a file-sized growable JS array. */
class Numbers<T extends Float64Array | Int32Array> {
  private chunks: T[] = []
  length = 0
  constructor(private readonly create: (length: number) => T) {}
  append(values: readonly number[]) {
    for (const value of values) {
      const offset = this.length % 4096
      if (!offset) this.chunks.push(this.create(4096))
      this.chunks[this.chunks.length - 1]![offset] = value
      this.length++
    }
  }
  finish(): T {
    const output = this.create(this.length)
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]!,
        offset = i * 4096
      output.set(chunk.subarray(0, Math.min(chunk.length, this.length - offset)), offset)
    }
    return output
  }
}
const floats = () => new Numbers((length) => new Float64Array(length))

/** Polygonal source only. No native conversion, triangulation, IO, material lookup or user approval. */
export function readObjDocument(bytes: Uint8Array): ObjDocument {
  const positions = floats(),
    texcoords = floats(),
    normals = floats(),
    corners = new Numbers((length) => new Int32Array(length)),
    elements: ObjElement[] = [],
    libraries: ObjDocument['libraries'] = [],
    states: ObjElementState[] = [
      {
        object: null,
        objectLine: 0,
        groups: ['default'],
        material: null,
        smoothing: 0,
        library: null,
      },
    ]
  let groupNames = 1,
    libraryNames = 0
  function state(next: ObjElementState, path: string) {
    objBudget(states.length + 1, limits.states, path)
    states.push(next)
  }
  function name(value: string, path: string): string {
    objBudget(value.length, limits.nameChars, path)
    return value
  }
  function attributes(
    statement: ObjStatement,
    target: Numbers<Float64Array>,
    defaults: readonly number[],
    min: number,
  ) {
    const { args, line } = statement,
      path = `lines[${line}]`
    if (statement.keyword === 'v' && args.length > 4)
      throw new ObjInputError(
        'unsupported',
        path,
        'Esta variação de cores por ponto ainda não é lida pelo importador OBJ.',
      )
    requireObj(
      args.length >= min && args.length <= defaults.length,
      path,
      'A quantidade de coordenadas não corresponde a esta instrução.',
    )
    objBudget(
      positions.length + texcoords.length + normals.length + defaults.length,
      limits.attributeValues,
      path,
    )
    target.append(
      defaults.map((fallback, i) => (i < args.length ? objNumber(args[i]!, path) : fallback)),
    )
  }
  for (const statement of objStatements(bytes)) {
    const { keyword, args, rest, line } = statement,
      path = `lines[${line}]`,
      current = states[states.length - 1]!
    switch (keyword) {
      case 'v':
        attributes(statement, positions, [0, 0, 0, 1], 3)
        break
      case 'vt':
        attributes(statement, texcoords, [0, 0, 0], 1)
        break
      case 'vn':
        attributes(statement, normals, [0, 0, 0], 3)
        break
      case 'o':
        state({ ...current, object: rest ? name(rest, path) : null, objectLine: line }, path)
        break
      case 'g': {
        const groups = args.length ? args : ['default']
        objBudget(groupNames + groups.length, limits.groupNames, path)
        for (const group of groups) name(group, path)
        groupNames += groups.length
        state({ ...current, groups }, path)
        break
      }
      case 'usemtl':
        state({ ...current, material: rest ? name(rest, path) : null }, path)
        break
      case 'mtllib': {
        requireObj(args.length > 0, path, 'Informe pelo menos uma biblioteca de materiais.')
        objBudget(libraryNames + args.length, limits.libraries, path)
        for (const library of args) {
          name(library, path)
          if (library.includes('"'))
            throw new ObjInputError(
              'unsupported',
              path,
              'Nomes de biblioteca entre aspas ainda não são interpretados.',
            )
        }
        state({ ...current, library: libraries.length }, path)
        libraries.push({ line, names: args })
        libraryNames += args.length
        break
      }
      case 's': {
        requireObj(args.length === 1, path, 'Informe um grupo de suavização ou off.')
        const raw = args[0]!,
          smoothing = raw === 'off' || raw === 'on' ? Number(raw === 'on') : Number(raw)
        requireObj(
          raw === 'off' || raw === 'on' || /^\+?\d+$/.test(raw),
          path,
          'O grupo de suavização precisa ser um inteiro não negativo.',
        )
        requireObj(
          Number.isSafeInteger(smoothing) && smoothing >= 0,
          path,
          'O grupo de suavização é inválido.',
        )
        state({ ...current, smoothing }, path)
        break
      }
      case 'p':
      case 'l':
      case 'f': {
        const kind = keyword === 'p' ? 'points' : keyword === 'l' ? 'line' : 'face',
          min = kind === 'points' ? 1 : kind === 'line' ? 2 : 3,
          offset = corners.length / 3
        requireObj(args.length >= min, path, 'Faltam pontos para formar este elemento.')
        objBudget(elements.length + 1, limits.elements, path)
        objBudget(offset + args.length, limits.references, path)
        let layout: string | null = null,
          hasUv = false,
          hasNormals = false
        for (const arg of args) {
          const fields = arg.split('/')
          requireObj(
            fields.length <= (kind === 'points' ? 1 : kind === 'line' ? 2 : 3),
            path,
            'Esta referência tem campos demais.',
          )
          const cornerUv = fields.length >= 2 && fields[1] !== '',
            cornerNormal = fields.length === 3 && fields[2] !== ''
          requireObj(
            fields.length === 1 ||
              (fields.length === 2 && cornerUv) ||
              (fields.length === 3 && cornerNormal),
            path,
            'A referência está incompleta.',
          )
          const nextLayout = `${cornerUv}:${cornerNormal}`
          requireObj(
            kind !== 'face' || layout === null || layout === nextLayout,
            path,
            'Todos os pontos do elemento precisam usar os mesmos tipos de referência.',
          )
          layout = nextLayout
          hasUv ||= cornerUv
          hasNormals ||= cornerNormal
          corners.append([
            objIndex(fields[0]!, positions.length / 4, path),
            cornerUv ? objIndex(fields[1]!, texcoords.length / 3, path) : -1,
            cornerNormal ? objIndex(fields[2]!, normals.length / 3, path) : -1,
          ])
        }
        elements.push({
          kind,
          line,
          state: states.length - 1,
          offset,
          count: args.length,
          hasUv,
          hasNormals,
        })
        break
      }
      case 'call':
      case 'csh':
        throw new ObjInputError(
          'unsupported',
          path,
          'Comandos e inclusão de outros arquivos não são executados pelo Molda.',
        )
      default:
        throw new ObjInputError(
          'unsupported',
          path,
          'Esta instrução OBJ ainda não é interpretada pela oficina.',
        )
    }
  }
  return {
    positions: positions.finish(),
    texcoords: texcoords.finish(),
    normals: normals.finish(),
    corners: corners.finish(),
    elements,
    states,
    libraries,
  }
}
