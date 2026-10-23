import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  juntarFala,
  VoiceInputButton,
} from '@sistemazero/member-shell/components/voice-input/voice-input-button'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import {
  desinstalarMicrofone,
  esperar,
  falar,
  instalarMicrofone,
  microfone,
  parar,
} from './helpers/fake-microphone'

/**
 * O botão "Falar" (14/10/2026), com o microfone, o gravador, o medidor e o servidor de mentira.
 * O que se cobra: a captura pede o que ajuda a transcrição, o silêncio e a fala curta nem saem do
 * aparelho, o texto entra na caixa somado ao que havia (cortado no teto do campo), o formulário
 * segura o envio enquanto a fala vira texto, e o microfone é SOLTO em todo caminho de saída.
 */

const VIEWER = '11111111-1111-4111-8111-111111111111'

// `estado` é o microfone de mentira do ajudante (o nome antigo fica para os casos lerem igual).
const estado = microfone

beforeEach(() => instalarMicrofone())
afterEach(desinstalarMicrofone)

/** O microfone foi aberto E solto: com a lista vazia, `every` passaria sem gravação nenhuma. */
function microfoneSolto() {
  expect(estado.faixas.length).toBeGreaterThan(0)
  expect(estado.faixas.every((f) => f.parada)).toBe(true)
  expect(estado.contextos.length).toBeGreaterThan(0)
  expect(estado.contextos.every((c) => c.fechado)).toBe(true)
}

/** Um formulário mínimo: a caixa, o botão e um "Enviar" que espera a fala e limpa a caixa. */
function Caixa({
  inicial = '',
  maxLength = 1000,
  contexto = 'O Farol 🌊 · Andar',
  onSpoken = () => {},
}: {
  inicial?: string
  maxLength?: number
  contexto?: string
  onSpoken?: () => void
}) {
  const [texto, setTexto] = useState(inicial)
  const [ocupado, setOcupado] = useState(false)
  return (
    <div>
      <textarea
        id="caixa"
        aria-label="Mensagem"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <VoiceInputButton
        viewerId={VIEWER}
        context={contexto}
        value={texto}
        maxLength={maxLength}
        onChange={setTexto}
        onSpoken={onSpoken}
        onBusyChange={setOcupado}
        textareaId="caixa"
      />
      <button type="button" disabled={ocupado || !texto.trim()} onClick={() => setTexto('')}>
        Enviar
      </button>
    </div>
  )
}

function status(): string {
  return screen.getByRole('status').textContent ?? ''
}

function caixa(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Mensagem' }) as HTMLTextAreaElement
}

describe('juntarFala', () => {
  test('soma à caixa com um espaço e corta no teto contado como a caixa conta (UTF-16)', () => {
    expect(juntarFala('', 'oi', 10)).toEqual({ texto: 'oi', cortado: false, adicionou: true })
    expect(juntarFala('já escrevi   ', 'e falei', 100)).toEqual({
      texto: 'já escrevi e falei',
      cortado: false,
      adicionou: true,
    })
    // Um emoji vale 2 no `maxLength` do textarea e no `.max()` do servidor: "abc 🙂" já são 6.
    const cortado = juntarFala('abc', '🙂🙂🙂🙂', 6)
    expect(cortado).toEqual({ texto: 'abc 🙂', cortado: true, adicionou: true })
    expect(cortado.texto.length).toBeLessThanOrEqual(6)
    // Caixa já cheia: nada da fala entra, e a mensagem não pode virar "falada".
    expect(juntarFala('abcdef', 'oi', 6)).toEqual({
      texto: 'abcdef',
      cortado: true,
      adicionou: false,
    })
  })
})

describe('VoiceInputButton', () => {
  test('sem gravador no navegador, o botão nem aparece', () => {
    Reflect.deleteProperty(window, 'MediaRecorder')
    render(<Caixa />)
    expect(screen.queryByRole('button', { name: 'Falar em vez de escrever' })).toBeNull()
  })

  test('fala, confere e o texto entra na caixa marcado como falado', async () => {
    let falado = 0
    render(<Caixa inicial="Oi equipe." onSpoken={() => falado++} />)
    await falar(2)
    expect(estado.pedidosDoMicrofone[0]).toEqual({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    })
    expect(estado.gravadores[0]?.options).toEqual({
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64_000,
    })
    expect(status()).toBe('Pode falar.')
    await parar()

    expect(estado.envios).toHaveLength(1)
    const envio = estado.envios[0]
    expect(envio?.url).toBe('/api/voice/transcribe')
    expect(envio?.headers.get('content-type')).toBe('audio/webm;codecs=opus')
    expect(envio?.headers.get('x-sz-viewer')).toBe(VIEWER)
    expect(decodeURIComponent(envio?.headers.get('x-sz-voice-context') ?? '')).toBe(
      'O Farol 🌊 · Andar',
    )
    expect(caixa().value).toBe('Oi equipe. meu personagem não pula')
    expect(document.activeElement).toBe(caixa())
    expect(falado).toBe(1)
    expect(status()).toBe('Confira se ficou certo. Se não ficou, fale de novo ou arrume o texto.')
    microfoneSolto()
  })

  test('enquanto grava e enquanto a fala vira texto, o "Enviar" do formulário espera', async () => {
    let soltar: (r: Response) => void = () => {}
    const pendente = new Promise<Response>((resolve) => {
      soltar = resolve
    })
    render(<Caixa inicial="já escrevi" />)
    const enviar = screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement
    expect(enviar.disabled).toBe(false)
    await falar(2)
    expect(enviar.disabled).toBe(true)
    estado.respostas.push(pendente as unknown as Response)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Parar de gravar' }))
      await esperar(360)
    })
    // Transcrevendo: o botão de falar fica `aria-disabled` (não `disabled`, que tiraria o foco).
    const falarBotao = screen.getByRole('button', { name: 'Falar em vez de escrever' })
    expect(falarBotao.getAttribute('aria-disabled')).toBe('true')
    expect((falarBotao as HTMLButtonElement).disabled).toBe(false)
    expect(status()).toBe('Escrevendo o que você falou…')
    expect(enviar.disabled).toBe(true)
    await act(async () => {
      soltar(Response.json({ text: 'e falei' }))
      await esperar(0)
    })
    expect(caixa().value).toBe('já escrevi e falei')
    expect(enviar.disabled).toBe(false)
  })

  test('depois de enviar, o "confira" da mensagem que saiu some', async () => {
    render(<Caixa />)
    await falar(2)
    await parar()
    expect(status()).toContain('Confira se ficou certo')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(caixa().value).toBe('')
    expect(status()).toBe('')
  })

  test('contexto com emoji cortado no limite não trava o botão', async () => {
    // 199 letras e um emoji: cortar por unidade partia o emoji e o `encodeURIComponent` lançava.
    render(<Caixa contexto={`${'a'.repeat(199)}🌊 e mais`} />)
    await falar(2)
    await parar()
    expect(estado.envios).toHaveLength(1)
    const lugar = decodeURIComponent(estado.envios[0]?.headers.get('x-sz-voice-context') ?? '')
    expect(Array.from(lugar)).toHaveLength(200)
    expect(lugar.endsWith('🌊')).toBe(true)
    expect(caixa().value).toBe('meu personagem não pula')
  })

  test('silêncio não sai do aparelho', async () => {
    // Chiado baixo: o medidor funciona, mas não há voz.
    estado.nivel = 0.001
    render(<Caixa />)
    await falar(2)
    await parar()
    expect(estado.envios).toHaveLength(0)
    expect(status()).toBe('Não ouvi nada. Chegue mais perto do microfone e fale de novo.')
    microfoneSolto()
  })

  test('medidor parado (contexto de áudio suspenso no iPhone): a fala vai mesmo assim', async () => {
    // Zero absoluto é o medidor sem ler nada, não silêncio: o filtro sai e o servidor decide.
    estado.nivel = 0
    render(<Caixa />)
    await falar(2)
    await parar()
    expect(estado.envios).toHaveLength(1)
    expect(caixa().value).toBe('meu personagem não pula')
  })

  test('fala curta demais não sai do aparelho', async () => {
    render(<Caixa />)
    await falar(0.5)
    await parar()
    expect(estado.envios).toHaveLength(0)
    expect(status()).toBe('Foi muito rapidinho. Aperte Falar e conte com calma.')
  })

  test('microfone bloqueado: a frase pede um adulto, e o contexto de áudio fecha', async () => {
    estado.erroDoMicrofone = Object.assign(new Error('negado'), { name: 'NotAllowedError' })
    render(<Caixa />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Falar em vez de escrever' }))
      await esperar(0)
    })
    expect(status()).toBe(
      'O microfone está bloqueado. Peça para um adulto liberar o microfone deste site.',
    )
    expect(estado.contextos.length).toBeGreaterThan(0)
    expect(estado.contextos.every((c) => c.fechado)).toBe(true)
  })

  test('o servidor recusou por excesso: a criança lê uma frase, não um código', async () => {
    estado.respostas.push(
      Response.json({ error: { code: 'VOICE_RATE_LIMITED', message: 'x' } }, { status: 429 }),
    )
    render(<Caixa />)
    await falar(2)
    await parar()
    expect(status()).toBe('Foram muitas gravações seguidas. Espere um pouquinho ou escreva.')
    expect(caixa().value).toBe('')
  })

  test('outro perfil entrou na aba: a frase manda abrir a página de novo', async () => {
    estado.respostas.push(
      Response.json({ error: { code: 'VIEWER_CHANGED', message: 'x' } }, { status: 409 }),
    )
    render(<Caixa />)
    await falar(2)
    await parar()
    expect(status()).toBe('O perfil mudou. Abra esta página de novo para continuar.')
  })

  test('a fala que passa do teto do campo entra cortada, com aviso', async () => {
    render(<Caixa inicial={'a'.repeat(30)} maxLength={40} />)
    await falar(2)
    await parar()
    expect(caixa().value.length).toBeLessThanOrEqual(40)
    expect(caixa().value.startsWith(`${'a'.repeat(30)} meu`)).toBe(true)
    expect(status()).toBe('O texto ficou grande e o fim foi cortado. Confira antes de enviar.')
  })

  test('caixa cheia: nada entra, e a mensagem não vira falada', async () => {
    let falado = 0
    render(<Caixa inicial={'a'.repeat(40)} maxLength={40} onSpoken={() => falado++} />)
    await falar(2)
    await parar()
    expect(caixa().value).toBe('a'.repeat(40))
    expect(falado).toBe(0)
    expect(status()).toBe('A caixa já está cheia. Apague um pedaço do texto para falar mais.')
  })

  test('aba escondida no meio da gravação: descarta, solta o microfone e diz por quê', async () => {
    render(<Caixa />)
    await falar(2)
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    Reflect.deleteProperty(document, 'visibilityState')
    await act(async () => {
      await esperar(0)
    })
    expect(estado.envios).toHaveLength(0)
    microfoneSolto()
    expect(status()).toBe('A gravação parou antes do fim. Aperte Falar para gravar de novo.')
    expect(screen.getByRole('button', { name: 'Falar em vez de escrever' })).toBeTruthy()
  })

  test('"Cancelar" enquanto o microfone abre: volta ao começo e solta o que abrir depois', async () => {
    let liberar: () => void = () => {}
    const original = navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: (c: MediaStreamConstraints) =>
          new Promise((resolve) => {
            liberar = () => resolve(original(c))
          }),
      },
    })
    render(<Caixa />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Falar em vez de escrever' }))
      await esperar(0)
    })
    expect(status()).toBe('Abrindo o microfone…')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      await esperar(0)
    })
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    expect(status()).toBe('')
    await act(async () => {
      liberar()
      await esperar(0)
    })
    microfoneSolto()
    expect(estado.envios).toHaveLength(0)
  })

  test('sair da tela gravando também solta o microfone, sem enviar', async () => {
    const { unmount } = render(<Caixa />)
    await falar(2)
    unmount()
    await esperar(0)
    expect(estado.envios).toHaveLength(0)
    microfoneSolto()
  })
})
