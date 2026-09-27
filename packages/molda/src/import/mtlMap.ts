import { MTL_INPUT_LIMITS as limits, mtlFilename, mtlName } from './mtlInput'
import type { MtlMapKeyword, MtlTexture, MtlTextureOption } from './mtlTypes'
import { OBJ_NUMBER_PATTERN, ObjInputError, objBudget, objNumber, requireObj } from './objInput'
import type { ObjStatement } from './objText'

function unsupported(path: string, message: string): never {
  throw new ObjInputError('unsupported', path, message)
}
/** Locate the remaining literal filename without collapsing its internal spaces or decoding it. */
function remainder(text: string, words: number): string {
  let cursor = 0
  for (let i = 0; i < words; i++) {
    while (cursor < text.length && (text[cursor] === ' ' || text[cursor] === '\t')) cursor++
    while (cursor < text.length && text[cursor] !== ' ' && text[cursor] !== '\t') cursor++
  }
  return text.slice(cursor).replace(/^[ \t]+/, '')
}

export function readMtlTexture(
  statement: ObjStatement,
  keyword: MtlMapKeyword,
  budget: { options: number; limit: number },
): MtlTexture {
  const { args } = statement,
    path = `lines[${statement.line}]`,
    options: MtlTextureOption[] = [],
    color = ['map_Ka', 'map_Kd', 'map_Ks', 'map_Ke', 'refl'].includes(keyword),
    scalar = [
      'map_Ns',
      'map_d',
      'map_Tr',
      'map_Pr',
      'map_Pm',
      'map_Ps',
      'decal',
      'disp',
      'bump',
      'map_Bump',
      'map_bump',
      'map_disp',
      'map_Disp',
    ].includes(keyword)
  let cursor = 0
  function take(): string {
    requireObj(cursor < args.length, path, 'Falta um argumento da opção de textura.')
    return args[cursor++]!
  }
  const number = () => objNumber(take(), path)
  function option(key: string): MtlTextureOption {
    switch (key) {
      case 'blendu':
      case 'blendv':
      case 'clamp':
      case 'cc': {
        if (key === 'cc' && !color) unsupported(path, 'Correção de cor não se aplica a este mapa.')
        const value = take()
        requireObj(value === 'on' || value === 'off', path, 'A opção precisa ser on ou off.')
        return { key, value: value === 'on' }
      }
      case 'o':
      case 's':
      case 't': {
        const value: [number, number?, number?] = [number()]
        while (value.length < 3 && cursor < args.length && OBJ_NUMBER_PATTERN.test(args[cursor]!))
          value.push(number())
        return { key, value }
      }
      case 'mm':
        return { key, value: [number(), number()] }
      case 'bm':
        if (keyword !== 'bump' && keyword !== 'map_Bump' && keyword !== 'map_bump')
          unsupported(path, 'O multiplicador de altura só se aplica ao mapa bump.')
        return { key, value: number() }
      case 'boost': {
        const value = number()
        requireObj(value >= 0, path, 'O reforço da textura não pode ser negativo.')
        return { key, value }
      }
      case 'texres': {
        const value = number()
        requireObj(
          Number.isSafeInteger(value) && value > 0,
          path,
          'A resolução precisa ser um inteiro positivo.',
        )
        return { key, value }
      }
      case 'colorspace': {
        const value = mtlName(take(), path)
        requireObj(
          !value.startsWith('-'),
          path,
          'Falta o nome do espaço de cor antes da próxima opção.',
        )
        return { key, value }
      }
      case 'imfchan': {
        if (!scalar)
          unsupported(path, 'Seleção de canal só se aplica a mapas escalares ou de altura.')
        const value = take()
        requireObj(
          value === 'r' ||
            value === 'g' ||
            value === 'b' ||
            value === 'm' ||
            value === 'l' ||
            value === 'z',
          path,
          'O canal de textura não é válido.',
        )
        return { key, value }
      }
      case 'type': {
        if (keyword !== 'refl')
          unsupported(path, 'O tipo de ambiente só se aplica ao mapa de reflexão.')
        const value = take()
        requireObj(
          value === 'sphere' ||
            value === 'cube_top' ||
            value === 'cube_bottom' ||
            value === 'cube_front' ||
            value === 'cube_back' ||
            value === 'cube_left' ||
            value === 'cube_right',
          path,
          'O tipo de reflexão não é válido.',
        )
        return { key, value }
      }
      default:
        return unsupported(path, `A opção MTL -${key} ainda não é suportada.`)
    }
  }
  while (args[cursor]?.startsWith('-')) {
    objBudget(options.length + 1, limits.optionsPerMap, path)
    objBudget(budget.options + 1, budget.limit, 'options')
    const key = take().slice(1),
      parsed = option(key)
    options.push(parsed)
    budget.options++
  }
  requireObj(cursor < args.length, path, 'Falta o arquivo da textura.')
  // A numeric-only name after a variable-length vector is ambiguous. Use ./123 to name that file.
  const filename = mtlFilename(remainder(statement.rest, cursor), `${path}.filename`)
  if (keyword === 'refl')
    requireObj(
      options.some((entry) => entry.key === 'type'),
      path,
      'Falta o tipo do mapa de reflexão.',
    )
  return { filename, options }
}
