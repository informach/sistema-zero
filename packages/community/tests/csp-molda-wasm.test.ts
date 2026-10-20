import { describe, expect, it } from 'bun:test'

describe('CSP de produção do Molda Adulto', () => {
  it('permite compilar WASM desde a navegação inicial sem liberar eval JavaScript', async () => {
    // Um subprocesso evita depender da ordem de imports ou do NODE_ENV da suíte.
    const configUrl = new URL('../next.config.ts', import.meta.url).href
    const child = Bun.spawnSync(
      [
        process.execPath,
        '-e',
        `const {default: config} = await import(${JSON.stringify(configUrl)}); console.log(JSON.stringify(await config.headers()))`,
      ],
      { env: { ...process.env, NODE_ENV: 'production' } },
    )
    expect(child.exitCode).toBe(0)
    const rules: { source: string; headers: { key: string; value: string }[] }[] = JSON.parse(
      child.stdout.toString(),
    )
    const strictRules = rules?.filter((rule) => rule.source === '/((?!estudio/pro/).*)')
    expect(strictRules?.length).toBe(1)
    const policies = strictRules?.flatMap((rule) =>
      rule.headers.filter((header) => header.key === 'Content-Security-Policy'),
    )
    expect(policies?.length).toBe(1)
    for (const policy of policies ?? []) {
      const script = policy.value.split(';').find((part) => part.trim().startsWith('script-src '))
      expect(script?.trim().split(/\s+/).slice(1)).toEqual([
        "'self'",
        "'unsafe-inline'",
        'data:',
        'https:',
        "'wasm-unsafe-eval'",
      ])
    }
  })
})
