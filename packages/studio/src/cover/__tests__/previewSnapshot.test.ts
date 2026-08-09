import { beforeEach, describe, expect, it } from 'bun:test'
import {
  buildSnapshotBridgeRuntime,
  isPreviewSnapshotMessage,
  PREVIEW_SNAPSHOT_REQUEST,
  SNAPSHOT_MAX_CHARS,
} from '../../preview/snapshotBridge'
import { MAX_PROJECT_THUMB_CHARS } from '../../state/persistence'
import {
  consumeProjectSnapshot,
  forgetProjectSnapshot,
  peekProjectSnapshot,
  rememberProjectSnapshot,
  SNAPSHOT_MAX_AGE_MS,
} from '../latestSnapshot'

/**
 * A foto do card tirada do preview que JÁ está rodando.
 *
 * ⚠️ Nasceu de um defeito relatado em produção: a capa era tirada AO SAIR, num
 * iframe novo, e dependia de o navegador continuar entregando quadros justamente
 * no momento da saída. O relato foi "não é toda vez que tira o print, e quando
 * saiu foi só a cor de fundo, sem o texto do placar".
 */

const JPEG = 'data:image/jpeg;base64,AAAA'

/**
 * Canvas falso: só o que o bridge toca.
 *
 * `vazio: true` simula o buffer que o jogo ainda não desenhou (todo alfa 0) — é o
 * cenário que precisa terminar em `null`, e não numa capa lisa.
 */
function canvasFalso(opts: {
  width?: number
  height?: number
  bg?: string
  url?: string
  vazio?: boolean
  contaminado?: boolean
}) {
  const chamadas: Array<{ fill: string; rect: number[]; composicao: string }> = []
  const codificacoes: string[] = []
  const leituras: string[] = []
  const copias: number[] = []
  let fill = ''
  let composicao = 'source-over'
  return {
    width: opts.width ?? 800,
    height: opts.height ?? 480,
    __bg: opts.bg ?? '',
    __chamadas: chamadas,
    /** Quantas vezes o toDataURL rodou — é o que custa caro. */
    __codificacoes: codificacoes,
    /** Quantas vezes o buffer foi varrido — o outro custo caro. */
    __leituras: leituras,
    /** Quantas vezes o palco foi copiado — a única coisa barata o bastante p/ o quadro. */
    __copias: copias,
    getContext: (tipo: string) =>
      tipo === '2d'
        ? {
            drawImage(...args: unknown[]) {
              // 9 argumentos = desenho com RECORTE da origem; 5 = sem recorte.
              copias.push(args.length)
            },
            set fillStyle(v: string) {
              fill = v
            },
            get fillStyle() {
              return fill
            },
            set globalCompositeOperation(v: string) {
              composicao = v
            },
            get globalCompositeOperation() {
              return composicao
            },
            fillRect(x: number, y: number, w: number, h: number) {
              chamadas.push({ fill, rect: [x, y, w, h], composicao })
            },
            getImageData(_x: number, _y: number, w: number, h: number) {
              leituras.push('getImageData')
              if (opts.contaminado) throw new Error('tainted canvas')
              // RGBA por pixel; o alfa é o 4º. Vazio = tudo 0.
              const data = new Uint8ClampedArray(w * h * 4)
              if (!opts.vazio) data[3] = 255
              return { data }
            },
          }
        : null,
    toDataURL: () => {
      codificacoes.push('jpeg')
      return opts.url ?? JPEG
    },
    getBoundingClientRect: () => ({ left: 30, top: 40, width: 400, height: 240 }),
    // O contêiner do palco — a raiz da rasterização. As coordenadas do recorte
    // são RELATIVAS a ele, por isso o layout externo (página que centraliza)
    // deixa de importar.
    parentElement: {
      __bg: '',
      clientWidth: 420,
      clientHeight: 260,
      style: {} as Record<string, string>,
      getBoundingClientRect: () => ({ left: 20, top: 30, width: 420, height: 260 }),
      cloneNode: () => ({
        style: {} as Record<string, string>,
        querySelectorAll: () => [{ style: {} }],
        childNodes: [{ nodeName: 'DIV' }],
      }),
    },
  }
}

/**
 * Instala `Image` e `XMLSerializer` falsos enquanto `fn` roda — o bridge os
 * pega do escopo global. A imagem resolve na hora (o happy-dom não carrega um
 * data URL de SVG, e esperar o timeout de 1,5 s deixaria a suíte lenta à toa).
 */
function comDOMRasterizavel<T>(modo: 'ok' | 'falha', fn: () => T): T {
  const imgOriginal = globalThis.Image
  const serOriginal = globalThis.XMLSerializer
  class ImagemFalsa {
    width = 500
    height = 700
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) {
      if (modo === 'ok') this.onload?.()
      else this.onerror?.()
    }
  }
  class SerializadorFalso {
    serializeToString() {
      return '<div>tela</div>'
    }
  }
  ;(globalThis as { Image: unknown }).Image = ImagemFalsa
  ;(globalThis as { XMLSerializer: unknown }).XMLSerializer = SerializadorFalso
  try {
    return fn()
  } finally {
    ;(globalThis as { Image: unknown }).Image = imgOriginal
    ;(globalThis as { XMLSerializer: unknown }).XMLSerializer = serOriginal
  }
}

/** Roda o bridge e devolve o que ele postou quando o editor pede a foto. */
function rodar(
  opts: {
    palco?: ReturnType<typeof canvasFalso> | null
    /** O canvas de trabalho do bridge — é nele que a varredura de alfa acontece. */
    temp?: ReturnType<typeof canvasFalso>
    bodyBg?: string
    /** Simula uma tela DOM cobrindo o palco (o menu do Jogo 2D Avançado). */
    comSobreposicao?: boolean
  } = {},
) {
  const palco = opts.palco === undefined ? canvasFalso({}) : opts.palco
  const temp = opts.temp ?? canvasFalso({})
  const postados: Array<{ dataUrl: string | null; projectId?: string }> = []
  let ouvinte: ((e: { source: unknown; data: unknown }) => void) | null = null
  let quadroPendente: (() => void) | null = null
  let ociosoPendente: (() => void) | null = null

  // A tela DOM por cima do palco (menu do Jogo 2D Avançado): quem responde é o
  // `elementFromPoint` no centro do canvas.
  const porCima = { __bg: '', tag: 'div' }
  const janela = {
    scrollX: 0,
    scrollY: 0,
    addEventListener(_: string, fn: (e: { source: unknown; data: unknown }) => void) {
      ouvinte = fn
    },
    requestAnimationFrame: (fn: () => void) => {
      quadroPendente = fn
    },
    requestIdleCallback: (fn: () => void) => {
      ociosoPendente = fn
    },
    getComputedStyle: (el: { __bg?: string }) => ({ backgroundColor: el?.__bg ?? '' }),
    parent: {} as object,
  }
  const documento = {
    body: {
      __bg: opts.bodyBg ?? '',
      // Página com proporção BEM diferente da do palco — é o caso que fazia a
      // foto sair com zoom antes do recorte.
      clientWidth: 500,
      clientHeight: 700,
      cloneNode: () => ({
        querySelectorAll: () => [{ style: {} }],
        childNodes: [{ nodeName: 'DIV' }],
      }),
    },
    querySelectorAll: (sel?: string) =>
      sel === 'style' ? [{ textContent: '.szgk-panel{}' }] : palco ? [palco] : [],
    createElement: () => temp,
    ...(opts.comSobreposicao ? { elementFromPoint: () => porCima } : {}),
  }
  const pai = {
    postMessage: (msg: { dataUrl: string | null; projectId?: string }) => postados.push(msg),
  }
  ;(janela as { parent: unknown }).parent = pai

  new Function(
    'window',
    'document',
    'parent',
    buildSnapshotBridgeRuntime({ parentOrigin: 'https://x.test', projectId: 'p1' }),
  )(janela, documento, pai)

  return {
    pedir() {
      ouvinte?.({ source: pai, data: { type: PREVIEW_SNAPSHOT_REQUEST } })
    },
    /** Roda a fase 1 (dentro do quadro): só a cópia do palco. */
    quadro() {
      const fn = quadroPendente
      quadroPendente = null
      fn?.()
    },
    /** Roda a fase 2 (fora do quadro): a codificação em JPEG. */
    ocioso() {
      const fn = ociosoPendente
      ociosoPendente = null
      fn?.()
    },
    /** As duas fases, para os testes que não estão medindo o corte entre elas. */
    fotografar() {
      this.quadro()
      this.ocioso()
    },
    get temQuadroPendente() {
      return quadroPendente !== null
    },
    get temOciosoPendente() {
      return ociosoPendente !== null
    },
    get postados() {
      return postados
    },
    temp,
  }
}

describe('bridge de foto do preview', () => {
  it('fica INERTE até o editor pedir', () => {
    const b = rodar()
    expect(b.postados).toEqual([])
    expect(b.temQuadroPendente).toBe(false)
  })

  it('⭐ fotografa DEPOIS de um quadro, não na hora do pedido', () => {
    // Um canvas WebGL sem preserveDrawingBuffer volta vazio se lido fora da
    // janela do quadro — esperar aqui não é preciosismo.
    const b = rodar()
    b.pedir()
    expect(b.postados).toEqual([])
    expect(b.temQuadroPendente).toBe(true)
    b.fotografar()
    expect(b.postados).toHaveLength(1)
    expect(b.postados[0]?.dataUrl).toBe(JPEG)
  })

  it('⭐⭐ a CODIFICAÇÃO não acontece dentro do quadro do jogo', () => {
    // Medido em Chrome: o drawImage custa 0,02 ms e o toDataURL chegou a 17,5 ms
    // no pior caso — mais que um quadro inteiro. Só a cópia pode ficar no rAF.
    const b = rodar()
    b.pedir()
    b.quadro()
    expect(b.temp.__codificacoes).toHaveLength(0) // o quadro passou sem pagar o caro
    expect(b.postados).toHaveLength(0)
    expect(b.temOciosoPendente).toBe(true)
    b.ocioso()
    expect(b.temp.__codificacoes).toHaveLength(1)
    expect(b.postados).toHaveLength(1)
  })

  it('⭐ a CÓPIA acontece dentro do quadro (é o que o WebGL exige)', () => {
    // O simétrico do teste acima: adiar as DUAS fases devolveria uma foto preta
    // num jogo 3D, porque o buffer já teria sido descartado.
    const b = rodar()
    b.pedir()
    b.quadro()
    expect(b.temp.__copias).toHaveLength(1)
    // ⚠️ E SÓ a cópia: nada de fundo aqui, senão a varredura de alfa da fase 2
    // encontraria tudo opaco e nunca acusaria um quadro em branco.
    expect(b.temp.__chamadas).toHaveLength(0)
  })

  it('carimba o projeto na resposta (a cerca da troca de projeto)', () => {
    const b = rodar()
    b.pedir()
    b.fotografar()
    expect(b.postados[0]?.projectId).toBe('p1')
  })

  it('⭐ compõe o fundo do palco POR BAIXO (o JPEG não tem alfa)', () => {
    const b = rodar({ palco: canvasFalso({ bg: 'rgb(255, 165, 0)' }) })
    b.pedir()
    b.fotografar()
    // ⚠️ `destination-over` e não um fillRect por cima: o fundo entra DEPOIS do
    // desenho (senão a varredura de alfa acharia tudo opaco) mas ABAIXO dele.
    expect(b.temp.__chamadas[0]).toEqual({
      fill: 'rgb(255, 165, 0)',
      rect: [0, 0, 320, 192],
      composicao: 'destination-over',
    })
  })

  it('sem cor no palco, cai no body; sem nenhuma, branco', () => {
    const comBody = rodar({ palco: canvasFalso({}), bodyBg: 'rgb(1, 2, 3)' })
    comBody.pedir()
    comBody.fotografar()
    expect(comBody.temp.__chamadas[0]?.fill).toBe('rgb(1, 2, 3)')

    const semNada = rodar()
    semNada.pedir()
    semNada.fotografar()
    expect(semNada.temp.__chamadas[0]?.fill).toBe('#ffffff')
  })

  it('⭐⭐ quadro EM BRANCO responde null: capa boa não é trocada por um liso', () => {
    // O defeito que originou a peça toda foi "a capa saiu só com a cor de fundo,
    // sem o texto do placar". Se um buffer vazio virasse foto, este desenho
    // reproduziria o mesmo sintoma — só que por cima de uma capa que estava boa.
    const b = rodar({ temp: canvasFalso({ vazio: true }) })
    b.pedir()
    b.fotografar()
    expect(b.postados[0]?.dataUrl).toBeNull()
    expect(b.temp.__codificacoes).toHaveLength(0) // nem paga o toDataURL
  })

  it('⭐ a VARREDURA de alfa também fica fora do quadro (custa até 6,4 ms)', () => {
    const b = rodar()
    b.pedir()
    b.quadro()
    expect(b.temp.__leituras).toHaveLength(0)
    b.ocioso()
    expect(b.temp.__leituras).toHaveLength(1)
  })

  it('⚠️ canvas CONTAMINADO não é descartado pela varredura', () => {
    // getImageData lança em canvas tainted. Descartar ali puniria um jogo que
    // desenhou de verdade; quem resolve esse caso é o catch do toDataURL.
    const b = rodar({ temp: canvasFalso({ contaminado: true }) })
    b.pedir()
    b.fotografar()
    expect(b.postados[0]?.dataUrl).toBe(JPEG)
  })

  it('sem canvas na página, responde null em vez de calar', () => {
    const b = rodar({ palco: null })
    b.pedir()
    b.quadro()
    // Desiste já na fase 1: nem chega a agendar a codificação.
    expect(b.postados[0]?.dataUrl).toBeNull()
    expect(b.temOciosoPendente).toBe(false)
  })

  it('⚠️ pedido repetido enquanto o anterior está em voo é ignorado', () => {
    // Custo previsível: um pedido por vez, sem empilhar trabalho no quadro do jogo.
    const b = rodar()
    b.pedir()
    b.pedir()
    b.fotografar()
    expect(b.postados).toHaveLength(1)
  })

  it('⚠️ e o "em voo" só é liberado no FIM, não entre as duas fases', () => {
    // Se liberasse na fase 1, um pedido chegando no meio agendaria uma cópia
    // nova por cima da que ainda espera codificação — e a foto sairia trocada.
    const b = rodar()
    b.pedir()
    b.quadro()
    b.pedir() // chega entre as fases
    expect(b.temQuadroPendente).toBe(false) // recusado
    b.ocioso()
    b.pedir() // agora sim
    expect(b.temQuadroPendente).toBe(true)
  })

  it('ignora mensagem que não veio do parent', () => {
    const b = rodar()
    // Um programa da criança postando no próprio window não pode disparar foto.
    expect(b.temQuadroPendente).toBe(false)
    b.pedir()
    expect(b.temQuadroPendente).toBe(true)
  })

  it('a resposta é reconhecida pelo guarda de tipo, e lixo não', () => {
    const b = rodar()
    b.pedir()
    b.fotografar()
    expect(isPreviewSnapshotMessage(b.postados[0])).toBe(true)
    expect(isPreviewSnapshotMessage({ source: 'sz-preview', kind: 'log' })).toBe(false)
    expect(isPreviewSnapshotMessage(null)).toBe(false)
  })

  it('⭐⭐ tela DOM por cima do palco ENTRA na foto (o menu do Jogo 2D Avançado)', () => {
    // O relato: "no jogo 2D avançado, com tela de início, o print fica só com a
    // cor de fundo". As telas de lá são <div> sobre o canvas, não desenho NELE.
    comDOMRasterizavel('ok', () => {
      const b = rodar({ comSobreposicao: true, temp: canvasFalso({ vazio: true }) })
      b.pedir()
      b.fotografar()
      expect(b.postados[0]?.dataUrl).toBe(JPEG)
    })
  })

  it('⭐⭐ e o palco em branco NÃO descarta quando há tela por cima', () => {
    // A tela de início é foto legítima mesmo com o canvas ainda sem um pixel —
    // é exatamente o estado do gk antes de a criança apertar "começar".
    comDOMRasterizavel('ok', () => {
      const comTela = rodar({ comSobreposicao: true, temp: canvasFalso({ vazio: true }) })
      comTela.pedir()
      comTela.fotografar()
      expect(comTela.postados[0]?.dataUrl).toBe(JPEG)
    })
    const semTela = rodar({ temp: canvasFalso({ vazio: true }) })
    semTela.pedir()
    semTela.fotografar()
    expect(semTela.postados[0]?.dataUrl).toBeNull()
  })

  it('⭐⭐ a tela é RECORTADA na área do palco, não encaixada pela página', () => {
    // O defeito que ela viu ao vivo: sem o recorte, o encaixe usava a proporção
    // da PÁGINA (aqui 500×700 contra um palco 800×480) e a foto saía com zoom,
    // "pegando só as palavras". Recorte = drawImage com 9 argumentos.
    comDOMRasterizavel('ok', () => {
      const b = rodar({ comSobreposicao: true })
      b.pedir()
      b.fotografar()
      expect(b.temp.__copias).toEqual([5, 9]) // 1º o palco, 2º a tela recortada
    })
  })

  it('⚠️ SVG que não carrega não perde a foto: segue com o palco', () => {
    // Uma imagem de rede dentro do DOM derruba o SVG inteiro. Com o palco
    // desenhado, ainda há foto boa a entregar.
    comDOMRasterizavel('falha', () => {
      const b = rodar({ comSobreposicao: true })
      b.pedir()
      b.fotografar()
      expect(b.postados[0]?.dataUrl).toBe(JPEG)
      expect(b.temp.__copias).toEqual([5]) // só o palco
    })
  })

  it('⭐⭐ a geometria REAL do Jogo 2D Avançado: palco fixed cobrindo a janela', () => {
    // Números do CSS de verdade (`runtime/shell.ts buildCss`): o #szgk-stage é
    // `position:fixed; inset:0` — ou seja, a JANELA inteira — e o canvas fica
    // centralizado nele, TRANSBORDANDO quando o jogo é maior que o painel do
    // editor. Janela 500×700, canvas 800×480 ⇒ o canvas começa em x=-150.
    // ⚠️ Este caso não sai de um cenário inventado: a validação anterior usava um
    // contêiner de tamanho FIXO em px, que nunca exercitava `fixed`.
    const janela = { left: 0, top: 0, width: 500, height: 700 }
    const canvas = { left: (500 - 800) / 2, top: (700 - 480) / 2, width: 800, height: 480 }
    const recorte = {
      sx: canvas.left - janela.left,
      sy: canvas.top - janela.top,
      sw: canvas.width,
      sh: canvas.height,
    }
    expect(recorte).toEqual({ sx: -150, sy: 110, sw: 800, sh: 480 })

    // A tela do gk é um cartão CENTRADO na janela (left/top 50% + translate).
    // O que importa é ela cair no centro do palco depois do recorte — senão a
    // foto sai com a tela deslocada em relação ao jogo.
    const centroDaJanela = { x: janela.width / 2, y: janela.height / 2 }
    const dentroDoRecorte = {
      x: centroDaJanela.x - recorte.sx,
      y: centroDaJanela.y - recorte.sy,
    }
    expect(dentroDoRecorte).toEqual({ x: 400, y: 240 }) // exatamente o centro de 800×480

    // ⚠️ `sx` negativo é ESPERADO e não é defeito: a parte do palco que fica fora
    // da janela também não existe na tela (o palco tem overflow:hidden), e uma
    // origem fora do SVG desenha transparente — que, em source-over, preserva o
    // jogo já copiado embaixo.
    expect(recorte.sx).toBeLessThan(0)
  })

  it('⚠️ os canvas do clone são ESCONDIDOS antes de serializar', () => {
    // Canvas serializado vem sem os pixels: no SVG viraria um retângulo vazio
    // tapando o jogo que acabou de ser copiado.
    const src = buildSnapshotBridgeRuntime({ parentOrigin: 'https://x.test' })
    expect(src).toContain("telas[i].style.visibility = 'hidden'")
  })

  it('⚠️ o adiamento leva TIMEOUT: página que nunca fica ociosa ainda entrega', () => {
    // Sem o timeout, `requestIdleCallback` pode não disparar numa aba ocupada e a
    // foto ficaria pendurada para sempre — com o `emVoo` travado junto.
    expect(buildSnapshotBridgeRuntime({ parentOrigin: 'https://x.test' })).toContain(
      'requestIdleCallback(fn, { timeout: 1000 })',
    )
  })
})

describe('memória da última foto', () => {
  beforeEach(() => forgetProjectSnapshot())

  it('guarda, lê e confirma o consumo por projeto', () => {
    rememberProjectSnapshot('a', JPEG)
    const snapshot = peekProjectSnapshot('a')
    expect(snapshot?.dataUrl).toBe(JPEG)
    if (!snapshot) throw new Error('snapshot não foi guardado')
    expect(consumeProjectSnapshot(snapshot)).toBe(true)
    expect(peekProjectSnapshot('a')).toBeNull()
    expect(peekProjectSnapshot('b')).toBeNull()
  })

  it('⭐ foto velha NÃO vira capa: o chamador cai no caminho antigo', () => {
    const t0 = 1_000_000
    rememberProjectSnapshot('a', JPEG, t0)
    expect(peekProjectSnapshot('a', t0 + SNAPSHOT_MAX_AGE_MS - 1)?.dataUrl).toBe(JPEG)
    rememberProjectSnapshot('b', JPEG, t0)
    expect(peekProjectSnapshot('b', t0 + SNAPSHOT_MAX_AGE_MS + 1)).toBeNull()
  })

  it('a foto mais recente substitui a anterior', () => {
    rememberProjectSnapshot('a', JPEG, 1)
    rememberProjectSnapshot('a', 'data:image/jpeg;base64,BBBB', 2)
    expect(peekProjectSnapshot('a', 3)?.dataUrl).toBe('data:image/jpeg;base64,BBBB')
  })

  it('⭐⭐ recusa o que não é imagem — o bridge roda no contexto da CRIANÇA', () => {
    // O programa dela pode postar a mensagem de foto à mão, com o que quiser
    // dentro. A validação do bridge não vale como garantia; a fronteira é aqui.
    rememberProjectSnapshot('a', 'javascript:alert(1)')
    rememberProjectSnapshot('a', '<script>x</script>')
    expect(peekProjectSnapshot('a')).toBeNull()
  })

  it('⭐⭐ recusa acima do teto da GRAVAÇÃO, para a reserva assumir', () => {
    // Os dois tetos já divergiram (ponte 400 KB × gravação 300 KB): no meio,
    // a foto era guardada, escolhida em vez da reserva, e depois descartada em
    // silêncio pelo writeProjectThumb. Recusar aqui devolve a vez ao caminho antigo.
    const gorda = `data:image/jpeg;base64,${'A'.repeat(MAX_PROJECT_THUMB_CHARS)}`
    rememberProjectSnapshot('a', gorda)
    expect(peekProjectSnapshot('a')).toBeNull()

    const cabe = `data:image/jpeg;base64,${'A'.repeat(MAX_PROJECT_THUMB_CHARS - 100)}`
    rememberProjectSnapshot('b', cabe)
    expect(peekProjectSnapshot('b')?.dataUrl).toBe(cabe)
  })

  it('⚠️ e o teto da PONTE não pode ser mais frouxo que o da gravação', () => {
    // Drift: se alguém subir um dos dois sem o outro, a divergência volta.
    expect(SNAPSHOT_MAX_CHARS).toBeGreaterThanOrEqual(MAX_PROJECT_THUMB_CHARS)
  })
})
