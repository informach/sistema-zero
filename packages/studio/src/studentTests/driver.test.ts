import { afterEach, describe, expect, it } from 'bun:test'
import { createExecutionObservationCodec } from '@sistemazero/core/learning'
import { buildStudentTestDriver, STUDENT_TEST_MESSAGE } from './driver'

/** O valor como o executor o manda: no envelope do codificador dos objetivos. */
const encoded = (value: unknown) => createExecutionObservationCodec().encode(value, 20_000)

/**
 * O piloto da aba "Meus testes" roda dentro do jogo. Aqui ele roda no DOM de teste com o leitor
 * das variáveis de mentira e um `parent` que anota a resposta: a ordem do executor dos objetivos
 * (começo, passos, fim), os nomes das teclas, as mensagens e o texto da página.
 */

type Posted = { message: Record<string, unknown>; origin: string }

const scope = `__sz${'d'.repeat(24)}`
const keys: string[] = []
const onKey = (event: Event) => {
  const key = event as KeyboardEvent
  keys.push(`${key.type}:${key.key}:${key.code}`)
}

// O piloto troca o `focus` do palco escondido; aqui o DOM é o mesmo dos outros arquivos de teste.
const nativeFocus = HTMLElement.prototype.focus

afterEach(() => {
  HTMLElement.prototype.focus = nativeFocus
  keys.length = 0
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('keyup', onKey)
  document.body.innerHTML = ''
})

function runDriver(
  options: Omit<Parameters<typeof buildStudentTestDriver>[0], 'parentOrigin' | 'scope' | 'token'>,
  variables: Record<string, unknown>,
): Promise<Posted> {
  document.addEventListener('keydown', onKey)
  document.addEventListener('keyup', onKey)
  const reader = {
    names: () => Object.keys(variables),
    get: (name: string) => (name in variables ? { v: variables[name] } : null),
  }
  return new Promise((resolve) => {
    const parent = {
      postMessage: (message: Record<string, unknown>, origin: string) =>
        resolve({ message, origin }),
    }
    const fakeWindow = new Proxy(window, {
      get(target, key) {
        if (key === 'parent') return parent
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    const fakeGlobal = new Proxy(globalThis, {
      get(target, key) {
        if (key === scope) return reader
        return Reflect.get(target, key)
      },
    })
    new Function(
      'window',
      'globalThis',
      buildStudentTestDriver({
        ...options,
        parentOrigin: 'https://editor.test',
        scope,
        token: 't1',
      }),
    )(fakeWindow, fakeGlobal)
  })
}

describe('o piloto de "Meus testes"', () => {
  it('lê o começo, faz os passos com os nomes de tecla do navegador e lê o fim', async () => {
    const variables: Record<string, unknown> = { pontos: 0 }
    // O "jogo": cada Enter vale um ponto.
    const ponto = (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') variables.pontos = Number(variables.pontos) + 1
    }
    document.addEventListener('keydown', ponto)
    try {
      const started = Date.now()
      const { message, origin } = await runDriver(
        {
          steps: [
            { action: 'press', key: 'Enter' },
            { action: 'press', key: 'Space', holdMs: 150 },
            { action: 'wait', ms: 100 },
            { action: 'press', key: 'a' },
          ],
          target: { kind: 'value', path: 'pontos' },
        },
        variables,
      )
      expect(origin).toBe('https://editor.test')
      expect(message).toMatchObject({ type: STUDENT_TEST_MESSAGE, token: 't1' })
      expect(message.observation).toMatchObject({
        type: 'behavior',
        initial: { found: true, value: encoded(0) },
        final: { found: true, value: encoded(1) },
        errors: [],
      })
      expect(keys).toEqual([
        'keydown:Enter:Enter',
        'keyup:Enter:Enter',
        'keydown: :Space',
        'keyup: :Space',
        'keydown:a:KeyA',
        'keyup:a:KeyA',
      ])
      // 250 ms de folga antes e depois, 80 + 150 + 100 + 80 ms de passos.
      expect(Date.now() - started).toBeGreaterThanOrEqual(900)
    } finally {
      document.removeEventListener('keydown', ponto)
    }
  })

  it('o Jogo 2D Avançado no menu: aperta o botão principal antes de ler o começo, como a criança', async () => {
    // A tela do menu do motor (`makeScreen('menu', …)` + `makeButton`), aberta.
    const variables: Record<string, unknown> = { jogando: false, cliques: 0 }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="menu"><h1>Meu Jogo</h1><button data-szgk-start>Jogar</button><button>Ajuda</button></div>'
    const buttons = document.querySelectorAll('button')
    buttons[0]?.addEventListener('click', () => {
      variables.jogando = true
      variables.cliques = Number(variables.cliques) + 1
    })
    buttons[1]?.addEventListener('click', () => {
      variables.cliques = Number(variables.cliques) + 10
    })
    const { message } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'jogando' } },
      variables,
    )
    expect(message.observation).toMatchObject({
      initial: { found: true, value: encoded(true) },
      final: { found: true, value: encoded(true) },
    })
    expect(variables.cliques).toBe(1)
  })

  it('o jogo não tira o foco da página: o pedido de foco dentro do palco escondido não move nada', async () => {
    document.body.innerHTML = '<button>Jogar</button>'
    await runDriver({ steps: [], target: { kind: 'value', path: 'x' } }, { x: 1 })
    document.querySelector('button')?.focus()
    expect(document.activeElement).toBe(document.body)
  })

  it('a tecla do teste vai para o elemento que o jogo quis focar, como o foco faria', async () => {
    const variables: Record<string, unknown> = { teclas: 0 }
    document.body.innerHTML = '<canvas tabindex="0"></canvas>'
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    // O jogo foca o próprio canvas e ouve a tecla nele (não na janela).
    canvas.addEventListener('keydown', () => {
      variables.teclas = Number(variables.teclas) + 1
    })
    setTimeout(() => canvas.focus(), 0)
    const { message } = await runDriver(
      { steps: [{ action: 'press', key: 'Space' }], target: { kind: 'value', path: 'teclas' } },
      variables,
    )
    expect(message.observation).toMatchObject({ final: { found: true, value: encoded(1) } })
    expect(document.activeElement).toBe(document.body)
  })

  it('o menu que a criança montou: aperta só o "Jogar" de fábrica, nunca o primeiro botão', async () => {
    const variables: Record<string, unknown> = { ajuda: 0, jogando: false }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="menu"><button>Como jogar</button><button data-szgk-start> Jogar </button></div>'
    const [comoJogar, jogar] = document.querySelectorAll('button')
    comoJogar?.addEventListener('click', () => {
      variables.ajuda = Number(variables.ajuda) + 1
    })
    jogar?.addEventListener('click', () => {
      variables.jogando = true
    })
    await runDriver({ steps: [], target: { kind: 'value', path: 'ajuda' } }, variables)
    expect(variables).toEqual({ ajuda: 0, jogando: true })
  })

  it('o "Jogar" de fábrica com outro texto (a criança trocou o texto): aperta pela marca', async () => {
    const variables: Record<string, unknown> = { jogando: false }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="menu"><button data-szgk-start>Correr</button></div>'
    document.querySelector('button')?.addEventListener('click', () => {
      variables.jogando = true
    })
    await runDriver({ steps: [], target: { kind: 'value', path: 'jogando' } }, variables)
    expect(variables.jogando).toBe(true)
  })

  it('um botão "Jogar" que a criança fez não é o de fábrica: só o marcado é apertado', async () => {
    const variables: Record<string, unknown> = { dela: 0, fabrica: 0 }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="menu"><button>Jogar</button><button data-szgk-start>Correr</button></div>'
    const [dela, fabrica] = document.querySelectorAll('button')
    dela?.addEventListener('click', () => {
      variables.dela = Number(variables.dela) + 1
    })
    fabrica?.addEventListener('click', () => {
      variables.fabrica = Number(variables.fabrica) + 1
    })
    await runDriver({ steps: [], target: { kind: 'value', path: 'dela' } }, variables)
    expect(variables).toEqual({ dela: 0, fabrica: 1 })
  })

  it('menu sem o "Jogar" (a criança trocou os botões): nada é apertado', async () => {
    const variables: Record<string, unknown> = { cliques: 0 }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="menu"><button>Começar aventura</button></div>'
    document.querySelector('button')?.addEventListener('click', () => {
      variables.cliques = Number(variables.cliques) + 1
    })
    await runDriver({ steps: [], target: { kind: 'value', path: 'cliques' } }, variables)
    expect(variables.cliques).toBe(0)
  })

  it('espera o "carregando" do motor sair e só então aperta o "Jogar"', async () => {
    const variables: Record<string, unknown> = { jogando: false }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="carregando"></div>' +
      '<div class="szgk-panel" data-szgk-screen="menu"><button data-szgk-start>Jogar</button></div>'
    document.querySelector('button')?.addEventListener('click', () => {
      variables.jogando = true
    })
    // As imagens e os sons chegam depois que o piloto já começou a olhar.
    setTimeout(() => {
      document.querySelector('[data-szgk-screen="carregando"]')?.classList.remove('szgk-active')
      document.querySelector('[data-szgk-screen="menu"]')?.classList.add('szgk-active')
    }, 400)
    const { message } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'jogando' } },
      variables,
    )
    expect(message.observation).toMatchObject({ initial: { found: true, value: encoded(true) } })
  })

  it('outra tela do Jogo 2D Avançado (o fim) não é apertada', async () => {
    const variables: Record<string, unknown> = { cliques: 0 }
    document.body.innerHTML =
      '<div class="szgk-panel szgk-active" data-szgk-screen="fim"><button>Jogar de novo</button></div>' +
      '<div class="szgk-panel" data-szgk-screen="menu"><button data-szgk-start>Jogar</button></div>'
    for (const button of document.querySelectorAll('button'))
      button.addEventListener('click', () => {
        variables.cliques = Number(variables.cliques) + 1
      })
    await runDriver({ steps: [], target: { kind: 'value', path: 'cliques' } }, variables)
    expect(variables.cliques).toBe(0)
  })

  it('lê um caminho dentro da variável (a posição x do sprite) e diz quando não acha', async () => {
    const { message } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'heroi.x' } },
      { heroi: { x: 412, y: 10 } },
    )
    expect(message.observation).toMatchObject({ final: { found: true, value: encoded(412) } })
    const { message: semNada } = await runDriver(
      { steps: [], target: { kind: 'value', path: 'vilao.x' } },
      {},
    )
    expect(semNada.observation).toMatchObject({ final: { found: false } })
  })

  it('as mensagens do jogo e o texto da página', async () => {
    document.body.innerHTML = '<p>Moedas: 3</p>'
    const { message: texto } = await runDriver({ steps: [], target: { kind: 'text' } }, {})
    expect(texto.observation).toMatchObject({ final: { found: true } })
    expect(String((texto.observation as { final: { value: string } }).final.value)).toContain(
      'Moedas: 3',
    )
  })
})
