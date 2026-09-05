/**
 * Conformidade com o HOST: o que precisa existir fora deste pacote para o
 * Molda chegar em staging/prod. Lê os arquivos do monorepo por texto (sem
 * importar nada de outro pacote).
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '../../..')

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

describe('host kids', () => {
  test('railway.json do kids vigia o pacote', () => {
    expect(read('packages/community-kids/railway.json')).toContain('/packages/molda/**')
  })

  test('ci.yml mapeia packages/molda para o deploy do kids', () => {
    const ci = read('.github/workflows/ci.yml')
    expect(ci).toMatch(/packages\/molda\/\*\)[^\n]*add community-kids/)
  })

  test('kids depende do pacote, transpila e importa o CSS + @source', () => {
    const pkg = JSON.parse(read('packages/community-kids/package.json')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@sistemazero/molda']).toBe('workspace:*')
    expect(read('packages/community-kids/next.config.ts')).toContain("'@sistemazero/molda'")
    const css = read('packages/community-kids/src/app/globals.css')
    expect(css).toContain('@import "../../../molda/src/styles/molda.css";')
    expect(css).toContain('@source "../../../molda/src";')
    // Todo @import antes de qualquer @source (regra do Tailwind v4). Só as LINHAS
    // de diretiva contam: os comentários do arquivo também falam de "@import".
    const lines = css.split('\n')
    let lastImport = -1
    lines.forEach((line, index) => {
      if (line.startsWith('@import ')) lastImport = index
    })
    const firstSource = lines.findIndex((line) => line.startsWith('@source '))
    expect(firstSource).toBeGreaterThan(-1)
    expect(lastImport).toBeLessThan(firstSource)
  })

  test('kids resolve Molda e Estúdio pela mesma cópia do Three.js', () => {
    const config = read('packages/community-kids/next.config.ts')
    expect(config).toContain("resolveAlias: { three: './node_modules/three' }")
    expect(config).toContain('three: threePackageRoot')
  })

  test('sidebar desktop rola os links sem esconder o rodapé', () => {
    const sidebar = read('packages/community-kids/src/components/kids/app-sidebar.tsx')
    expect(sidebar).toContain('min-h-0 flex-1 flex-col')
    expect(sidebar).toContain('overflow-y-auto overscroll-contain')
    expect(sidebar).toContain("'shrink-0'")
  })

  test('rota, proxy e prefixo embarcado', () => {
    expect(existsSync(resolve(ROOT, 'packages/community-kids/src/app/(app)/molda/page.tsx'))).toBe(
      true,
    )
    expect(read('packages/community-kids/src/proxy.ts')).toContain("'/molda'")
    expect(read('packages/community-kids/src/lib/embedded-app-path.ts')).toContain("'/molda'")
    expect(read('packages/community-kids/src/components/kids/nav.ts')).toContain("href: '/molda'")
  })
})

describe('member-shell e catálogo', () => {
  test('portão de carreira e refs de acesso', () => {
    expect(read('packages/member-shell/src/lib/studio-tier.ts')).toContain(
      'THREE_D_CREATION_MIN_LEVEL',
    )
    const clients = read('packages/member-shell/src/server/clients.ts')
    expect(clients).toContain("MOLDA_ACCESS_REF = 'molda'")
    expect(clients).toContain('checkMoldaAccessReadonly')
  })

  test('seed do catálogo tem o produto molda', () => {
    expect(read('packages/catalog/scripts/seed.ts')).toContain("MOLDA_SKU = 'molda'")
  })
})

describe('documentação executável', () => {
  test('o plano separa testes unitários do Playwright', () => {
    const plan = read('docs/plans/2026-09-04-molda-design.md')
    expect(plan).toContain('bun run typecheck && bun test src && bun run check')
    expect(plan).not.toContain('bun run typecheck && bun test && bun run check')
  })
})
