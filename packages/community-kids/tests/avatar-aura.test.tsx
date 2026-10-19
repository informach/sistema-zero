import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarWithAura } from '../src/components/kids/avatar-with-aura'
import { LEVEL_ORDER } from '../src/lib/level-info'

/**
 * A aura do nível voltou (19/10/2026, pedido dela, junto com o anel da etapa no adulto): a cor do
 * nível em volta da foto, como sombra no próprio avatar.
 */
describe('AvatarWithAura', () => {
  test('com o nível, o anel na cor dele; a forma do className continua (sombra segue o raio)', () => {
    const html = renderToStaticMarkup(
      <AvatarWithAura
        photoUrl="https://cdn.exemplo/lia.png"
        name="Lia"
        levelSlug="hacker"
        size="xl"
        className="rounded-[1.5rem]"
        label="Avatar de Lia"
      />,
    )
    expect(html).toContain('kids-aura kids-aura-xl')
    expect(html).toContain('rounded-[1.5rem]')
    expect(html).toContain('--kids-aura-cor:var(--level-hacker)')
    expect(html).toContain('aria-label="Avatar de Lia"')
  })

  test('sem nível, ou com um nível que este app não conhece, sem anel', () => {
    for (const levelSlug of [undefined, null, 'nivel-novo-do-servidor']) {
      const html = renderToStaticMarkup(
        <AvatarWithAura photoUrl={null} name="Lia" levelSlug={levelSlug} />,
      )
      expect(html).not.toContain('kids-aura')
      expect(html).not.toContain('--kids-aura-cor')
    }
  })

  test('todo nível tem a cor no globals.css, e o anel tem regra por tamanho', () => {
    const css = readFileSync(join(import.meta.dir, '..', 'src', 'app', 'globals.css'), 'utf8')
    for (const slug of LEVEL_ORDER) expect(css).toContain(`--level-${slug}:`)
    for (const rule of ['.kids-aura {', '.kids-aura-sm {', '.kids-aura-lg {', '.kids-aura-xl {'])
      expect(css).toContain(rule)
    // No vidro do herói, o fio de dentro do vidro continua junto com o anel.
    expect(css).toContain('.kids-aura.kids-marca-vidro {')
  })
})
