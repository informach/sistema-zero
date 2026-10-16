import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type ArtProps, artPropsSchema } from '@sistemazero/marketing-production/data'
import type { ExecutionResources } from '../execution/supervisor'
import { withOutputBudget } from './output-budget'
import { renderProcess } from './render-process'
export async function renderArt(
  props: ArtProps,
  resources: Pick<ExecutionResources, 'assets'>,
  directory: string,
  signal: AbortSignal,
  imageFormat: 'png' | 'jpeg' = 'png',
) {
  const value = artPropsSchema.parse(props)
  if (Object.values(value.assets).some((url) => !resources.assets.ownsUrl(url)))
    throw new Error('O render só aceita arquivos confirmados neste cache')
  const release = await resources.assets.reserve(
    value.composition.width * value.composition.height * 8,
  )
  try {
    await mkdir(directory, { recursive: true })
    const propsFile = path.join(directory, 'art-input.json'),
      output = path.join(directory, imageFormat === 'jpeg' ? 'art.jpg' : 'art.png')
    await writeFile(propsFile, JSON.stringify(value))
    await withOutputBudget(directory, [output], 64 * 1024 * 1024, signal, (bounded) =>
      renderProcess(propsFile, output, imageFormat === 'jpeg' ? 'art-jpeg' : 'art', bounded),
    )
    return await resources.assets.importFile(output)
  } finally {
    release()
  }
}
