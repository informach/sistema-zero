import { OBJ_INPUT_LIMITS as limits, ObjInputError, objBudget, requireObj } from './objInput'

const trim = (value: string) => value.replace(/^[ \t]+|[ \t]+$/g, '')
export interface ObjStatement {
  /** One-based physical source line at which this logical statement starts. */
  line: number
  keyword: string
  args: string[]
  rest: string
}

/** One bounded logical line at a time; no file-sized array of lines or statements. */
export function* objStatements(bytes: Uint8Array): Generator<ObjStatement> {
  requireObj(bytes instanceof Uint8Array, 'file', 'Escolha os bytes de um arquivo OBJ/MTL.')
  if (!(bytes.buffer instanceof ArrayBuffer))
    throw new ObjInputError(
      'unsupported',
      'file',
      'A leitura OBJ/MTL precisa de bytes sem memória compartilhada.',
    )
  objBudget(bytes.byteLength, limits.fileBytes, 'file')
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new ObjInputError('invalid', 'file', 'O arquivo OBJ/MTL precisa ter texto UTF-8 válido.')
  }
  let line = 1,
    start = 0,
    firstLine = 1,
    pending = '',
    tokens = 0
  for (let cursor = 0; cursor <= text.length; cursor++) {
    const code = text.charCodeAt(cursor)
    if (cursor < text.length && code !== 10 && code !== 13) {
      // Format diagnostics only on failure, not twice for every valid character.
      if (!((code >= 32 && code !== 127) || code === 9))
        requireObj(
          false,
          `lines[${line}]`,
          'O texto contém um caractere de controle não permitido.',
        )
      if (cursor - start + 1 > limits.lineChars)
        objBudget(cursor - start + 1, limits.lineChars, `lines[${line}]`)
      continue
    }
    if (cursor === text.length && start === cursor) break
    objBudget(line, limits.lines, 'lines')
    const path = `lines[${line}]`,
      raw = text.slice(start, cursor),
      comment = raw.indexOf('#')
    let part = trim(comment < 0 ? raw : raw.slice(0, comment))
    if (code === 13 && text.charCodeAt(cursor + 1) === 10) cursor++
    start = cursor + 1
    if (!part) {
      line++
      continue
    }
    if (!pending) firstLine = line
    const continues = part.endsWith('\\')
    if (continues) part = part.slice(0, -1)
    objBudget(pending.length + part.length + Number(continues), limits.lineChars, path)
    pending += part
    line++
    if (continues) {
      pending += ' '
      continue
    }
    const joined = trim(pending),
      words: string[] = []
    pending = ''
    for (const match of joined.matchAll(/[^ \t]+/g)) {
      objBudget(++tokens, limits.tokens, `lines[${firstLine}]`)
      words.push(match[0])
    }
    if (words.length)
      yield {
        line: firstLine,
        keyword: words[0]!,
        args: words.slice(1),
        rest: trim(joined.slice(words[0]!.length)),
      }
  }
  requireObj(
    !pending,
    `lines[${firstLine}]`,
    'A continuação termina sem uma próxima linha de dados.',
  )
}
