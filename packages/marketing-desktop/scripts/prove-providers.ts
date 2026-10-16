import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getProviderStatus, runProvider } from '../src/main/providers'

const directory = path.resolve('.cache/proof')
await mkdir(directory, { recursive: true })
if (process.argv.includes('--text')) {
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
