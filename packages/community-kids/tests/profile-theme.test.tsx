import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { ProfileThemeProvider, useProfileTheme } from '../src/components/kids/profile-theme'

/**
 * "Mudar tema" no Kids: a preferência é do PERFIL e vive no servidor, e o next-themes só a
 * aplica no documento. A regressão que este teste guarda (12/09/2026 a 14/09/2026) era um laço:
 * o `setTheme` do next-themes é um `useCallback` com o tema ATUAL na dependência, então a
 * identidade dele muda a cada troca. Estando nas deps do efeito de carga, aplicar o Pink
 * reexecutava o efeito, que reiniciava o tema para o Padrão, que recarregava o Pink do servidor,
 * e assim por diante: as cores piscavam e cada volta gastava um GET, até o limite de 60/min do
 * gateway devolver 429 e a criança ler "Não consegui carregar o tema do seu perfil.".
 *
 * ⚠️ O `ThemeProvider` aqui é o REAL, de propósito: um fake com `setTheme` estável não morde,
 * porque a identidade instável é justamente o que a biblioteca traz e o defeito inteiro.
 */

const originalFetch = globalThis.fetch
const descritorMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

/**
 * ⚠️ O `matchMedia` é NOSSO, e restaurado no fim. happy-dom não o implementa, então outros
 * arquivos da suíte instalam o deles no escopo do MÓDULO e sem devolver o original: o de
 * `main-container.test.tsx` vaza para quem roda depois e não tem o `addListener` LEGADO que o
 * next-themes ainda chama. Sem instalar o nosso, este arquivo passa sozinho e reprova na suíte
 * inteira por ORDEM DE ARQUIVOS, que é o pior tipo de vermelho (verde local, vermelho no CI).
 */
function instalarMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string) => ({
      media,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

let gets = 0
let puts = 0
let salvoNoServidor: 'padrao' | 'pink' = 'padrao'

function servidorDeTema(inicial: 'padrao' | 'pink' = 'padrao') {
  gets = 0
  puts = 0
  salvoNoServidor = inicial
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).startsWith('/api/members/preferences')) return Response.json({})
      if (init?.method === 'PUT') {
        puts += 1
        salvoNoServidor = JSON.parse(String(init.body)).theme
        return Response.json({ theme: salvoNoServidor })
      }
      gets += 1
      return Response.json({ theme: salvoNoServidor })
    }),
    { preconnect: originalFetch.preconnect },
  )
}

/**
 * Servidor que só responde quando mandarmos. O reinício otimista existe para a JANELA entre montar
 * e o GET chegar, então só dá para cobrá-lo segurando a resposta: olhar o estado final aprova até
 * quem não reinicia nada (foi o que este arquivo fez numa primeira versão, e a mutação denunciou).
 */
function servidorSuspenso(tema: 'padrao' | 'pink') {
  let liberar: () => void = () => {}
  const espera = new Promise<void>((resolve) => {
    liberar = resolve
  })
  globalThis.fetch = Object.assign(
    mock(async () => {
      await espera
      return Response.json({ theme: tema })
    }),
    { preconnect: originalFetch.preconnect },
  )
  return async () => {
    liberar()
    await deixarAssentar(2)
  }
}

/** Servidor fora do ar: é o que a criança encontrou quando o laço estourou o limite do gateway. */
function servidorQueRecusa() {
  gets = 0
  puts = 0
  globalThis.fetch = Object.assign(
    mock(async () => {
      gets += 1
      return Response.json(
        { error: { code: 'RATE_LIMITED', message: 'Muitos pedidos.' } },
        { status: 429 },
      )
    }),
    { preconnect: originalFetch.preconnect },
  )
}

/** Deixa o laço girar, se existir: cada volta dele depende de uma resposta do servidor. */
async function deixarAssentar(voltas = 5) {
  for (let i = 0; i < voltas; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

const temaNoDocumento = () => document.documentElement.getAttribute('data-tema')

/** A SEQUÊNCIA de temas que a tela mostrou: é nela que um piscar aparece. */
function gravarTemasAplicados() {
  const vistos: string[] = []
  const observador = new MutationObserver(() => {
    vistos.push(temaNoDocumento() ?? 'nenhum')
  })
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-tema'],
  })
  return { vistos, parar: () => observador.disconnect() }
}

/** Espelha o que o `user-menu.tsx` desenha: o botão, o recado e o "Tentar novamente". */
function BotaoDeTema() {
  const tema = useProfileTheme()
  return (
    <>
      <button
        type="button"
        onClick={() => void tema?.toggle()}
        disabled={!tema || tema.busy || Boolean(tema.error)}
      >
        Mudar tema
      </button>
      {tema?.error && (
        <>
          <p role="alert">{tema.error}</p>
          <button type="button" onClick={tema.retry}>
            Tentar novamente
          </button>
        </>
      )}
    </>
  )
}

function montar(viewerId = 'perfil-1') {
  render(
    <ThemeProvider
      attribute="data-tema"
      themes={['padrao', 'pink']}
      defaultTheme="padrao"
      storageKey="sz-kids-tema"
      enableSystem={false}
      enableColorScheme={false}
    >
      <ProfileThemeProvider viewerId={viewerId}>
        <BotaoDeTema />
      </ProfileThemeProvider>
    </ThemeProvider>,
  )
  return screen.getByRole('button', { name: 'Mudar tema' }) as HTMLButtonElement
}

/** O botão só libera quando a primeira carga termina (`busy` começa ligado). */
async function montarCarregado(viewerId = 'perfil-1') {
  const botao = montar(viewerId)
  await waitFor(() => expect(botao.disabled).toBe(false))
  return botao
}

beforeEach(() => {
  instalarMatchMedia()
  localStorage.clear()
  document.documentElement.removeAttribute('data-tema')
})

afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
  document.documentElement.removeAttribute('data-tema')
  if (descritorMatchMedia) Object.defineProperty(window, 'matchMedia', descritorMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
})

describe('ProfileThemeProvider', () => {
  it('a troca para o Pink fica na tela e não volta sozinha para o Padrão', async () => {
    servidorDeTema('padrao')
    const botao = await montarCarregado()
    expect(gets).toBe(1)
    expect(temaNoDocumento()).toBe('padrao')

    await act(async () => {
      fireEvent.click(botao)
    })
    // Sem `waitFor` de propósito: com o laço o tema PISCA, então esperar por "pink" acabaria
    // pegando uma das voltas e escondendo o defeito atrás de um timeout. As voltas só andam
    // quando o servidor responde, então alguns ciclos de macrotask bastam para o caso bom.
    await deixarAssentar()
    expect(temaNoDocumento()).toBe('pink')
    expect(puts).toBe(1)
    // O laço relia o servidor a cada volta. Trocar de tema não precisa de GET nenhum.
    expect(gets).toBe(1)
    expect(botao.disabled).toBe(false)
  })

  it('o Pink guardado no perfil abre aplicado, sem piscar', async () => {
    servidorDeTema('pink')
    const botao = await montarCarregado()

    await deixarAssentar()
    expect(temaNoDocumento()).toBe('pink')
    expect(gets).toBe(1)
    expect(botao.disabled).toBe(false)
  })

  it('voltar para a janela relê o tema do perfil (o irmão pode ter trocado)', async () => {
    servidorDeTema('padrao')
    await montarCarregado()
    expect(gets).toBe(1)

    expect(temaNoDocumento()).toBe('padrao')

    salvoNoServidor = 'pink'
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => expect(temaNoDocumento()).toBe('pink'))
    expect(gets).toBe(2)
  })

  it('recarregar a página de quem usa o Pink não pisca azul no caminho', async () => {
    // O script sem flash do next-themes já aplicou o Pink guardado antes da hidratação, e o dono
    // dele é este mesmo perfil: reiniciar no Padrão aqui jogaria a tela para o azul até o GET
    // responder (medido: a sequência era padrao → pink em TODO F5).
    localStorage.setItem('sz-kids-tema', 'pink')
    localStorage.setItem('sz:kids:tema-dono', 'perfil-1')
    servidorDeTema('pink')
    const gravacao = gravarTemasAplicados()

    await montarCarregado()
    await deixarAssentar()
    gravacao.parar()

    expect(temaNoDocumento()).toBe('pink')
    expect(gravacao.vistos).not.toContain('padrao')
  })

  it('o tema do IRMÃO não fica na tela enquanto o perfil novo carrega', async () => {
    // Mesmo navegador, perfil novo: o Pink guardado é do irmão e não pode valer para este nem
    // durante a espera do GET, que é justamente o que o reinício otimista existe para cobrir.
    localStorage.setItem('sz-kids-tema', 'pink')
    localStorage.setItem('sz:kids:tema-dono', 'perfil-1')
    const responder = servidorSuspenso('padrao')

    montar('perfil-2')
    await deixarAssentar(2)
    expect(temaNoDocumento()).toBe('padrao')

    await responder()
    expect(temaNoDocumento()).toBe('padrao')
  })

  it('trocar para o Pink e recarregar: o F5 seguinte já não pisca', async () => {
    // O ciclo inteiro, sem preparar o localStorage à mão: é ele que prova que o dono do tema é
    // GRAVADO de verdade. Sem a gravação, os dois casos acima passariam e o flash voltaria aqui.
    servidorDeTema('padrao')
    const botao = await montarCarregado()
    await act(async () => {
      fireEvent.click(botao)
    })
    await deixarAssentar()
    expect(temaNoDocumento()).toBe('pink')

    cleanup() // o F5
    const gravacao = gravarTemasAplicados()
    await montarCarregado()
    await deixarAssentar()
    gravacao.parar()

    expect(temaNoDocumento()).toBe('pink')
    expect(gravacao.vistos).not.toContain('padrao')
  })

  it('falhar ao carregar mostra o recado e o "Tentar novamente" recupera', async () => {
    // O estado em que ela ficou presa: o recado na tela e o botão desabilitado. A saída tem que
    // existir e funcionar, senão só um F5 resolve.
    servidorQueRecusa()
    const botao = montar()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não consegui'))
    expect(botao.disabled).toBe(true)

    servidorDeTema('pink')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    })
    await waitFor(() => expect(botao.disabled).toBe(false))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(temaNoDocumento()).toBe('pink')
  })

  it('o Pink do PRÓPRIO perfil segue na tela durante a espera do GET', async () => {
    // O par do caso acima: com o dono certo, o reinício não pode acontecer nem por um quadro.
    localStorage.setItem('sz-kids-tema', 'pink')
    localStorage.setItem('sz:kids:tema-dono', 'perfil-1')
    const responder = servidorSuspenso('pink')

    montar('perfil-1')
    await deixarAssentar(2)
    expect(temaNoDocumento()).toBe('pink')

    await responder()
    expect(temaNoDocumento()).toBe('pink')
  })
})
