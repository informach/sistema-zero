import { afterEach, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { collectProcessResult, nativeEnvironment } from '../src/main/native-client'
import {
  beginProviderCheckpoint,
  type ProviderOutput,
  providerReferenceHashes,
  readProviderCheckpoint,
  saveProviderCheckpoint,
} from '../src/main/provider-checkpoint'
import { runProvider } from '../src/main/providers'
import type { RunRequest } from '../src/shared/contracts'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    for (const file of await readdir(directory)) await unlink(path.join(directory, file))
    await rmdir(directory)
  }
})
async function directory() {
  const value = await mkdtemp(path.join(tmpdir(), 'sz-provider-recovery-'))
  directories.push(value)
  return value
}
const signal = () => new AbortController().signal
const request: RunRequest = {
  provider: 'codex',
  kind: 'copy',
  prompt: 'Ajuste somente a frase selecionada',
}
const output: ProviderOutput = {
  provider: 'codex',
  text: 'Conheça a atividade.',
  inputTokens: 30,
  outputTokens: 5,
  observedUrls: [],
  researchCalls: 0,
  imageFailed: false,
}

test('retoma respostas dos dois clientes sem login nem nova geração e conserva consumo real', async () => {
  for (const provider of ['codex', 'claude'] as const) {
    const dir = await directory(),
      input = { ...request, provider }
    const raw: ProviderOutput =
      provider === 'codex'
        ? output
        : {
            provider,
            streaming: false,
            code: 0,
            raw: JSON.stringify({
              result: output.text,
              usage: { input_tokens: 30, output_tokens: 5 },
            }),
          }
    await beginProviderCheckpoint(dir, input)
    await saveProviderCheckpoint(dir, input, 'Assinatura confirmada na geração', raw, [], true)
    const stages: string[] = []
    const result = await runProvider(
      input,
      dir,
      signal(),
      (value) => stages.push(value),
      undefined,
      'only',
    )
    expect(result.text).toBe(output.text)
    expect(result.inputTokens).toBe(30)
    expect(result.outputTokens).toBe(5)
    expect(stages).toEqual(['Recuperando a resposta preservada, sem nova geração'])
    await expect(beginProviderCheckpoint(dir, input)).rejects.toThrow('já iniciou')
  }
})

test('resposta ausente, parcial ou de outro pedido nunca vira outra inferência', async () => {
  const dir = await directory()
  await expect(runProvider(request, dir, signal(), () => {}, undefined, 'only')).rejects.toThrow(
    'Não há resposta completa',
  )
  await saveProviderCheckpoint(dir, request, 'ChatGPT', output, [], false)
  await expect(runProvider(request, dir, signal(), () => {}, undefined, 'only')).rejects.toThrow(
    'ficou incompleta',
  )
  await saveProviderCheckpoint(dir, request, 'ChatGPT', output, [], true)
  await expect(readProviderCheckpoint(dir, { ...request, prompt: 'Outra peça' })).rejects.toThrow(
    'outro pedido',
  )
})

test('JSON editorial inválido permanece preservado e não é aplicado ao retomar', async () => {
  const dir = await directory(),
    input: RunRequest = { ...request, responseFormat: 'editorial-copy' }
  await saveProviderCheckpoint(dir, input, 'ChatGPT', { ...output, text: '{invalid' }, [], true)
  await expect(runProvider(input, dir, signal(), () => {}, undefined, 'only')).rejects.toThrow()
  expect((await readProviderCheckpoint(dir, input)).output).toEqual({ ...output, text: '{invalid' })
})

test('imagem preservada é recuperada pelo hash e alteração do arquivo bloqueia uso', async () => {
  const dir = await directory(),
    input: RunRequest = { ...request, kind: 'image' }
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    'base64',
  )
  await saveProviderCheckpoint(dir, input, 'ChatGPT', output, [image], true)
  const result = await runProvider(input, dir, signal(), () => {}, undefined, 'only')
  expect(result.images).toEqual([image])
  const file = (await readdir(dir)).find((name) => name.endsWith('.bin'))
  if (!file) throw new Error('Imagem não foi preservada')
  await writeFile(path.join(dir, file), Buffer.alloc(image.length))
  await expect(runProvider(input, dir, signal(), () => {}, undefined, 'only')).rejects.toThrow(
    'divergente',
  )
})

test('trocar referência no mesmo caminho não reutiliza resposta antiga', async () => {
  const dir = await directory(),
    file = path.join(dir, 'reference.png')
  await writeFile(file, 'original')
  const references = await providerReferenceHashes([file], signal())
  await saveProviderCheckpoint(dir, request, 'ChatGPT', output, [], true, references)
  await writeFile(file, 'alterado')
  await expect(runProvider(request, dir, signal(), () => {}, file, 'only')).rejects.toThrow(
    'outro pedido',
  )
})

test('cancelamento preserva a saída parcial antes de retornar a falha', async () => {
  const dir = await directory(),
    input: RunRequest = { ...request, provider: 'claude' }
  const child = spawn(
    process.execPath,
    ['-e', 'process.stdout.write("resposta parcial"); process.stdin.resume()'],
    {
      stdio: 'pipe',
      windowsHide: true,
      env: nativeEnvironment(),
    },
  )
  const controller = new AbortController(),
    closed = once(child, 'close'),
    data = once(child.stdout, 'data')
  const completion = collectProcessResult(
    child,
    5000,
    controller.signal,
    async (result, complete) => {
      await saveProviderCheckpoint(
        dir,
        input,
        'Claude',
        { provider: 'claude', raw: result.output, code: result.code, streaming: false },
        [],
        complete,
      )
    },
  )
  const failed = completion.then(
    () => null,
    (error: unknown) => error,
  )
  await data
  controller.abort()
  const error = await failed
  expect(error).toBeInstanceOf(Error)
  if (!(error instanceof Error)) throw new Error('O cancelamento deveria falhar')
  expect(error.message).toContain('cancelada')
  await closed
  expect(await readFile(path.join(dir, 'provider-checkpoint.json'), 'utf8')).toContain(
    'resposta parcial',
  )
  await expect(readProviderCheckpoint(dir, input)).rejects.toThrow('ficou incompleta')
})
