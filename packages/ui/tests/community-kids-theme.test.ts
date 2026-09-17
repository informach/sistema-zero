import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '../../..')
const canonical = await Bun.file(
  join(ROOT, 'packages/ui/src/styles/community-kids-theme.css'),
).text()
const aliases = await Bun.file(join(ROOT, 'packages/ui/src/styles/theme-kids.css')).text()
const funnel = await Bun.file(join(ROOT, 'packages/funnel/src/styles/global.css')).text()
const platform = await Bun.file(join(ROOT, 'packages/community-kids/src/app/globals.css')).text()

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('identidade compartilhada da Comunidade Kids', () => {
  it('mantém os valores Pen em uma única fonte canônica', () => {
    expect(canonical).toContain('--sz-community-ground: #e9eef6')
    expect(canonical).toContain('--sz-community-action: #1b5cf3')
    expect(canonical).toContain('--sz-community-action-step: #1343b8')
    expect(canonical).toContain('--sz-community-menu: #121a30')
    expect(canonical).toContain('--sz-community-card-step: #b9c6d9')
  })

  it('faz os aliases kids importarem e apontarem para a fonte canônica', () => {
    expect(aliases.indexOf('@import "./community-kids-theme.css"')).toBe(0)
    expect(aliases).toContain('--sz-kids-creme: var(--sz-community-ground)')
    expect(aliases).toContain('--sz-kids-acao: var(--sz-community-action)')
    expect(aliases).toContain('--sz-kids-acao-degrau: var(--sz-community-action-step)')
  })

  it('faz plataforma e funil consumirem o mesmo contrato sem repetir os valores-base', () => {
    expect(platform).toContain('@import "@sistemazero/ui/theme-kids.css"')
    expect(platform).toContain('--pen-chao: var(--sz-community-ground)')
    expect(platform).toContain('--pen-acao: var(--sz-community-action)')
    expect(funnel).toContain('@import "@sistemazero/ui/theme-kids.css"')
    expect(funnel).toContain('--color-bg: var(--sz-community-ground)')
    expect(funnel).toContain('--color-lime: var(--sz-community-action)')

    const consumers = withoutComments(`${platform}\n${funnel}`)
    for (const duplicated of ['#e9eef6', '#1b5cf3', '#1343b8', '#121a30', '#b9c6d9']) {
      expect(consumers.toLowerCase()).not.toContain(duplicated)
    }
  })
})
