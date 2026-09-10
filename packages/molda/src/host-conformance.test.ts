/**
 * Conformidade com o HOST: o que precisa existir fora deste pacote para o
 * Molda chegar em staging/prod. Lê os arquivos do monorepo por texto (sem
 * importar nada de outro pacote).
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

  test('kids depende do pacote, transpila e importa o CSS com fontes próprias da UI', () => {
    const pkg = JSON.parse(read('packages/community-kids/package.json')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@sistemazero/molda']).toBe('workspace:*')
    expect(read('packages/community-kids/next.config.ts')).toContain("'@sistemazero/molda'")
    const css = read('packages/community-kids/src/app/globals.css')
    expect(css).toContain('@import "../../../molda/src/styles/molda.css";')
    expect(css).not.toContain('@source "../../../molda/src";')
    const moldaCss = read('packages/molda/src/styles/molda.css')
    expect(moldaCss).toContain('@source "../components";')
    expect(moldaCss).toContain('@source not "../components/**/*.test.{ts,tsx}";')
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
    const nav = read('packages/community-kids/src/components/kids/nav.ts')
    // The host groups creative tools under Criar; keep the complete discovery path covered.
    expect(nav).toContain("href: '/criar'")
    expect(nav).toContain("'/molda'")
    // Desde o redesenho do kids (10/09) nome, atalho, ícone e cor de cada oficina moram
    // num mapa só, `TOOL_SIGNATURE`, e a página Criar o consome.
    expect(read('packages/community-kids/src/lib/tool-signature.ts')).toMatch(
      /molda:\s*\{[^}]*href:\s*'\/molda'/,
    )
    expect(read('packages/community-kids/src/app/(app)/criar/page.tsx')).toContain('TOOL_SIGNATURE')
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

/**
 * ⚠️⚠️ A suíte roda em TRÊS processos (`test:1`..`test:3`), e não num só. O motivo é medido:
 * num processo só ela abre e fecha ~148 Workers, e o Bun 1.3.11 do Linux SEGFAULTA no
 * desmonte deles (`panic: Segmentation fault`, SIGILL/132) por volta de 85% da execução,
 * enquanto os 22 pacotes disputam dois núcleos no runner. Reproduziu em quatro execuções
 * seguidas do CI, em dois commits diferentes, com o mesmo endereço de falha.
 *
 * O preço de dividir é este teste: lote que esquece um diretório NÃO reprova sozinho, ele
 * simplesmente deixa de rodar, e o verde passa a ser falso. Aqui a conta é fechada: tudo o
 * que existe em `src` precisa estar em exatamente um dos lotes.
 */
test('os lotes de teste cobrem TODO o src, sem sobra e sem repetição', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(import.meta.dir, '../package.json'), 'utf8'),
  ) as {
    scripts: Record<string, string>
  }
  const shards = ['test:1', 'test:2', 'test:3']
  expect(manifest.scripts.test).toBe(shards.map((name) => `bun run ${name}`).join(' && '))
  const covered = shards.flatMap((name) => {
    const script = manifest.scripts[name] ?? ''
    // O teto de 20 s é do PACOTE, não de um teste: o runner divide dois núcleos com 21
    // outros pacotes, e o padrão de 5 s reprovava o teste mais pesado por inanição.
    expect(script.startsWith('bun test --timeout 20000 ')).toBe(true)
    return script.slice('bun test --timeout 20000 '.length).trim().split(/\s+/)
  })
  expect(covered.length).toBe(new Set(covered).size)
  const present = readdirSync(resolve(import.meta.dir, '.'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || /\.test\.tsx?$/.test(entry.name))
    .map((entry) => `src/${entry.name}`)
  expect(covered.slice().sort()).toEqual(present.slice().sort())
})
