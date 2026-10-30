import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SeasonalAvatarChoices } from '../src/components/cosmetics/avatar3d/seasonal-choices'
import type { AvatarPartView } from '../src/lib/types'

const mascara: AvatarPartView = {
  id: 'face-08',
  category: 'faceDecor',
  tier: 'coins',
  price: 37,
  owned: false,
  locked: true,
}
test('sugestão usa só catálogo recebido e seu preço real, sem inventar posse ou completar peça ausente', () => {
  const html = renderToStaticMarkup(
    <SeasonalAvatarChoices
      festa="carnaval"
      parts={[mascara]}
      disabled={false}
      onSelect={() => {
        throw Error('Render não deve selecionar nem comprar')
      }}
    />,
  )
  expect(html).toContain('Máscara · 37 moedas')
  expect(html).not.toContain('Coroa de flores')
  expect(html).not.toContain('aria-pressed="true"')
  expect(
    renderToStaticMarkup(
      <SeasonalAvatarChoices festa="carnaval" parts={[]} disabled={false} onSelect={() => {}} />,
    ),
  ).toBe('')
  expect(
    renderToStaticMarkup(
      <SeasonalAvatarChoices
        festa="carnaval"
        parts={[{ ...mascara, category: 'head' }]}
        disabled={false}
        onSelect={() => {}}
      />,
    ),
  ).toBe('')
})
test('peça possuída não pede moedas; operação em voo bloqueia a seleção', () => {
  const html = renderToStaticMarkup(
    <SeasonalAvatarChoices
      festa="carnaval"
      parts={[{ ...mascara, owned: true, locked: false }]}
      disabled
      onSelect={() => {}}
    />,
  )
  expect(html).toContain('disabled=""')
  expect(html).toContain('Máscara')
  expect(html).not.toContain('37 moedas')
})
