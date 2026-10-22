import {
  fetchPythonReproductionInputs,
  reproducePythonDistribution,
  verifyPythonReproduction,
  verifyPythonReproductionInputs,
} from './python/reproduction'

export const reproductionUsage = `Uso (na raiz do checkout):
  bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify-inputs --vendor DIR [--stdlib ZIP]
  bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts fetch-vendor --vendor DIR
  bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts build --vendor DIR --output DIRETORIO_NOVO [--stdlib ZIP]
  bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify --directory DIR
fetch-vendor acessa somente os 7 URLs oficiais fixados. build exige admissão serial de recursos.
Nenhum comando publica, ativa uma release ou executa testes de navegador.`

export function parsePythonReproductionCommand(args: readonly string[]) {
  const [command, ...rest] = args
  if (command === '--help' && rest.length === 0) return { command } as const
  const allowed =
    command === 'build'
      ? ['--vendor', '--output', '--stdlib']
      : command === 'verify-inputs'
        ? ['--vendor', '--stdlib']
        : command === 'fetch-vendor'
          ? ['--vendor']
          : command === 'verify'
            ? ['--directory']
            : undefined
  if (!allowed) throw new Error(reproductionUsage)
  const values = new Map<string, string>()
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]!
    const value = rest[i + 1]
    if (!allowed.includes(key) || values.has(key) || !value?.trim() || value.startsWith('--'))
      throw new Error(`Argumento inválido, ausente ou repetido: ${key}.\n${reproductionUsage}`)
    values.set(key, value)
  }
  function required(key: string) {
    const value = values.get(key)
    if (!value) throw new Error(`Argumento obrigatório: ${key}.\n${reproductionUsage}`)
    return value
  }
  if (command === 'verify') return { command, directory: required('--directory') } as const
  if (command === 'fetch-vendor') return { command, vendorDirectory: required('--vendor') } as const
  if (command === 'build')
    return {
      command,
      vendorDirectory: required('--vendor'),
      outputDirectory: required('--output'),
      stdlibPath: values.get('--stdlib'),
    } as const
  return {
    command: 'verify-inputs',
    vendorDirectory: required('--vendor'),
    stdlibPath: values.get('--stdlib'),
  } as const
}

export async function runPythonReproductionCommand(args: readonly string[]) {
  const options = parsePythonReproductionCommand(args)
  switch (options.command) {
    case '--help':
      return reproductionUsage
    case 'verify-inputs':
      return verifyPythonReproductionInputs(options.vendorDirectory, options.stdlibPath)
    case 'fetch-vendor':
      return fetchPythonReproductionInputs(options.vendorDirectory)
    case 'verify':
      return verifyPythonReproduction(options.directory)
    case 'build':
      return reproducePythonDistribution(options)
  }
}

if (import.meta.main) {
  try {
    const result = await runPythonReproductionCommand(process.argv.slice(2))
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Falha na reprodução Python.')
    process.exitCode = 1
  }
}
