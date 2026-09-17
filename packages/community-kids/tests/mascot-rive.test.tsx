import { afterEach, describe, expect, test } from 'bun:test'
import { ZappyFalaProvider } from '@sistemazero/member-shell/components/zappy-fala-context'
import { act, cleanup, render } from '@testing-library/react'
import {
  tocandoDoZappy,
  ZAPPY_POSE_DA_FALA,
  ZAPPY_RIVE_COM_SOM,
  ZAPPY_RIVE_LIGADO,
  ZAPPY_RIVE_SRC,
  ZAPPY_SRC,
} from '../src/components/kids/mascot'
import { KidsMascotAnimated } from '../src/components/kids/mascot-rive'

afterEach(cleanup)

/** `matchMedia` do happy-dom: o hook de movimento reduzido lê este casamento. */
function matchMedia(reduzido: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduzido && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/** O `<img>` do mascote é `aria-hidden`, então o alcance é pela tag mesmo. */
const imagem = () => document.querySelector('img')

/**
 * Deixa o `next/dynamic` resolver dentro do `act`. Sem isso o React avisa que um
 * `LoadableComponent` atualizou estado fora dele — o carregamento do chunk é
 * assíncrono por construção, e o aviso apareceria em toda suíte que monta uma
 * celebração.
 */
const assenta = () => act(async () => {})

describe('KidsMascotAnimated', () => {
  test('a primeira pintura é SEMPRE o WebP', async () => {
    // Nem o canvas nem o WASM existem no servidor: montar o Rive de saída faria a
    // hidratação encontrar uma árvore diferente da que veio pronta.
    matchMedia(false)
    render(<KidsMascotAnimated expression="celebrating" className="size-24" />)
    expect(imagem()?.getAttribute('src')).toBe(ZAPPY_SRC.celebrating)
    await assenta()
  })

  test('com prefers-reduced-motion o Zappy fica no WebP e leva a animação CSS', async () => {
    matchMedia(true)
    render(
      <KidsMascotAnimated
        expression="celebrating"
        className="size-24"
        stillClassName="kid-wiggle"
      />,
    )
    const img = imagem()
    expect(img?.getAttribute('src')).toBe(ZAPPY_SRC.celebrating)
    // A classe de movimento é do ESTÁTICO: quando o Rive assume, quem mexe é ele.
    expect(img?.className).toContain('kid-wiggle')
    await assenta()
  })

  test('toda pose animada tem par estático, e o som segue a régua evento × estado', () => {
    for (const pose of Object.keys(ZAPPY_RIVE_SRC) as (keyof typeof ZAPPY_RIVE_SRC)[]) {
      expect(ZAPPY_SRC[pose]).toBeTruthy()
    }
    // ⚠️ TODAS mudas: os `.riv` têm áudio embutido mas nenhum evento o dispara
    // (medido — pico zero na saída de áudio, por timeline e por state machine).
    // Quem toca o som da celebração segue sendo o `KidsConfetti`. Virar
    // `celebrating` aqui sem pôr `sound={false}` no confete faz tocar em dobro.
    expect(ZAPPY_RIVE_COM_SOM).toEqual({
      happy: false,
      celebrating: false,
      thinking: false,
      sleeping: false,
      speaking: false,
    })
  })
})

describe('troca de pose', () => {
  /**
   * ⚠️ O `useRive` lê os parâmetros UMA vez (deps: canvas, "tem params", instância —
   * o `src` não está lá), então sem a `key` por expressão o canvas continuaria
   * tocando o `.riv` da pose anterior. Daqui não dá para observar o canvas (o
   * happy-dom não tem WebGL e o chunk é `ssr:false`), mas dá para travar o que
   * QUEBRA junto: o WebP da pose nova tem de reaparecer na troca.
   */
  test('mudar de expressão volta ao WebP da pose nova', async () => {
    matchMedia(false)
    const { rerender } = render(<KidsMascotAnimated expression="thinking" className="size-16" />)
    expect(imagem()?.getAttribute('src')).toBe(ZAPPY_SRC.thinking)

    rerender(<KidsMascotAnimated expression="celebrating" className="size-16" />)
    expect(imagem()?.getAttribute('src')).toBe(ZAPPY_SRC.celebrating)
    await assenta()
  })
})

describe('economia de dados', () => {
  /**
   * Quem ligou "Economia de dados" no aparelho não está pedindo 676 KB de runtime
   * para ver um vagalume se mexer. Só o Chromium implementa a API, então ausência
   * significa "não sei" — e "não sei" anima normalmente (travado no caso acima).
   */
  test('com saveData ligado o Zappy fica no WebP', async () => {
    matchMedia(false)
    const original = Object.getOwnPropertyDescriptor(navigator, 'connection')
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    })
    try {
      render(<KidsMascotAnimated expression="happy" className="size-20" />)
      expect(imagem()?.getAttribute('src')).toBe(ZAPPY_SRC.happy)
      await assenta()
    } finally {
      if (original) Object.defineProperty(navigator, 'connection', original)
      else Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'connection')
    }
  })
})

describe('o interruptor', () => {
  /**
   * LIGADO desde 15/09/2026 (2º lote de arquivos): fundo do artboard transparente e a
   * `Timeline 1` animando nas cinco poses, conferido no navegador quadro a quadro.
   *
   * ⚠️ A lição que este bloco guarda: a 1ª leitura foi de que os `.riv` não animavam,
   * e ela estava ERRADA — o Zappy ficava parado porque o canvas montava pela
   * `State Machine 1` (zero inputs, não entra na timeline), não porque o arquivo
   * fosse estático. Nenhum teste daqui pega isso: o happy-dom não tem WebGL, e os
   * guardas de bytes só veem NOMES. Quem decide se o mascote se mexe é o navegador.
   */
  test('está LIGADO — os .riv animam pela timeline', () => {
    expect(ZAPPY_RIVE_LIGADO).toBe(true)
  })

  /**
   * O fallback não é teoria: foi ele que segurou o app durante as duas voltas de
   * arquivo, e é o que sobra se um `.riv` sumir, se a CSP recusar o WASM ou se um
   * reexport renomear o artboard. Com o WebP, a animação CSS da marca volta junto.
   */
  test('o WebP de queda continua com a animação CSS', async () => {
    // `prefers-reduced-motion` é o caminho de fallback mais fácil de exercitar daqui,
    // e passa exatamente pelo mesmo ramo que o interruptor desligado.
    matchMedia(true)
    render(
      <KidsMascotAnimated
        expression="celebrating"
        className="size-24"
        stillClassName="kid-wiggle"
      />,
    )
    const img = imagem()
    expect(img?.getAttribute('src')).toBe(ZAPPY_SRC.celebrating)
    expect(img?.className).toContain('kid-wiggle')
    await assenta()
  })
})

/**
 * ⭐⭐ A régua da BOCA, pura. Ela decide sozinha três coisas que ninguém vê quebrar: qual pose a
 * voz rege, o que acontece sem provider, e o que acontece num balão sem áudio.
 */
describe('tocandoDoZappy', () => {
  test('sem contexto, ninguém rege: toca como sempre', () => {
    expect(tocandoDoZappy(ZAPPY_POSE_DA_FALA, null)).toBeUndefined()
  })

  test('⚠️ o balão SEM "Ouvir" continua animando sozinho', () => {
    expect(tocandoDoZappy(ZAPPY_POSE_DA_FALA, { podeFalar: false, falando: false })).toBeUndefined()
  })

  /**
   * ⚠️⚠️ A decisão da dona: a autora escolhe a cara do Zappy no balão, e as outras poses animam em
   * laço por desenho. A voz rege a BOCA — congelar o Zappy feliz porque o balão tem áudio seria
   * tirar movimento que ninguém pediu para tirar.
   */
  test('⚠️⚠️ só a pose da fala obedece: as outras seguem livres', () => {
    const falando = { podeFalar: true, falando: true }
    expect(tocandoDoZappy('celebrating', falando)).toBeUndefined()
    expect(tocandoDoZappy('happy', falando)).toBeUndefined()
    expect(tocandoDoZappy('thinking', falando)).toBeUndefined()
    expect(tocandoDoZappy(ZAPPY_POSE_DA_FALA, falando)).toBe(true)
  })

  test('com "Ouvir" na tela e o áudio parado, a boca fica parada', () => {
    expect(tocandoDoZappy(ZAPPY_POSE_DA_FALA, { podeFalar: true, falando: false })).toBe(false)
  })
})

/**
 * O elo que a régua não alcança: o que o CANVAS recebe. O falso do `test-setup` emite o
 * `data-tocando`, então dá para ver o regime sem WebGL nenhum.
 */
describe('o regime chega ao canvas', () => {
  const regime = () => document.querySelector('[data-tocando]')?.getAttribute('data-tocando')

  test('⭐ o áudio tocando liga a boca; parar desliga', async () => {
    matchMedia(false)
    const { rerender } = render(
      <ZappyFalaProvider value={{ podeFalar: true, falando: true }}>
        <KidsMascotAnimated expression={ZAPPY_POSE_DA_FALA} className="size-16" />
      </ZappyFalaProvider>,
    )
    await assenta()
    expect(regime()).toBe('true')

    rerender(
      <ZappyFalaProvider value={{ podeFalar: true, falando: false }}>
        <KidsMascotAnimated expression={ZAPPY_POSE_DA_FALA} className="size-16" />
      </ZappyFalaProvider>,
    )
    await assenta()
    expect(regime()).toBe('false')
  })

  /**
   * ⚠️⚠️ Trocar de REGIME remonta o canvas (a `key` muda), e o "já desenhou" da montagem anterior
   * precisa cair junto — senão a troca abre um buraco do tamanho do mascote, que é exatamente o
   * que o WebP por baixo existe para impedir. Acontece de verdade na cena: o `temVoz` do navegador
   * só liga depois do `voiceschanged`, e o mascote já está montado quando isso chega.
   */
  test('⚠️⚠️ virar regido volta ao WebP enquanto o canvas novo carrega', async () => {
    matchMedia(false)
    // ⚠️ A ÁRVORE é a mesma nos dois renders (o provider já está lá, só o valor muda): envolver o
    // mascote depois trocaria a posição dele na árvore, o React montaria um componente NOVO e o
    // WebP voltaria pelo motivo errado — o teste passaria sem provar nada. É o caso real da cena,
    // onde o `podeFalar` vira verdadeiro com o mascote já montado.
    const { rerender } = render(
      <ZappyFalaProvider value={{ podeFalar: false, falando: false }}>
        <KidsMascotAnimated expression={ZAPPY_POSE_DA_FALA} className="size-16" />
      </ZappyFalaProvider>,
    )
    await assenta()
    // O Rive desenhou: o WebP sai de cena, como na tela de verdade.
    await act(async () => {
      ;(
        globalThis as Record<string, unknown> & { zappyRiveDesenhou?: () => void }
      ).zappyRiveDesenhou?.()
    })
    expect(imagem()).toBeNull()

    rerender(
      <ZappyFalaProvider value={{ podeFalar: true, falando: true }}>
        <KidsMascotAnimated expression={ZAPPY_POSE_DA_FALA} className="size-16" />
      </ZappyFalaProvider>,
    )
    await assenta()
    // ⚠️ A asserção que MORDE: com o "já desenhou" preso à pose (e não à montagem), o canvas
    // remontaria com o WebP fora da tela e a troca abriria um buraco do tamanho do mascote.
    expect(imagem()?.getAttribute('src')).toBe(ZAPPY_SRC[ZAPPY_POSE_DA_FALA])
    expect(regime()).toBe('true')
  })

  test('sem provider o canvas segue solto (autoplay de sempre)', async () => {
    matchMedia(false)
    render(<KidsMascotAnimated expression={ZAPPY_POSE_DA_FALA} className="size-16" />)
    await assenta()
    expect(regime()).toBe('undefined')
  })
})
