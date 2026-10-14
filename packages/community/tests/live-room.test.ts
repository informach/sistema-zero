import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A sala da oficina ao vivo na comunidade adulta (cursos ao vivo, 14/10/2026). O navegador aplica
 * os cabeçalhos do PRIMEIRO documento: a câmera, o microfone, a tela e o quadro da prévia são
 * liberados SÓ na rota da sala, que se abre e se deixa por navegação completa (`<a>`).
 */

interface ConfigComHeaders {
  headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>
}

async function headersFor(source: string) {
  const config = (await import('../next.config')).default as ConfigComHeaders
  const all = (await config.headers?.()) ?? []
  // A regra que vem DEPOIS vence a chave repetida: a última de cada chave é a que vale.
  const map = new Map<string, string>()
  for (const entry of all)
    if (entry.source === source)
      for (const header of entry.headers) map.set(header.key, header.value)
  return map
}

describe('a sala ao vivo da comunidade adulta', () => {
  test('câmera, microfone, tela e o quadro do R2 só na rota da sala', async () => {
    const sala = await headersFor('/oficinas/aulas/:id')
    expect(sala.get('Permissions-Policy')).toBe(
      'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
    )
    expect(sala.get('Content-Security-Policy')).toContain(
      "frame-src 'self' blob: https://*.r2.cloudflarestorage.com",
    )
    // O resto do app segue fechado.
    const geral = await headersFor('/:path*')
    expect(geral.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
    expect(geral.get('Content-Security-Policy')).not.toContain('r2.cloudflarestorage.com')
  })

  test('as rotas da sala existem: oficinas, sala, BFF, prévia e fundos da câmera', () => {
    for (const file of [
      'src/app/(app)/oficinas/page.tsx',
      'src/app/(app)/oficinas/aulas/[id]/page.tsx',
      'src/app/api/live/[...path]/route.ts',
      'src/app/api/live/sessions/[id]/preview/route.ts',
      'src/app/api/live/camera-assets/[asset]/route.ts',
    ])
      expect(existsSync(join(import.meta.dir, '..', file))).toBe(true)
    const proxy = readFileSync(join(import.meta.dir, '..', 'src/proxy.ts'), 'utf8')
    expect(proxy).toMatch(/protectedPrefixes:\s*\[[^\]]*'\/oficinas'/s)
  })

  test('a página das oficinas usa a pele adulta (sem as classes do Kids)', () => {
    const page = readFileSync(
      join(import.meta.dir, '..', 'src/app/(app)/oficinas/page.tsx'),
      'utf8',
    )
    expect(page).toContain('skin="adult"')
  })
})
