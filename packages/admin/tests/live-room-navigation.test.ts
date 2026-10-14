import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * C1 do review das oficinas (14/10/2026): o navegador aplica os cabeçalhos do PRIMEIRO documento.
 * Chegando à sala pelo `<Link>` do Next, a professora ficava sem câmera e sem microfone (aula
 * muda) e sem o frame do R2 da prévia. Dois freios: a política geral do painel libera os
 * aparelhos e todo caminho até a sala é navegação completa.
 */

interface ConfigComHeaders {
  headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>
}

async function headersFor(source: string) {
  const config = (await import('../next.config')).default as ConfigComHeaders
  const all = (await config.headers?.()) ?? []
  return all.filter((entry) => entry.source === source).flatMap((entry) => entry.headers)
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : []
  })
}

describe('a sala da professora recebe câmera, microfone e a prévia', () => {
  test('a política geral do painel libera câmera, microfone e tela para a própria origem', async () => {
    const policy = (await headersFor('/:path*')).find((h) => h.key === 'Permissions-Policy')
    expect(policy?.value).toContain('camera=(self)')
    expect(policy?.value).toContain('microphone=(self)')
    expect(policy?.value).toContain('display-capture=(self)')
    expect(policy?.value).toContain('geolocation=()')
  })

  test('a sala e a demonstração continuam com o frame do R2 da prévia', async () => {
    for (const source of ['/admin/professor/ao-vivo/:id', '/ao-vivo/demonstracao/:id']) {
      const csp = (await headersFor(source)).find((h) => h.key === 'Content-Security-Policy')
      expect(csp?.value).toContain("frame-src 'self' blob: https://*.r2.cloudflarestorage.com")
    }
    const geral = (await headersFor('/:path*')).find((h) => h.key === 'Content-Security-Policy')
    expect(geral?.value).not.toContain("frame-src 'self' blob: https://*.r2")
  })

  test('nenhum <Link> do painel aponta para a sala de um encontro', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(join(import.meta.dir, '..', 'src'))) {
      const text = readFileSync(file, 'utf8')
      if (!text.includes("from 'next/link'")) continue
      // <Link ... href={`/admin/professor/ao-vivo/${...}`}> ou href={roomHref(...)}
      const links = text.match(/<Link\b[^>]*>/gs) ?? []
      for (const tag of links)
        if (/professor\/ao-vivo\/\$\{|roomHref\(/.test(tag)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  test('a agenda e a configuração das oficinas entram na sala por <a href>', () => {
    for (const file of [
      'src/app/admin/professor/ao-vivo/agenda-client.tsx',
      'src/app/admin/oficinas/workshops-admin.tsx',
    ]) {
      const text = readFileSync(join(import.meta.dir, '..', file), 'utf8')
      expect(text).toMatch(/<a\s[^>]*href=\{roomHref\(/s)
    }
  })
})
