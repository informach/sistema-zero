import { describe, expect, test } from 'bun:test'
import path from 'node:path'
import { classicShellUrlFromEnv } from '@sistemazero/core/studio/classic-shell'

/**
 * A casca da prévia do Clássico em outro site (etapa 4 da missão do Estúdio) mora no
 * studio-runtime (`classicShellUrlFromEnv`), e a origem dele já entra em todo `frame-src` pelo
 * `withStudioPublishedProCsp` (o jogo Pro publicado). Este teste trava essa dependência: com a
 * chave ligada, a origem da URL que o layout entrega ao Estúdio aparece UMA vez em cada regra que
 * leva CSP (a geral, a do Pro, a do Arquipélago), nos dois apps. Sem isso a casca seria recusada
 * pelo navegador e a prévia cairia no modo de sempre depois do prazo.
 *
 * O `next.config.ts` lê o ambiente ao ser importado, e o módulo fica em cache no processo do
 * `bun test`; por isso o cenário roda num processo próprio, com o ambiente dele.
 */

const RUNTIME = 'https://sistemazero-studio-runtime-staging.example.workers.dev'
const CONFIGS = [
  path.join(import.meta.dir, '..', 'next.config.ts'),
  path.join(import.meta.dir, '..', '..', 'community', 'next.config.ts'),
]

async function frameSrcs(config: string, env: Record<string, string>): Promise<string[]> {
  const script = `
    const mod = await import(${JSON.stringify(config)})
    const rules = await mod.default.headers()
    const out = []
    for (const rule of rules) {
      for (const header of rule.headers) {
        if (header.key !== 'Content-Security-Policy') continue
        const frame = header.value.split(';').map((p) => p.trim()).find((p) => p.startsWith('frame-src'))
        if (frame) out.push(rule.source + ' => ' + frame)
      }
    }
    console.log(JSON.stringify(out))
  `
  const base = { ...process.env }
  delete base.STUDIO_CLASSIC_SHELL_ENABLED
  delete base.STUDIO_PRO_RUNTIME_URL
  const proc = Bun.spawn([process.execPath, '-e', script], {
    env: { ...base, NODE_ENV: 'production', ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(`next.config falhou (${code}): ${stderr}`)
  const lines = stdout.trim().split('\n')
  return JSON.parse(lines[lines.length - 1] ?? '[]') as string[]
}

describe('a origem da casca no frame-src', () => {
  const env = { STUDIO_CLASSIC_SHELL_ENABLED: '1', STUDIO_PRO_RUNTIME_URL: `${RUNTIME}/` }
  const shell = classicShellUrlFromEnv(env)

  test('a URL da casca nasce do runtime configurado', () => {
    expect(shell).toBe(`${RUNTIME}/v1/classic-shell/1.html`)
  })

  for (const config of CONFIGS) {
    const app = path.basename(path.dirname(config))

    test(`${app}: a origem da casca aparece uma vez em toda regra com CSP`, async () => {
      const origin = new URL(shell ?? '').origin
      const frames = await frameSrcs(config, env)
      // Anti-vácuo: a geral, a do Pro e a do Arquipélago, no mínimo.
      expect(frames.length).toBeGreaterThanOrEqual(3)
      for (const frame of frames) {
        expect(frame.split(' ').filter((token) => token === origin)).toHaveLength(1)
      }
    }, 30_000)
  }
})
