import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

const names = ['pyodide.mjs', 'pyodide.asm.mjs'] as const
const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const injection = "export { resourceFetch as fetch } from './boot-reader.mjs'\n"

/** Verified vendor inputs stay intact. Only lexical fetch references use the private reader. */
export async function derivePythonBootLoaders(options: {
  inputs: ReadonlyMap<string, Uint8Array>
  reader: Uint8Array
  temporaryRoot: string
  /** A source rewrite applied before the injection (pyodide.asm.mjs: approved-eval.ts). */
  transforms?: Partial<
    Record<
      (typeof names)[number],
      { recipe: string; sha256: string; apply(source: string): string }
    >
  >
}) {
  if (esbuild.version !== '0.28.1') throw new Error('Versão de derivação Python não aprovada.')
  const inputs = names.map((name) => {
    const bytes = options.inputs.get(name)
    if (!bytes) throw new Error(`Loader Python ausente: ${name}.`)
    return { name, bytes: bytes.slice() }
  })
  const reader = options.reader.slice()
  await mkdir(options.temporaryRoot, { recursive: true })
  const temporary = await mkdtemp(join(options.temporaryRoot, '.boot-loader-'))
  const injectPath = join(temporary, 'inject.mjs'),
    readerPath = join(temporary, 'boot-reader.mjs')
  const files = new Map<string, Uint8Array>()
  async function derive() {
    await writeFile(injectPath, injection)
    await writeFile(readerPath, reader)
    for (const input of inputs) {
      const result = await esbuild.build({
        stdin: {
          contents: (options.transforms?.[input.name]?.apply ?? ((text: string) => text))(
            new TextDecoder('utf-8', { fatal: true }).decode(input.bytes),
          ),
          sourcefile: input.name,
          loader: 'js',
          resolveDir: temporary,
        },
        outfile: join(temporary, input.name),
        bundle: false,
        format: 'esm',
        platform: 'browser',
        target: 'es2024',
        minify: false,
        inject: [injectPath],
        write: false,
      })
      if (result.outputFiles.length !== 1) throw new Error('Saída inesperada da derivação Python.')
      files.set(input.name, new Uint8Array(result.outputFiles[0]!.contents))
    }
    const provenance = {
      version: 1,
      recipe: 'scoped-boot-fetch-v1',
      tool: { name: 'esbuild', version: esbuild.version },
      options: {
        bundle: false,
        format: 'esm',
        platform: 'browser',
        target: 'es2024',
        minify: false,
      },
      injectionSha256: sha256(injection),
      readerSha256: sha256(reader),
      ...(options.transforms && Object.keys(options.transforms).length
        ? {
            transforms: Object.entries(options.transforms).map(([path, transform]) => ({
              path,
              recipe: transform!.recipe,
              sha256: transform!.sha256,
            })),
          }
        : {}),
      inputs: inputs.map((input) => ({
        path: input.name,
        bytes: input.bytes.length,
        sha256: sha256(input.bytes),
      })),
      outputs: [...files].map(([path, bytes]) => ({
        path,
        bytes: bytes.length,
        sha256: sha256(bytes),
      })),
    }
    return { files, provenance }
  }
  const outcome = await derive().then(
    (value) => ({ value }),
    (error) => ({ error }),
  )
  // Retain build and cleanup errors together, and attempt both owned files even if one fails.
  // No recursive removal of a computed directory.
  const cleanupErrors: unknown[] = []
  const removals = await Promise.allSettled([unlink(injectPath), unlink(readerPath)])
  for (const removal of removals) {
    if (removal.status !== 'rejected') continue
    const error: unknown = removal.reason
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      cleanupErrors.push(error)
  }
  if (!cleanupErrors.length) {
    try {
      await rmdir(temporary)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  if ('error' in outcome) {
    if (cleanupErrors.length)
      throw new AggregateError(
        [outcome.error, ...cleanupErrors],
        'Falha na derivação e na limpeza Python.',
      )
    throw outcome.error
  }
  if (cleanupErrors.length)
    throw new AggregateError(cleanupErrors, 'Falha na limpeza da derivação Python.')
  return outcome.value
}
