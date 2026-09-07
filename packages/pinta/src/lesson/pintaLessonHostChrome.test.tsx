/**
 * O bloco de AULA nunca mostra o chrome do host (07/09/2026): mesmo que um host embrulhe o
 * `<PintaLesson>` no `PintaHostChromeProvider`, o editor da aula não desenha o botão do menu
 * nem o selo — o desenho é a tela inteira do bloco, e o menu da comunidade não é dele.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { createPixelSpriteAsset } from '../core/project'
import type { PintaHostChrome } from '../core/types'
import { clearIdbMock } from '../testing/idbMock'

const { PintaLesson } = await import('./PintaLesson')
const { PintaHostChromeProvider } = await import('../components/hostChrome')
const { setPintaStorageNamespace } = await import('../state/persistence')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

describe('<PintaLesson> × chrome do host', () => {
  it('embrulhado no Provider, a aula continua sem menu e sem selo', async () => {
    const chrome: PintaHostChrome = {
      menu: { hidden: false, label: 'Esconder menu', onToggle: () => {} },
      status: {
        tone: 'ok',
        icon: 'cloud',
        label: 'Guardado na sua conta',
        text: 'Guardado na sua conta',
      },
    }
    render(
      <PintaHostChromeProvider value={chrome}>
        <PintaLesson initialAsset={createPixelSpriteAsset({ name: 'nave', frameSize: 32 })} />
      </PintaHostChromeProvider>,
    )
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.a11y.tools })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByText(/na sua conta/)).toBeNull()
  })
})
