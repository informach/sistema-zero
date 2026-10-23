import { describe, expect, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AI_DISCLOSURE,
  AiCreditsPanel,
  CREDIT_USES,
} from '../src/components/community/profile/ai-credits-panel'
import { PublicProfileSettings } from '../src/components/community/public-profile-settings'

/**
 * Os créditos do Zappy e do Pensa em Meu perfil (20/10/2026): o que gasta crédito, o aviso de
 * transparência, a frase de "até renovar" uma vez só e o subtítulo fiel ao que a jornada liberou.
 */

const view = (over: Partial<AiCreditsView> = {}): AiCreditsView => ({
  unlimited: false,
  dayLimit: 10,
  dayRemaining: 6,
  monthLimit: 100,
  monthRemaining: 60,
  monthRenewsOn: '2026-11-01',
  ...over,
})

const RENEW = 'só sem o Zappy e o Pensa até renovar'
const count = (html: string, part: string) => html.split(part).length - 1

describe('painel de créditos', () => {
  test('diz o que gasta crédito, inclusive o Mural e o Pro, e traz o aviso de transparência', () => {
    const html = renderToStaticMarkup(<AiCreditsPanel credits={view()} />)
    expect(html).toContain(CREDIT_USES)
    expect(CREDIT_USES).toContain('A descrição automática ao publicar no Mural também usa')
    expect(CREDIT_USES).toContain('construir com o Zappy no modo Pro')
    expect(html).toContain(AI_DISCLOSURE)
    expect(AI_DISCLOSURE).toContain('assistentes virtuais')
    expect(count(html, RENEW)).toBe(1)
  })

  test('esgotado, o "até renovar" aparece uma vez só (no aviso)', () => {
    const html = renderToStaticMarkup(<AiCreditsPanel credits={view({ dayRemaining: 0 })} />)
    expect(html).toContain('Os créditos de hoje acabaram.')
    expect(count(html, RENEW)).toBe(1)
  })
})

describe('subtítulo de Créditos e voz', () => {
  const render = (pensaUnlocked: boolean) =>
    renderToStaticMarkup(
      <PublicProfileSettings
        initial={null}
        viewerId="viewer-1"
        readOnly={false}
        ai={{ credits: view(), voiceConfigured: false, pensaUnlocked }}
      />,
    )

  test('com o Pensa liberado, promete o Zappy e o Pensa', () => {
    expect(render(true)).toContain(
      'O Zappy, o tutor do Estúdio, e o Pensa já estão liberados na sua jornada. Aqui você vê quantos créditos restam.',
    )
  })

  test('sem o Pensa, não o promete', () => {
    const html = render(false)
    expect(html).toContain(
      'O Zappy, o tutor do Estúdio, já está liberado na sua jornada. Aqui você vê quantos créditos restam.',
    )
    expect(html).not.toContain('e o Pensa já estão liberados')
  })
})
