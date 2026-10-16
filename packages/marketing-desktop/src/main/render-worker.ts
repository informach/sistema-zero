import { readFile } from 'node:fs/promises'
import { makeCancelSignal, renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import type {} from 'electron'
import { artPropsSchema } from '../../../marketing-production/src/art-props'
import { storySchema } from '../../../marketing-production/src/story'
import { timelinePropsSchema } from '../../../marketing-production/src/video/props'

const [propsFile, outputLocation, serveUrl, mode] = process.argv.slice(2)
if (!propsFile || !outputLocation || !serveUrl) throw new Error('Parâmetros de render ausentes.')

const { cancelSignal, cancel } = makeCancelSignal()
if (!process.parentPort) throw new Error('O render precisa do processo isolado do app desktop')
process.parentPort.on('message', (event) => {
  if (event.data === 'cancel') cancel()
})

async function main(propsFile: string, outputLocation: string, serveUrl: string) {
  if (mode === 'art' || mode === 'art-jpeg') {
    const props = artPropsSchema.parse(JSON.parse(await readFile(propsFile, 'utf8')))
    const composition = await selectComposition({
      serveUrl,
      id: 'MarketingArt',
      inputProps: props,
    })
    await renderStill({
      composition,
      serveUrl,
      inputProps: props,
      output: outputLocation,
      imageFormat: mode === 'art-jpeg' ? 'jpeg' : 'png',
      ...(mode === 'art-jpeg' ? { jpegQuality: 95 } : {}),
      cancelSignal,
    })
    return
  }
  if (mode !== 'timeline' && mode !== undefined && mode !== 'story')
    throw new Error('Tipo de render desconhecido')
  const raw: unknown = JSON.parse(await readFile(propsFile, 'utf8'))
  const props = mode === 'timeline' ? timelinePropsSchema.parse(raw) : storySchema.parse(raw)
  const composition = await selectComposition({
    serveUrl,
    id: mode === 'timeline' ? 'MarketingTimeline' : 'MarketingStory',
    inputProps: props,
  })
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    colorSpace: 'bt709',
    imageFormat: 'png',
    inputProps: props,
    outputLocation,
    concurrency: 2,
    cancelSignal,
    onProgress: ({ progress }) => console.log(JSON.stringify({ progress })),
  })
}
main(propsFile, outputLocation, serveUrl)
  .then(() => {
    // The Electron parent message port keeps the utility process alive after the render.
    // Flush the terminal result before exiting so the supervisor can finalize the artifact.
    process.stdout.write(`${JSON.stringify({ complete: true })}\n`, () => process.exit(0))
  })
  .catch((error) => {
    process.stderr.write(
      `Não foi possível concluir o render local: ${error instanceof Error ? error.message.slice(0, 1000) : 'Falha do renderizador'}\n`,
      () => process.exit(1),
    )
  })
