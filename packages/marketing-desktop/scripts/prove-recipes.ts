import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderStill, selectComposition } from '@remotion/renderer'
import {
  ART_RECIPES,
  type ArtProposal,
  type ArtRecipeId,
  artProposalSchema,
  artText,
  CDC_ART_LABELS,
  canonicalJson,
} from '@sistemazero/marketing-contracts'
import { artPropsSchema, editorialRecipe } from '@sistemazero/marketing-production/data'
import { z } from 'zod'
import { LocalAssets } from '../src/main/assets'
import { probeImage } from '../src/main/media/probe-image'
import { runProvider } from '../src/main/providers'

const directory = path.resolve('.cache/recipe-proof')
await mkdir(directory, { recursive: true })
const assets = new LocalAssets(path.join(directory, 'assets'))
await assets.start()
const texts = z
  .array(z.object({ piece: z.string(), before: z.object({ body: z.string(), title: z.string() }) }))
  .parse(JSON.parse(await readFile('.cache/connected-proof/editorial-quality.json', 'utf8')))
const acervo =
  'C:/Users/tocha/projects/sistema-zero/docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens'
const fixtures: Array<{
  piece: string
  recipe: ArtRecipeId
  provider?: 'codex' | 'claude'
  body: string
  files: string[]
}> = [
  ...texts
    .filter((item) => item.piece === 'P01' || item.piece === 'P34')
    .map((item) => ({
      piece: item.piece,
      recipe: item.piece === 'P01' ? ('cdc-cover-v1' as const) : ('cdc-quote-v1' as const),
      provider: item.piece === 'P01' ? ('codex' as const) : ('claude' as const),
      body: item.before.body,
      files: [],
    })),
  {
    piece: 'P07',
    recipe: 'cdc-comparison-v1',
    body: 'Uma mudança para testar.',
    files: [
      path.join(acervo, 'p07-primeira-dificuldade/apoio/v3/comparacao-antes.png'),
      path.join(acervo, 'p07-primeira-dificuldade/apoio/v3/comparacao-depois.png'),
    ],
  },
  {
    piece: 'P08',
    recipe: 'cdc-evidence-v1',
    body: 'Uma derrota não conta tudo.',
    files: [path.resolve('.cache/studio-proof/P08-runtime.png')],
  },
  {
    piece: 'P29',
    recipe: 'cdc-comparison-v1',
    body: 'Você quer preparar seu filho para o futuro.\n\nObserve também o que ele está aprendendo a fazer hoje.',
    files: [
      path.join(acervo, 'p29-aprender-a-fazer-hoje/apoio/familia.png'),
      path.resolve('.cache/studio-proof/P29-runtime.png'),
    ],
  },
]
const evidence: unknown[] = []
try {
  for (const fixture of fixtures) {
    const imported = []
    for (const file of fixture.files) imported.push(await assets.importFile(file))
    const base = editorialRecipe(fixture.recipe, {
      body: fixture.body,
      format: 'feed',
      imageAssetIds: imported.map((asset) => asset.id),
    })
    let composition = base
    if (fixture.provider) {
      const file = path.join(directory, `${fixture.piece}-proposal.json`)
      let proposal: ArtProposal
      if (process.argv.includes('--saved'))
        proposal = artProposalSchema.parse(JSON.parse(await readFile(file, 'utf8')))
      else {
        const result = await runProvider(
          {
            provider: fixture.provider,
            kind: 'copy',
            responseFormat: 'art',
            prompt: `Ajuste o espaçamento desta receita mantendo sua direção visual. Receita escolhida ${fixture.recipe}: ${ART_RECIPES[fixture.recipe].guidance}. Conserve designRecipeId, todas as camadas protected e seus valores exatos. Todo body uma vez, source body, text vazio; novos textos literais só ${JSON.stringify(CDC_ART_LABELS)}. Componente 00000000-0000-4000-8000-000000000001. Entregue schemaVersion 1, kind art, uma variante, finalAssetId null. Não use ferramentas. Copy: ${fixture.body}. Base: ${JSON.stringify(base)}`,
          },
          path.join(directory, fixture.piece),
          AbortSignal.timeout(360000),
          (stage) => console.log(`${fixture.piece}: ${stage}`),
        )
        proposal = artProposalSchema.parse(result.art)
        await writeFile(file, JSON.stringify(proposal, null, 2))
      }
      const value = proposal.variants[0]?.composition
      if (!value || value.designRecipeId !== fixture.recipe)
        throw new Error('A IA não preservou a receita escolhida')
      for (const layer of base.layers.filter((layer) => layer.protected))
        if (
          canonicalJson(layer) !==
          canonicalJson(value.layers.find((candidate) => candidate.id === layer.id) ?? null)
        )
          throw new Error('A IA alterou uma camada protegida')
      const visibleCopy = value.layers
        .filter((layer) => layer.kind === 'text' && layer.source === 'body')
        .map((layer) =>
          layer.kind === 'text' ? artText(layer, { body: fixture.body, title: '' }) : '',
        )
        .join('\n\n')
      if (visibleCopy !== fixture.body) throw new Error('A IA não preservou a copy inteira')
      composition = value
    }
    const props = artPropsSchema.parse({
      composition,
      body: fixture.body,
      title: fixture.piece,
      assets: Object.fromEntries(imported.map((asset) => [asset.id, asset.url])),
    })
    const serveUrl = path.resolve('dist/remotion'),
      selected = await selectComposition({ serveUrl, id: 'MarketingArt', inputProps: props }),
      output = path.join(directory, `${fixture.piece}.png`)
    await renderStill({
      serveUrl,
      composition: selected,
      inputProps: props,
      output,
      imageFormat: 'png',
    })
    const report = {
      piece: fixture.piece,
      recipe: fixture.recipe,
      provider: fixture.provider ?? null,
      composition,
      metadata: await probeImage(output, 'image/png'),
      sources: imported.map((asset, index) => ({
        file: fixture.files[index],
        sha256: asset.sha256,
      })),
      status:
        fixture.piece === 'P29'
          ? 'Rascunho: demonstrar seguidores antes de finalizar'
          : 'Prova de composição; não é aprovação editorial',
    }
    evidence.push(report)
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(`${fixture.piece}: receita renderizada e fontes registradas`)
  }
} finally {
  assets.close()
}
