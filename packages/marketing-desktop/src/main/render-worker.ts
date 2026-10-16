import { readFile } from 'node:fs/promises'
import { makeCancelSignal, renderMedia, selectComposition } from '@remotion/renderer'
import { storySchema } from '../../../marketing-production/src/story'

const [propsFile, outputLocation, serveUrl] = process.argv.slice(2)
if (!propsFile || !outputLocation || !serveUrl) throw new Error('Parâmetros de render ausentes.')

const { cancelSignal, cancel } = makeCancelSignal()
const parent = (
  process as NodeJS.Process & {
    parentPort?: { on: (name: string, callback: (event: { data: unknown }) => void) => void }
  }
).parentPort
parent?.on('message', (event) => {
  if (event.data === 'cancel') cancel()
})

async function main() {
  const props = storySchema.parse(JSON.parse(await readFile(propsFile!, 'utf8')))
  const composition = await selectComposition({
    serveUrl: serveUrl!,
    id: 'MarketingStory',
    inputProps: props,
  })
  await renderMedia({
    composition,
    serveUrl: serveUrl!,
    codec: 'h264',
    inputProps: props,
    outputLocation,
    concurrency: 2,
    cancelSignal,
    onProgress: ({ progress }) => console.log(JSON.stringify({ progress })),
  })
}
main()
  .then(() => {
    // The Electron parent message port keeps the utility process alive after the render.
    // Flush the terminal result before exiting so the supervisor can finalize the artifact.
    process.stdout.write(`${JSON.stringify({ complete: true })}\n`, () => process.exit(0))
  })
  .catch(() => {
    process.stderr.write('Não foi possível concluir o render local.\n', () => process.exit(1))
  })
