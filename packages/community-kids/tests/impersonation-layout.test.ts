import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const appLayout = readFileSync(new URL('../src/app/(app)/layout.tsx', import.meta.url), 'utf8')
const profilesPage = readFileSync(new URL('../src/app/perfis/page.tsx', import.meta.url), 'utf8')

describe('abrangência do banner de impersonação no Kids', () => {
  test('o layout identifica a criança pelo perfil ativo, não pelo responsável', () => {
    expect(appLayout).toContain('session.activeProfile?.name ??')
  })

  test('a grade /perfis usa a credencial do aparelho e nunca a sessão de suporte para liberar irmãos', () => {
    expect(profilesPage).toContain('shell.study.recognize()')
    expect(profilesPage).toContain('if (session?.act)')
    expect(profilesPage).toContain('<SupportProfileSelector')
    expect(appLayout).toContain("if (session.act && !session.activeProfile) redirect('/perfis')")
  })
})
