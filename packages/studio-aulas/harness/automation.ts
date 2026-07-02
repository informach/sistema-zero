// API de automação exposta em `window.__aulas`, usada pelo driver Playwright.
// Vive no PACOTE NOVO (não no Estúdio). Fala com o Blockly da instância via
// `Blockly.getMainWorkspace()` (mesma cópia de blockly, deduplicada pelo Vite) e
// desenha um cursor grande e visível.
//
// ARRASTO REAL: o bloco não "aparece" encaixado — ele é criado na posição do
// flyout e DESLIZA (moveTo quadro a quadro) até a conexão do frame, com o cursor
// acompanhando; só no fim dá o "snap" (connect). Fica realista e didático, mas o
// encaixe continua determinístico (não depende de drag físico frágil).
//
// Este arquivo NÃO passa pelo typecheck do CI (só o Vite/esbuild transpila), por
// isso alguns acessos ao Blockly usam `any` — a API interna não é 100% tipada.

import * as Blockly from 'blockly/core'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Anima por `ms` chamando `step(progresso 0..1)` a cada quadro (requestAnimationFrame). */
function animar(ms: number, step: (p: number) => void): Promise<void> {
  return new Promise((res) => {
    const t0 = performance.now()
    const fr = (now: number) => {
      const p = Math.min(1, (now - t0) / Math.max(1, ms))
      step(easeInOut(p))
      if (p < 1) requestAnimationFrame(fr)
      else res()
    }
    requestAnimationFrame(fr)
  })
}

// --- Cursor visível --------------------------------------------------------

let cursorEl: HTMLElement | null = null
let cursorX = 40
let cursorY = 40

function garantirCursor(): HTMLElement {
  if (cursorEl) return cursorEl
  const el = document.createElement('div')
  el.setAttribute('data-aulas-cursor', '')
  el.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:44px',
    'height:44px',
    'z-index:2147483647',
    'pointer-events:none',
    'will-change:transform',
    `transform:translate(${cursorX}px,${cursorY}px)`,
  ].join(';')
  el.innerHTML = `
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4 L6 34 L14 26 L20 38 L26 35 L20 24 L32 24 Z"
        fill="#111" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>`
  document.body.appendChild(el)
  cursorEl = el
  return el
}

/** Posiciona o cursor instantaneamente (usado durante o arrasto, quadro a quadro). */
function posicionarCursor(x: number, y: number): void {
  const el = garantirCursor()
  cursorX = x
  cursorY = y
  el.style.transform = `translate(${x}px,${y}px)`
}

/** Move o cursor suavemente de onde está até (x,y) em `ms`. */
function moverCursor(x: number, y: number, ms: number): Promise<void> {
  const fromX = cursorX
  const fromY = cursorY
  return animar(ms, (p) => posicionarCursor(lerp(fromX, x, p), lerp(fromY, y, p)))
}

function pulsoClique(): void {
  const r = document.createElement('div')
  r.style.cssText = [
    'position:fixed',
    `left:${cursorX - 6}px`,
    `top:${cursorY - 6}px`,
    'width:24px',
    'height:24px',
    'border-radius:50%',
    'border:3px solid #22d3ee',
    'z-index:2147483646',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(r)
  r.animate(
    [
      { transform: 'scale(.4)', opacity: 1 },
      { transform: 'scale(1.8)', opacity: 0 },
    ],
    { duration: 450, easing: 'ease-out' },
  ).onfinish = () => r.remove()
}

// --- Geometria workspace <-> tela ------------------------------------------

function ws(): any {
  return Blockly.getMainWorkspace() as any
}
function centro(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}
function injRect(): DOMRect {
  return ws().getInjectionDiv().getBoundingClientRect()
}
function originPx(): { x: number; y: number } {
  const w = ws()
  return w.getOriginOffsetInPixels ? w.getOriginOffsetInPixels() : { x: 0, y: 0 }
}
function wsParaTela(wx: number, wy: number): { x: number; y: number } {
  const s = ws().scale ?? 1
  const i = injRect()
  const o = originPx()
  return { x: i.left + o.x + wx * s, y: i.top + o.y + wy * s }
}
function telaParaWs(sx: number, sy: number): { x: number; y: number } {
  const s = ws().scale ?? 1
  const i = injRect()
  const o = originPx()
  return { x: (sx - i.left - o.x) / s, y: (sy - i.top - o.y) / s }
}

/** Retângulo de tela de um bloco (via SVG root — reflete zoom/scroll atuais). */
function rectDoBloco(block: any): Rect {
  const svg = block.getSvgRoot?.()
  if (svg) {
    const r = svg.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }
  const s = ws().scale ?? 1
  const xy = block.getRelativeToSurfaceXY()
  const hw = block.getHeightWidth()
  const p = wsParaTela(xy.x, xy.y)
  return { x: p.x, y: p.y, w: hw.width * s, h: hw.height * s }
}

function rectDoCampo(block: any, campo?: string): Rect {
  if (campo) {
    const field = block.getField?.(campo)
    if (field?.getScaledBBox) {
      try {
        const b = field.getScaledBBox()
        return { x: b.left, y: b.top, w: b.right - b.left, h: b.bottom - b.top }
      } catch {
        /* cai no bloco */
      }
    }
  }
  return rectDoBloco(block)
}

function primeiroBlocoDoTipo(tipo: string): any | null {
  const list = ws().getBlocksByType(tipo, false)
  return list.length ? list[0] : null
}

/** O bloco correspondente DENTRO do flyout aberto (ponto de "pegar"). */
function blocoNoFlyout(tipo: string): any | null {
  try {
    const fw = ws().getFlyout?.()?.getWorkspace?.()
    const b = fw?.getBlocksByType?.(tipo, false)?.[0]
    if (b?.getSvgRoot) return b
  } catch {
    /* sem flyout */
  }
  return null
}

function centralizar(block: any): void {
  try {
    ws().centerOnBlock?.(block.id)
  } catch {
    /* sem suporte */
  }
}

function setEscala(scale: number): void {
  try {
    ws().setScale?.(scale)
  } catch {
    /* sem suporte */
  }
}

/** Conexão de statement no FIM da cadeia do frame/pai (onde o bloco vai encaixar). */
function conexaoDeEncaixe(paiTipo: string): any | null {
  const pai = primeiroBlocoDoTipo(paiTipo)
  if (!pai) return null
  let conn: any = null
  for (const input of pai.inputList ?? []) {
    if (input.connection && input.connection.type === Blockly.ConnectionType.NEXT_STATEMENT) {
      conn = input.connection
      break
    }
  }
  if (!conn) conn = pai.nextConnection
  let guard = 0
  while (conn?.targetBlock() && guard++ < 500) {
    const next = conn.targetBlock().nextConnection
    if (!next) break
    conn = next
  }
  return conn
}

/** Coord. de workspace onde o TOPO do bloco deve chegar p/ casar com a conexão. */
function destinoDoArrasto(block: any, paiTipo?: string): { x: number; y: number } {
  if (paiTipo) {
    const conn = conexaoDeEncaixe(paiTipo)
    if (conn && typeof conn.x === 'number') {
      const pc = block.previousConnection
      const off = pc?.getOffsetInBlock ? pc.getOffsetInBlock() : { x: 0, y: 0 }
      return { x: conn.x - off.x, y: conn.y - off.y }
    }
    const pai = primeiroBlocoDoTipo(paiTipo)
    if (pai) {
      const p = pai.getRelativeToSurfaceXY()
      return { x: p.x + 40, y: p.y + 60 }
    }
  }
  const i = injRect()
  return telaParaWs(i.left + i.width * 0.4, i.top + i.height * 0.5)
}

function encaixar(block: any, paiTipo: string): void {
  const conn = conexaoDeEncaixe(paiTipo)
  if (!conn || !block?.previousConnection) return
  try {
    conn.connect(block.previousConnection)
  } catch {
    /* fica solto (rascunho) */
  }
}

function abrirCategoriaBlockly(nome: string): void {
  const toolbox = ws().getToolbox?.()
  if (!toolbox) return
  const itens: any[] = toolbox.getToolboxItems?.() ?? []
  const alvo = itens.find(
    (it) => (it.getName?.() ?? '').toLowerCase().trim() === nome.toLowerCase().trim(),
  )
  if (alvo && toolbox.setSelectedItem) toolbox.setSelectedItem(alvo)
}

function rectDaCategoria(nome: string): Rect | null {
  const labels = Array.from(
    document.querySelectorAll(
      '.blocklyToolboxCategory, .blocklyTreeRow, .blocklyToolboxCategoryLabel',
    ),
  ) as HTMLElement[]
  const el = labels.find((l) => (l.textContent ?? '').toLowerCase().includes(nome.toLowerCase()))
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

// --- API pública -----------------------------------------------------------

let ultimoBloco: any = null

export type NivelZoom = 'perto' | 'longe' | 'ajustar' | number

export interface AulasAPI {
  pronto: boolean
  esperarPronto(): Promise<boolean>
  abrirCategoria(nome: string): Promise<void>
  pegarBloco(tipo: string, encaixarEm?: string): Promise<Rect>
  configurarCampo(campo: string, valor: string | number, tipo?: string): Promise<void>
  zoom(nivel: NivelZoom): Promise<void>
  medirAncora(bloco: string, campo?: string): Promise<Rect | null>
  moverPara(x: number, y: number, ms: number): Promise<void>
  testar(ms: number): Promise<void>
}

const api: AulasAPI = {
  pronto: false,

  async esperarPronto() {
    for (let i = 0; i < 400; i++) {
      if (Blockly.getMainWorkspace()) {
        this.pronto = true
        return true
      }
      await espera(150)
    }
    return false
  },

  async abrirCategoria(nome) {
    const r = rectDaCategoria(nome)
    if (r) {
      const c = centro(r)
      await moverCursor(c.x, c.y, 900)
      pulsoClique()
    }
    abrirCategoriaBlockly(nome)
    await espera(350) // deixa o flyout abrir e renderizar os blocos
  },

  async pegarBloco(tipo, encaixarEm) {
    // 1. "Pega" o bloco no flyout: o cursor vai até ele.
    const flyBlock = blocoNoFlyout(tipo)
    const grab = flyBlock ? rectDoBloco(flyBlock) : null
    if (grab) {
      await moverCursor(grab.x + 18, grab.y + 14, 700)
      pulsoClique()
      await espera(150)
    }

    // 2. Cria o bloco real e o posiciona ONDE estava no flyout (para deslizar de lá).
    const block = Blockly.serialization.blocks.append({ type: tipo }, ws())
    const inicio = grab ? telaParaWs(grab.x, grab.y) : block.getRelativeToSurfaceXY()
    try {
      block.moveTo(new Blockly.utils.Coordinate(inicio.x, inicio.y))
    } catch {
      /* ignora */
    }
    // Fecha o flyout p/ o canvas ficar limpo durante o arrasto.
    try {
      ws().getFlyout?.()?.hide?.()
    } catch {
      /* sem flyout */
    }

    // 3. ARRASTA: desliza o bloco (e o cursor) do flyout até a conexão do frame.
    const alvo = destinoDoArrasto(block, encaixarEm)
    await animar(1250, (p) => {
      const wx = lerp(inicio.x, alvo.x, p)
      const wy = lerp(inicio.y, alvo.y, p)
      try {
        block.moveTo(new Blockly.utils.Coordinate(wx, wy))
      } catch {
        /* ignora */
      }
      const s = wsParaTela(wx, wy)
      posicionarCursor(s.x + 16, s.y + 12)
    })

    // 4. SNAP: conecta de fato (encaixe determinístico).
    if (encaixarEm) encaixar(block, encaixarEm)
    ws().render?.()
    ultimoBloco = block
    pulsoClique()
    await espera(300)
    centralizar(block)
    await espera(250)
    return rectDoBloco(block)
  },

  async configurarCampo(campo, valor, tipo) {
    const block = tipo ? primeiroBlocoDoTipo(tipo) : ultimoBloco
    if (!block) return
    // Zoom no detalhe: o campo é justamente "onde precisa" enxergar de perto.
    setEscala(1.35)
    centralizar(block)
    await espera(300)
    const r = rectDoCampo(block, campo)
    const c = centro(r)
    await moverCursor(c.x, c.y, 600)
    pulsoClique()
    try {
      block.setFieldValue(String(valor), campo)
    } catch {
      /* input_value (soquete) — sem field; ignora */
    }
    ws().render?.()
    await espera(250)
  },

  async zoom(nivel) {
    const w = ws()
    if (nivel === 'ajustar') {
      try {
        w.zoomToFit?.()
      } catch {
        /* ignora */
      }
      try {
        w.scrollCenter?.()
      } catch {
        /* ignora */
      }
    } else {
      const s =
        nivel === 'perto' ? 1.35 : nivel === 'longe' ? 0.8 : typeof nivel === 'number' ? nivel : 1
      setEscala(s)
      if (ultimoBloco) centralizar(ultimoBloco)
    }
    await espera(400)
  },

  async medirAncora(bloco, campo) {
    const block = primeiroBlocoDoTipo(bloco)
    if (!block) return null
    centralizar(block)
    await espera(300)
    return rectDoCampo(block, campo)
  },

  async moverPara(x, y, ms) {
    await moverCursor(x, y, ms)
  },

  async testar(ms) {
    await espera(ms)
  },
}

;(window as any).__aulas = api
