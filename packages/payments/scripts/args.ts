/** Lê um argumento de CLI `--nome valor` ou `--nome=valor`, com fallback em env `SEED_NOME`/`<ENV>`. */
export function readArg(name: string, envKey?: string): string | undefined {
  const flag = `--${name}`
  const idx = process.argv.indexOf(flag)
  const next = idx >= 0 ? process.argv[idx + 1] : undefined
  if (next && !next.startsWith('--')) return next

  const eq = process.argv.find((a) => a.startsWith(`${flag}=`))
  if (eq) return eq.slice(flag.length + 1)

  if (envKey) return process.env[envKey]
  return undefined
}

/** Verifica a presença de uma flag booleana (ex.: `--poll`). */
export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}
