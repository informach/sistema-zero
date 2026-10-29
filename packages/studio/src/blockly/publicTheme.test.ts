import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_COLORS, ensureWhiteTextContrast, szThemeFor } from './publicTheme'

const raiz = join(import.meta.dir, '../..')

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(e.name) ? [caminho] : []
  })
}

/**
 * O Estúdio é a ferramenta geral da plataforma e não conhece jogo nenhum (29/10/2026): o editor da
 * rotina dos Lumis mora no member-shell e pede daqui só o visual do Blockly.
 */
describe('visual do Blockly para outras ferramentas', () => {
  test('a entrada traz o tema, as cores e o contraste', () => {
    expect(typeof szThemeFor).toBe('function')
    expect(typeof ensureWhiteTextContrast).toBe('function')
    expect(Object.keys(CATEGORY_COLORS).length).toBeGreaterThan(0)
  })

  test('o Estúdio não depende de pacote do jogo', () => {
    const manifesto = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')) as Record<
      string,
      Record<string, string> | undefined
    >
    for (const campo of ['dependencies', 'devDependencies', 'peerDependencies'])
      for (const nome of Object.keys(manifesto[campo] ?? {}))
        expect([campo, nome.startsWith('@sistemazero/arquipelago')]).toEqual([campo, false])
    const importam = arquivos(join(raiz, 'src')).filter((f) =>
      /from '@sistemazero\/arquipelago/.test(readFileSync(f, 'utf8')),
    )
    expect(importam).toEqual([])
  })
})
