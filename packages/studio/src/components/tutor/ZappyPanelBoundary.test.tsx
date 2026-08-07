import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX } from 'react'
import { useEffect } from 'react'
import type { StudioLayout } from '../../studio/layoutContext'
import { StudioLayoutProvider } from '../../studio/layoutContext'
import type { StudioTutorAdapter, StudioTutorConfig } from '../../studio/tutor'
import { StudioTutorProvider, useStudioTutor } from '../../studio/tutor'
import { ErrorBoundary } from '../../ui-internal/ErrorBoundary'

/**
 * A promessa que este arquivo guarda é UMA: **um erro do Zappy não derruba o
 * Estúdio.**
 *
 * Era o que acontecia até 08/2026 — o `<ZappyPanel />` era montado no `Shell`
 * sem boundary própria, então qualquer throw dele subia até a raiz e trocava a
 * IDE inteira pela tela "Algo deu errado", com o jogo da criança fora do ar por
 * causa de uma conversa.
 *
 * ⚠️ O teste NÃO usa o `ZappyPanelBoundary` real de propósito: ele monta o
 * `ZappyPanel`, que precisa de adapter, stores e rede. O que precisa ser
 * provado é a MECÂNICA de contenção — que o irmão ao lado sobrevive — e ela é
 * a mesma. O fio real (Shell → boundary → painel) é coberto pelo typecheck e
 * pela verificação em navegador.
 */

const WIDE: StudioLayout = { width: 1000, isNarrow: false, isCompact: false }

const adapter: StudioTutorAdapter = {
  loadHistory: async () => ({ messages: [], nextCursor: null }),
  deleteHistory: async () => {},
  ask: async () => {
    throw new Error('não deveria ser chamado')
  },
  feedback: async () => {},
}

function Explode(): JSX.Element {
  // O erro EXATO que a dona viu na tela.
  throw new Error("Cannot read properties of undefined (reading 'length')")
}

/** O "resto da IDE": prova viva de que o crash ficou contido no painel. */
function RestoDaIde(): JSX.Element {
  return <p>o editor continua aqui</p>
}

function Cena({ quebrar, aberto = true }: { quebrar: boolean; aberto?: boolean }): JSX.Element {
  const config: StudioTutorConfig = { adapter }
  return (
    <StudioLayoutProvider value={WIDE}>
      <StudioTutorProvider value={config}>
        <RestoDaIde />
        {aberto ? <TutorAberto /> : null}
        <ErrorBoundary
          label="zappy"
          fallback={({ reset }) =>
            // Espelha a guarda do ZappyPanelBoundary: fechado, o erro fica
            // contido em SILÊNCIO — nada aparece por cima do editor.
            aberto ? (
              <div role="alert">
                <p>O Zappy tropeçou aqui</p>
                <button type="button" onClick={reset}>
                  Tentar de novo
                </button>
              </div>
            ) : null
          }
        >
          {quebrar ? <Explode /> : <p>painel do zappy</p>}
        </ErrorBoundary>
      </StudioTutorProvider>
    </StudioLayoutProvider>
  )
}

function TutorAberto(): null {
  const { setOpen } = useStudioTutor()
  useEffect(() => setOpen(true), [setOpen])
  return null
}

afterEach(() => {
  cleanup()
})

describe('o Zappy não pode derrubar o Estúdio', () => {
  it('um erro do tutor fica CONTIDO: o resto da IDE segue de pé', () => {
    // O React loga o erro capturado; silenciar mantém a saída do teste legível.
    const quiet = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const view = render(<Cena quebrar />)

      // O recado é do painel, em linguagem de criança…
      expect(view.getByRole('alert').textContent).toContain('O Zappy tropeçou aqui')
      // …e o editor NÃO sumiu junto. Este expect é a promessa inteira.
      expect(view.getByText('o editor continua aqui')).toBeTruthy()
    } finally {
      quiet.mockRestore()
    }
  })

  it('"Tentar de novo" limpa o erro sem recarregar a página', () => {
    const quiet = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const view = render(<Cena quebrar={false} />)
      expect(view.getByText('painel do zappy')).toBeTruthy()

      view.rerender(<Cena quebrar />)
      expect(view.getByRole('alert')).toBeTruthy()

      // Volta ao normal e o botão devolve o painel — sem F5, sem perder o jogo.
      view.rerender(<Cena quebrar={false} />)
      fireEvent.click(view.getByRole('button', { name: 'Tentar de novo' }))
      expect(view.getByText('painel do zappy')).toBeTruthy()
    } finally {
      quiet.mockRestore()
    }
  })
  it('com o tutor FECHADO o erro fica em silêncio, sem abrir painel nenhum', () => {
    // ⚠️ O ZappyPanel só devolve `null` DEPOIS de rodar os hooks dele, então ele
    // consegue lançar com o painel fechado. Sem a guarda, o fallback abria um
    // painel grande por cima do editor que a criança nunca pediu — pior que o
    // silêncio, porque vira um susto sem causa visível.
    const quiet = spyOn(console, 'error').mockImplementation(() => {})
    try {
      const view = render(<Cena quebrar aberto={false} />)
      expect(view.queryByRole('alert')).toBeNull()
      expect(view.queryByText('O Zappy tropeçou aqui')).toBeNull()
      expect(view.getByText('o editor continua aqui')).toBeTruthy()
    } finally {
      quiet.mockRestore()
    }
  })
})
