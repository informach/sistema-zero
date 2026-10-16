import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderStill, selectComposition } from '@remotion/renderer'
import { artProposalSchema,type ArtProposal } from '@sistemazero/marketing-contracts'
import { artPropsSchema, defaultArt } from '@sistemazero/marketing-production/data'
import { z } from 'zod'
import { probeImage } from '../src/main/media/probe-image'
import { runProvider } from '../src/main/providers'

const directory = path.resolve('.cache/art-proof')
await mkdir(directory, { recursive: true })
const sources = z
  .array(z.object({ piece: z.string(), before: z.object({ title: z.string(), body: z.string() }) }))
  .parse(JSON.parse(await readFile('.cache/connected-proof/editorial-quality.json', 'utf8')))
const evidence: unknown[] = []
for (const source of sources) {
  const file = path.join(directory, `${source.piece}-proposal.json`)
  const provider = source.piece === 'P34' ? 'claude' : 'codex'
  let proposal:ArtProposal
  if (
    process.argv.includes('--saved') ||
    (process.argv.includes('--resume') && (await Bun.file(file).exists()))
  )
    proposal = artProposalSchema.parse(JSON.parse(await readFile(file, 'utf8')))
  else {
    const result = await runProvider(
      {
        provider,
        kind: 'copy',
        responseFormat: 'art',
        prompt: `Crie uma montagem editorial elegante e muito legível em 1080x1350. Fundo creme #fffcf4, texto azul #172a46 e detalhes amarelos #f7d746. Nunito incorporada, fontAssetId null. Não crie imagem nem use ferramentas. Use toda a copy uma única vez, via source body, text vazio e paragraphs vazio, opacity 1. Margens mínimas 80px. Não acrescente texto literal, não use source title. Pode criar formas discretas. Componente 00000000-0000-4000-8000-000000000001. Entregue kind art, schemaVersion 1, uma variante com finalAssetId null. Use IDs UUID para camadas. Copy: ${source.before.body}. Receita inicial para referência: ${JSON.stringify(defaultArt.composition)}.`,
      },
      path.join(directory, source.piece),
      AbortSignal.timeout(360000),
      (stage) => console.log(`${source.piece}: ${stage}`),
    )
    proposal = artProposalSchema.parse(result.art)
    await writeFile(file, JSON.stringify(proposal, null, 2))
  }
  const variant = proposal.variants[0]
  if (!variant) throw new Error('Proposta ausente')
  const inputProps = artPropsSchema.parse({
    composition: variant.composition,
    ...source.before,
    assets: {},
  })
  const serveUrl = path.resolve('dist/remotion')
  const composition = await selectComposition({ serveUrl, id: 'MarketingArt', inputProps })
  const output = path.join(directory, `${source.piece}.png`)
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output,
    imageFormat: 'png',
    onBrowserLog: (log) => console.log(log.text),
  })
  evidence.push({
    piece: source.piece,
    provider,
    output,
    metadata: await probeImage(output, 'image/png'),
  })
  await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(`${source.piece}: render confirmado`)
}
// The same renderer must refuse copy overflow, not silently crop the public artifact.
const serveUrl = path.resolve('dist/remotion'),
  inputProps = { ...defaultArt, body: 'Um texto que não cabe. '.repeat(300) }
const composition = await selectComposition({ serveUrl, id: 'MarketingArt', inputProps })
let overflowBlocked = false
try {
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    output: path.join(directory, 'invalid.png'),
    imageFormat: 'png',
  })
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('ultrapassa')) throw error
  overflowBlocked = true
}
if (!overflowBlocked) throw new Error('O render aceitou texto fora da área')
console.log('Overflow bloqueado; fonte incorporada; três artes renderizadas.')
