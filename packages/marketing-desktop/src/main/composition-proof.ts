import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { compositionInputSchema, videoSchema } from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import sharp from 'sharp'
import { LocalAssets } from './assets'
import { compositionRenderProofSchema } from './media/composition-render-input'
import { mediaProcess } from './media/media-process'
import { probeVideo } from './media/probe-video'
import { renderProcess } from './media/render-process'
import { renderTimeline } from './media/render-timeline'

export async function proveGeneratedComposition() {
  if (app.isPackaged) throw new Error('Prova disponível somente no checkout')
  const directory = path.join(app.getAppPath(), '.cache/composition-proof', crypto.randomUUID())
  await mkdir(directory, { recursive: true })
  const assets = new LocalAssets(path.join(directory, 'assets')),
    signal = AbortSignal.timeout(240000)
  await assets.start()
  try {
    const imageFile = path.join(directory, 'referência.png')
    await sharp({ create: { width: 30, height: 30, channels: 3, background: '#dd4466' } })
      .png()
      .toFile(imageFile)
    const image = await assets.importFile(imageFile),
      input = compositionInputSchema.parse({
        schemaVersion: 1,
        width: 320,
        height: 240,
        fps: { numerator: 30, denominator: 1 },
        durationInFrames: 60,
        title: '',
        body: 'Crie seu jogo',
        requiredText: ['Crie seu jogo'],
        assetIds: [image.id],
        fontAssetId: null,
        background: '#123456',
        accent: '#ffdb56',
      })
    const source = `import {AbsoluteFill, Img, interpolate, useCurrentFrame} from 'remotion';
export default function GeneratedComposition(props) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0,8], [0,1], {extrapolateRight:'clamp'});
  return <AbsoluteFill>
    <Img src={props.assets['${image.id}']} style={{position:'absolute',left:240,top:20,width:30,height:30}} />
    <div style={{position:'absolute',left:30,top:70,width:260,height:80,display:'flex',alignItems:'center',padding:12,borderRadius:12,backgroundColor:props.accent,color:'#172a46',fontSize:24,fontWeight:800,opacity}}>{props.body}</div>
  </AbsoluteFill>;
}`
    const raw = { source, input, assets: { [image.id]: image.url } },
      propsFile = path.join(directory, 'input.json'),
      output = path.join(directory, 'scene.webm')
    await writeFile(propsFile, JSON.stringify(raw))
    await renderProcess(propsFile, output, 'composition', signal)
    const receipt = compositionRenderProofSchema.parse(
      JSON.parse(await readFile(`${output}.receipt.json`, 'utf8')),
    )
    assert.equal(receipt.sourceSha256, createHash('sha256').update(source).digest('hex'))
    assert.equal(receipt.observedFrames, 60)
    assert((receipt.textFrames[0] ?? 0) >= 15)
    const metadata = await probeVideo(output, 'video/webm', signal)
    assert.equal(metadata.codec, 'vp9')
    const scene = await assets.importFile(output),
      track = crypto.randomUUID(),
      timeline = videoSchema.parse({
        schemaVersion: 1,
        recipeVersion: 'marketing-timeline-v1',
        width: 320,
        height: 240,
        fps: input.fps,
        durationInFrames: 60,
        background: input.background,
        accent: input.accent,
        captions: [],
        tracks: [{ id: track, kind: 'visual' }],
        clips: [
          {
            id: crypto.randomUUID(),
            trackId: track,
            kind: 'video',
            assetId: scene.id,
            startFrame: 0,
            durationInFrames: 60,
          },
        ],
      })
    const final = await renderTimeline(
      { timeline, assets: { [scene.id]: scene.url } },
      { assets },
      path.join(directory, 'timeline'),
      signal,
    )
    const png = path.join(directory, 'composite.png')
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-ss',
        '1',
        '-i',
        (await assets.verify(final.id)).path,
        '-frames:v',
        '1',
        png,
      ],
      signal,
    )
    const pixels = await sharp(png).removeAlpha().raw().toBuffer()
    const at = (x: number, y: number) => [
      ...pixels.subarray((y * 320 + x) * 3, (y * 320 + x) * 3 + 3),
    ]
    const color = (x: number, y: number, expected: number[]) => {
      const actual = at(x, y)
      assert(
        actual.every((value, index) => Math.abs(value - expected[index]!) <= 5),
        `Cor em ${x},${y}: ${actual}`,
      )
      return actual
    }
    const background = color(5, 5, [18, 52, 86]),
      panel = color(280, 95, [255, 219, 86]),
      referenceImage = color(250, 30, [221, 68, 102])
    for (const [key, badSource, message] of [
      [
        'missing-text',
        'export default function GeneratedComposition(props){return <div/>}',
        'texto exigido',
      ],
      [
        'environment',
        'export default function GeneratedComposition(props){return <div>{process.env}</div>}',
        'identificador não permitido',
      ],
      [
        'transparent-text',
        'export default function GeneratedComposition(props){return <div style={{color:"transparent",fontSize:24}}>{props.body}</div>}',
        'texto exigido',
      ],
      [
        'unreadable-text',
        'export default function GeneratedComposition(props){return <div style={{fontSize:1}}>{props.body}</div>}',
        'texto exigido',
      ],
      [
        'overflow',
        'export default function GeneratedComposition(props){return <div style={{position:"absolute",left:-600,fontSize:24}}>{props.body}</div>}',
        'texto fora',
      ],
    ]) {
      assert(key && badSource && message)
      const badInput = path.join(directory, `${key}.json`),
        badOutput = path.join(directory, `${key}.webm`)
      await writeFile(badInput, JSON.stringify({ ...raw, source: badSource }))
      await assert.rejects(
        renderProcess(badInput, badOutput, 'composition', signal),
        (error) => error instanceof Error && error.message.includes(message),
      )
      await assert.rejects(
        stat(`${badOutput}.receipt.json`),
        (error) => error instanceof Error && 'code' in error && error.code === 'ENOENT',
      )
    }
    const evidence = {
      directory,
      receipt,
      metadata,
      finalAssetId: final.id,
      pixels: { background, panel, referenceImage },
      rejected: ['missing-text', 'environment', 'overflow', 'transparent-text', 'unreadable-text'],
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } finally {
    assets.close()
  }
}
