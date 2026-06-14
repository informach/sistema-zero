import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { RootErrorFallback } from './ErrorViews'

const error = new Error('boom')

describe('RootErrorFallback — navegação é do host', () => {
  afterEach(cleanup)

  it('"Voltar aos projetos" chama reset() + onExit() (sem hardcodar navegação)', () => {
    const reset = mock(() => undefined)
    const onExit = mock(() => undefined)

    // Tenta espionar a navegação por URL — se passar a rodar de novo, o teste
    // pega. happy-dom pode não permitir reescrever; nesse caso a prova fica no
    // próprio contrato (o handler só chama reset()+onExit()).
    const assign = mock(() => undefined)
    const realAssign = window.location.assign
    let spiedAssign = false
    try {
      window.location.assign = assign as typeof window.location.assign
      spiedAssign = true
    } catch {
      // location.assign não é reescrevível neste ambiente — segue sem o spy.
    }

    try {
      const { getByRole } = render(
        <RootErrorFallback error={error} reset={reset} onExit={onExit} />,
      )
      fireEvent.click(getByRole('button', { name: 'Voltar aos projetos' }))

      expect(reset).toHaveBeenCalledTimes(1)
      expect(onExit).toHaveBeenCalledTimes(1)
      if (spiedAssign) expect(assign).not.toHaveBeenCalled()
    } finally {
      if (spiedAssign) window.location.assign = realAssign
    }
  })

  it('o botão "Voltar aos projetos" some quando o host não passa onExit', () => {
    const { queryByRole } = render(<RootErrorFallback error={error} reset={() => undefined} />)
    expect(queryByRole('button', { name: 'Voltar aos projetos' })).toBeNull()
    // O "Recarregar" continua disponível (último recurso sem callback do host).
    expect(queryByRole('button', { name: 'Recarregar' })).not.toBeNull()
  })
})
