import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getProviderStatus, runProvider } from '../src/main/providers'

const directory = path.resolve('.cache/proof')
await mkdir(directory, { recursive: true })
if (process.argv.includes('--editorial')) {
  for (const provider of ['codex', 'claude'] as const) {
    if (process.argv.includes('--claude') && provider !== 'claude') continue
    const result = await runProvider(
      {
        provider,
        kind: 'copy',
        responseFormat: 'editorial-copy',
        prompt:
          'Faça um ajuste curto nesta copy: "Conheça nossa atividade de jogos." Entregue kind copy, schemaVersion 1, summary, uma variante com label e changes. entityId 00000000-0000-4000-8000-000000000001, field body, value com até 20 palavras. Não prometa resultados.',
      },
      path.join(directory, `${provider}-editorial`),
      new AbortController().signal,
      (stage) => console.log(stage),
    )
    if (!result.editorial) throw new Error('Proposta estruturada ausente')
    await writeFile(
      path.join(directory, `${provider}-editorial.json`),
      JSON.stringify(result.editorial, null, 2),
    )
    console.log(
      JSON.stringify({
        provider,
        mode: result.mode,
        kind: result.editorial.kind,
        variants: result.editorial.variants.length,
      }),
    )
  }
} else if (process.argv.includes('--research')) {
  const result = await runProvider(
    {
      provider: 'codex',
      kind: 'research',
      prompt:
        'Pesquise na documentação oficial https://www.remotion.dev/docs/ qual a função do Player. Faça uma busca web e abra o endereço exato que citar. Limite a pesquisa a 3 ações web. Entregue JSON com title, summary, findings [{claim,classification,sourceUrls,quote:null}], sources [{title,url}], hypothesis e proposedDirection (estes dois podem ser strings vazias). Uma única descoberta, sem citação literal. Não use comandos ou arquivos.',
    },
    directory,
    new AbortController().signal,
    (stage) => console.log(stage),
  )
  await writeFile(path.join(directory, 'research.json'), JSON.stringify(result.research, null, 2))
  console.log(
    JSON.stringify({
      researchProof: {
        mode: result.mode,
        sources: result.research?.result.sources.length,
        toolCalls: result.research?.toolCalls,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    }),
  )
} else if (process.argv.includes('--text')) {
  for (const provider of ['codex', 'claude'] as const) {
    if (process.argv.includes('--claude') && provider !== 'claude') continue
    const started = Date.now()
    const result = await runProvider(
      {
        provider,
        kind: 'copy',
        prompt:
          'Escreva uma única frase em português convidando um responsável a conhecer uma atividade de criação de jogos. Não prometa resultados. Não use ferramentas.',
      },
      directory,
      new AbortController().signal,
      () => {},
    )
    await writeFile(path.join(directory, `${provider}-copy.txt`), result.text)
    console.log(
      JSON.stringify({
        provider,
        mode: result.mode,
        textReceived: result.text.trim().length > 0,
        durationMs: Date.now() - started,
      }),
    )
  }
} else if (process.argv.includes('--image')) {
  const result = await runProvider(
    {
      provider: 'codex',
      kind: 'image',
      prompt:
        'Ilustração simples de uma estrela amarela de cinco pontas sobre fundo azul escuro. Sem texto. Uma imagem somente.',
    },
    directory,
    new AbortController().signal,
    (stage) => console.log(stage),
  )
  const image = result.images[0]
  if (!image) throw new Error('Imagem ausente.')
  const source = path.join(directory, 'native-original.png')
  await writeFile(source, image)
  console.log(
    JSON.stringify({
      stage: 'creation',
      bytes: image.length,
      sha256: createHash('sha256').update(image).digest('hex'),
    }),
  )
  const edited = await runProvider(
    {
      provider: 'codex',
      kind: 'edit-image',
      sourceAssetId: '00000000-0000-4000-8000-000000000001',
      prompt:
        'Mantenha a estrela, o formato e o fundo. Altere somente a cor da estrela para verde.',
    },
    directory,
    new AbortController().signal,
    (stage) => console.log(stage),
    source,
  )
  const output = edited.images[0]
  if (!output) throw new Error('Edição ausente.')
  await writeFile(path.join(directory, 'native-edited.png'), output)
  console.log(
    JSON.stringify({
      stage: 'edit',
      bytes: output.length,
      sha256: createHash('sha256').update(output).digest('hex'),
    }),
  )
} else {
  for (const provider of ['codex', 'claude'] as const)
    console.log(JSON.stringify(await getProviderStatus(provider, directory)))
}
