import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { z } from 'zod'
import {
  readPromotionFile,
  verifyPythonDistributionFiles,
} from '../../../studio-runtime/scripts/python-distribution-files'
import vendor from '../../src/runtime/python/vendor-manifest.json'
import standardLibrary from './stdlib-manifest.json'

export const PYTHON_REPRODUCTION_SHA256 =
  '65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c'
export const PYTHON_REPRODUCTION_BUN_VERSION = '1.3.11'
export const repositoryRoot = resolve(import.meta.dirname, '../../../..')
const planPath = resolve(
  repositoryRoot,
  'docs/superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json',
)
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const missing = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'

export function assertPinnedBytes(
  bytes: Uint8Array,
  pin: { path: string; bytes: number; sha256: string },
) {
  if (bytes.byteLength !== pin.bytes || digest(bytes) !== pin.sha256)
    throw new Error(`Integridade inválida do input ${pin.path}.`)
}

/** Reads only the committed expected descriptor, never the historical machine's absolute path. */
export async function expectedPythonDistribution() {
  const { deployment } = z
    .object({ deployment: z.object({ distribution: StudioPythonDistributionSchema }) })
    .parse(JSON.parse(await readFile(planPath, 'utf8')))
  if (digest(canonicalJson(deployment.distribution)) !== PYTHON_REPRODUCTION_SHA256)
    throw new Error('O descritor esperado não corresponde à distribuição fixada.')
  return deployment.distribution
}

export async function verifyPythonReproductionInputs(vendorDirectory: string, stdlibPath?: string) {
  for (const file of vendor.files)
    assertPinnedBytes(await readPromotionFile(vendorDirectory, file.path, file.bytes), file)
  if (stdlibPath) {
    const path = resolve(stdlibPath)
    const pin = { ...standardLibrary, path: basename(path) }
    assertPinnedBytes(await readPromotionFile(dirname(path), pin.path, pin.bytes), pin)
  }
  return {
    vendor: vendor.files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
    standardLibrary: {
      sha256: standardLibrary.sha256,
      bytes: standardLibrary.bytes,
      recipe: standardLibrary.recipe,
      mode: stdlibPath ? 'verified-input' : 'canonical-builder',
    },
  }
}

/** An explicit network step: only the seven versioned upstream URLs; corrupt caches fail closed. */
export async function fetchPythonReproductionInputs(vendorDirectory: string) {
  const directory = resolve(vendorDirectory)
  await mkdir(directory, { recursive: true })
  if (relative(directory, await realpath(directory)) !== '')
    throw new Error('O diretório de inputs não pode conter links simbólicos.')
  for (const file of vendor.files) {
    try {
      assertPinnedBytes(await readPromotionFile(directory, file.path, file.bytes), file)
      continue
    } catch (error) {
      if (!missing(error)) throw error
    }
    const response = await fetch(file.url, {
      redirect: 'error',
      credentials: 'omit',
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok || !response.body) {
      await response.body?.cancel()
      throw new Error(`Falha ao obter ${file.path}: HTTP ${response.status}.`)
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    let done = false
    try {
      for (;;) {
        const result = await reader.read()
        if (result.done) {
          done = true
          break
        }
        length += result.value.byteLength
        if (length > file.bytes) throw new Error(`Input maior que o pin: ${file.path}.`)
        chunks.push(result.value)
      }
    } finally {
      if (!done) await reader.cancel()
      reader.releaseLock()
    }
    const bytes = Buffer.concat(chunks, length)
    assertPinnedBytes(bytes, file)
    // Do not replace a cache file, even if a concurrent process created it while downloading.
    await writeFile(resolve(directory, file.path), bytes, { flag: 'wx' })
  }
  return verifyPythonReproductionInputs(directory)
}

export async function verifyPythonReproduction(directory: string) {
  await expectedPythonDistribution()
  const distribution = await verifyPythonDistributionFiles(directory, PYTHON_REPRODUCTION_SHA256)
  return {
    kind: 'studio.python.distribution-reproduction' as const,
    version: 1 as const,
    status: 'verified' as const,
    directory: resolve(directory),
    sha256: PYTHON_REPRODUCTION_SHA256,
    files: distribution.files,
  }
}

/** Explicit, serial build only. Existing output directories and different identities are errors. */
export async function reproducePythonDistribution(options: {
  vendorDirectory: string
  outputDirectory: string
  stdlibPath?: string
}) {
  const vendorDirectory = resolve(options.vendorDirectory)
  const outputDirectory = resolve(options.outputDirectory)
  const stdlibPath = options.stdlibPath ? resolve(options.stdlibPath) : undefined
  if (Bun.version !== PYTHON_REPRODUCTION_BUN_VERSION)
    throw new Error(`Use Bun ${PYTHON_REPRODUCTION_BUN_VERSION}; recebido ${Bun.version}.`)
  if (relative(repositoryRoot, process.cwd()) !== '')
    throw new Error('Execute o build a partir da raiz deste checkout.')
  await expectedPythonDistribution()
  const inputs = await verifyPythonReproductionInputs(vendorDirectory, stdlibPath)
  await mkdir(dirname(outputDirectory), { recursive: true })
  await mkdir(outputDirectory) // Exclusive ownership: never overwrite an earlier reproduction.
  if (relative(outputDirectory, await realpath(outputDirectory)) !== '')
    throw new Error('O diretório de saída não pode conter links simbólicos.')
  const startedAt = new Date().toISOString()
  const receiptPath = resolve(outputDirectory, 'reproduction.json')
  const provenance = {
    kind: 'studio.python.distribution-reproduction',
    version: 1,
    expectedSha256: PYTHON_REPRODUCTION_SHA256,
    startedAt,
    tools: { bun: Bun.version, platform: process.platform, arch: process.arch },
    inputs,
  }
  try {
    // The builder writes its vendor cache. Give it an owned copy, preserving reusable inputs.
    const privateVendor = resolve(outputDirectory, 'vendor')
    await mkdir(privateVendor)
    for (const file of vendor.files) {
      const bytes = await readPromotionFile(vendorDirectory, file.path, file.bytes)
      assertPinnedBytes(bytes, file)
      await writeFile(resolve(privateVendor, file.path), bytes, { flag: 'wx' })
    }
    let prepared: { path: string; sha256: string; recipe: string } | undefined
    if (stdlibPath) {
      const path = resolve(outputDirectory, 'prepared-stdlib.zip')
      const bytes = await readPromotionFile(
        dirname(stdlibPath),
        basename(stdlibPath),
        standardLibrary.bytes,
      )
      assertPinnedBytes(bytes, { ...standardLibrary, path })
      await writeFile(path, bytes, { flag: 'wx' })
      prepared = { path, sha256: standardLibrary.sha256, recipe: standardLibrary.recipe }
    }
    const { buildPythonRuntimeDistribution } = await import('../build-python-runtime')
    const built = await buildPythonRuntimeDistribution({
      vendorDirectory: privateVendor,
      outputDirectory: resolve(outputDirectory, 'distributions'),
      standardLibrary: prepared,
    })
    if (built.hash !== PYTHON_REPRODUCTION_SHA256)
      throw new Error(
        `Distribuição divergente: esperado ${PYTHON_REPRODUCTION_SHA256}; obtido ${built.hash}. ` +
          `Arquivos preservados em ${built.directory}. Não renomeie nem altere o pin.`,
      )
    const verified = await verifyPythonReproduction(built.directory)
    const receipt = { ...provenance, ...verified, finishedAt: new Date().toISOString() }
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
    return { ...verified, receiptPath }
  } catch (error) {
    await writeFile(
      receiptPath,
      `${JSON.stringify(
        {
          ...provenance,
          status: 'failed',
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Falha sem mensagem de erro.',
        },
        null,
        2,
      )}\n`,
      { flag: 'wx' },
    ).catch((receiptError: unknown) => {
      throw new AggregateError([error, receiptError], 'Falha no build e no registro da reprodução.')
    })
    throw error
  }
}
