import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { UserAvatar } from '../src/components/user-avatar'

describe('UserAvatar sobre menu escuro', () => {
  test('as iniciais no menu usam a cor clara da casa com a tinta do menu', () => {
    const html = renderToStaticMarkup(<UserAvatar firstName="Helena" tone="menu" />)
    expect(html).toContain('bg-(--band-amarelo)')
    expect(html).toContain('text-(--menu)')
    expect(html).not.toContain('bg-primary/15')
  })

  test('fora do menu, o círculo de sempre; com foto, a foto', () => {
    expect(renderToStaticMarkup(<UserAvatar firstName="Helena" />)).toContain('bg-primary/15')
    expect(
      renderToStaticMarkup(
        <UserAvatar firstName="Helena" avatarUrl="https://x/a.png" tone="menu" />,
      ),
    ).toContain('<img')
  })
})
