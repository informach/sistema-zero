import { lstat, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import { preparePythonPromotion } from './python-promotion-plan'

async function publicJson(path: string) {
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink() || info.size > 12_000_000)
    throw new Error('Entrada JSON inválida ou excessiva.')
  const text = await readFile(path, 'utf8')
  if (Buffer.byteLength(text) > 12_000_000)
    throw new Error('Entrada JSON cresceu durante a leitura.')
  return JSON.parse(text)
}

/** Creation is exclusive; retries accept only the exact previously generated plan. */
async function writeImmutablePlan(path: string, value: unknown) {
  const text = `${canonicalJson(value)}\n`
  try {
    await writeFile(path, text, { flag: 'wx' })
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
    const previous = await publicJson(path)
    if (canonicalJson(previous) !== canonicalJson(value))
      throw new Error('O arquivo de saída contém outro plano.')
  }
}

export async function runPythonPromotionCommand(args: readonly string[]) {
  const [command, ...flags] = args
  const allowed =
    command === 'prepare'
      ? ['--input', '--out']
      : command === 'upload'
        ? ['--plan', '--expect-plan-sha256']
        : []
  if (!allowed.length || flags.length !== 4)
    throw new Error(
      'Use prepare --input arquivo.json --out plano.json ou upload --plan plano.json --expect-plan-sha256 SHA.',
    )
  const values = new Map<string, string>()
  for (let index = 0; index < flags.length; index += 2) {
    const key = flags[index]
    const value = flags[index + 1]
    if (!key || !value || !allowed.includes(key) || values.has(key) || value.startsWith('--'))
      throw new Error('Argumentos inválidos ou repetidos.')
    values.set(key, value)
  }
  const required = (key: string) => {
    const value = values.get(key)
    if (!value) throw new Error(`Argumento obrigatório: ${key}.`)
    return value
  }
  if (command === 'prepare') {
    const path = resolve(required('--input'))
    const plan = await preparePythonPromotion(await publicJson(path), dirname(path))
    await writeImmutablePlan(resolve(required('--out')), plan)
    return {
      planSha256: plan.planSha256,
      distributionSha256: plan.input.distribution.sha256,
      releaseManifestSha256: plan.deployment.release.manifestSha256,
    }
  }
  const { uploadPythonPromotion } = await import('./python-promotion-r2')
  return uploadPythonPromotion(
    await publicJson(resolve(required('--plan'))),
    required('--expect-plan-sha256'),
  )
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runPythonPromotionCommand(process.argv.slice(2))))
  } catch {
    // SDK errors can include credentials/request headers. Receipts never serialize them.
    console.error(
      'Promoção Python não concluída. Confira argumentos, integridade, configuração pública e acesso ao destino; nenhum catálogo foi ativado.',
    )
    process.exitCode = 1
  }
}
