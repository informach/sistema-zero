import { createHash } from 'node:crypto'
import sharp from 'sharp'

/** Normalize oversized embedded image encodings without changing game rules or the source file. */
export async function prepareStudioMedia(raw: unknown, maxEmbeddedText: number) {
  const changes: Array<{
    path: string
    fromSha256: string
    toSha256: string
    encoding: 'lossless-webp'
  }> = []
  let nodes = 0
  const visit = async (
    value: unknown,
    location: string,
    depth: number,
    key: string,
  ): Promise<unknown> => {
    if (++nodes > 200000 || depth > 100)
      throw new Error('O programa excede o limite de complexidade da importação')
    if (typeof value === 'string' && key === 'image' && value.length > maxEmbeddedText) {
      const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value)
      if (!match?.[2]) return value
      const source = Buffer.from(match[2], 'base64')
      if (source.length > 24_000_000)
        throw new Error('Imagem embutida maior que 24 MB; importe o original separadamente')
      const encoded = await sharp(source, { limitInputPixels: 40_000_000, failOn: 'warning' })
        .webp({ lossless: true, effort: 6 })
        .toBuffer()
      const derivative = `data:image/webp;base64,${encoded.toString('base64')}`
      if (derivative.length > maxEmbeddedText)
        throw new Error(
          'A imagem continua acima do limite do Studio mesmo sem perda; prepare um derivado menor',
        )
      changes.push({
        path: location,
        fromSha256: createHash('sha256').update(source).digest('hex'),
        toSha256: createHash('sha256').update(encoded).digest('hex'),
        encoding: 'lossless-webp',
      })
      return derivative
    }
    if (Array.isArray(value)) {
      const output: unknown[] = []
      for (const [index, child] of value.entries())
        output.push(await visit(child, `${location}[${index}]`, depth + 1, ''))
      return output
    }
    if (value && typeof value === 'object') {
      const entries: Array<[string, unknown]> = []
      for (const [name, child] of Object.entries(value))
        entries.push([name, await visit(child, `${location}.${name}`, depth + 1, name)])
      return Object.fromEntries(entries)
    }
    return value
  }
  return { document: await visit(raw, '$', 0, ''), changes }
}
