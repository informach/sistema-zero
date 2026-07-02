// API de automação INJETADA no playground REAL do Estúdio (packages/studio,
// porta 5173) via `/@fs/` do Vite — NÃO é um app próprio. Como o Vite do
// playground transforma este módulo, os imports `blockly/core` e
// `@sistemazero/studio` resolvem para a MESMA instância do editor, então
// `Blockly.getMainWorkspace()` enxerga o workspace real e a API pública do
// Estúdio (criar/salvar projeto) está disponível. Zero alteração no Estúdio.
//
// Este arquivo NÃO passa pelo typecheck do CI (só o Vite transpila); a API
// interna do Blockly não é 100% tipada, então a superfície usada é declarada
// nos tipos ESTRUTURAIS abaixo (WorkspaceLike etc.) — nada de `any`.

import { createEmptyProject, createLocalPersistenceAdapter } from '@sistemazero/studio'
import * as Blockly from 'blockly/core'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
/** Âncora medida + a ESCALA do workspace (para o balão sair proporcional ao zoom). */
export interface Ancora extends Rect {
  escala: number
}

// --- Superfície TIPADA do Blockly que a automação toca ----------------------
// Tipos estruturais no lugar de `any`: documentam exatamente o que usamos da
// API interna (upgrade do Blockly quebrou algo? o nome aparece aqui).

interface CampoLike {
  getScaledBBox?(): { left: number; top: number; right: number; bottom: number }
}

interface ConexaoLike {
  type: number
  x?: number
  y?: number
  targetBlock(): BlocoLike | null
  connect(outra: ConexaoLike): void
  getOffsetInBlock?(): { x: number; y: number }
}

interface BlocoLike {
  id: string
  getSvgRoot?(): Element | null
  getRelativeToSurfaceXY(): { x: number; y: number }
  getHeightWidth(): { width: number; height: number }
  getField?(nome: string): CampoLike | null
  inputList?: Array<{ connection: ConexaoLike | null }>
  nextConnection: ConexaoLike | null
  previousConnection: ConexaoLike | null
  moveTo(xy: Blockly.utils.Coordinate): void
  setFieldValue(valor: string, campo: string): void
}

interface ToolboxItemLike {
  getName?(): string
}

interface ToolboxLike {
  getToolboxItems?(): ToolboxItemLike[]
  setSelectedItem?(item: ToolboxItemLike): void
}

interface WorkspaceLike {
  scale?: number
  getInjectionDiv(): Element
  getOriginOffsetInPixels?(): { x: number; y: number }
  getBlocksByType(tipo: string, ordenado: boolean): BlocoLike[]
  getFlyout?(): {
    getWorkspace?(): { getBlocksByType?(tipo: string, ordenado: boolean): BlocoLike[] } | null
    hide?(): void
  } | null
  getToolbox?(): ToolboxLike | null
  centerOnBlock?(id: string): void
  setScale?(escala: number): void
  render?(): void
  zoomToFit?(): void
  scrollCenter?(): void
}

const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

// Baseado em setTimeout (não requestAnimationFrame): rAF fica PAUSADO em aba
// oculta/não-focada e a animação travaria; setTimeout no pior caso só afrouxa,
// mas sempre completa (performance.now avança no relógio).
function animar(ms: number, step: (p: number) => void): Promise<void> {
  return new Promise((res) => {
    const t0 = performance.now()
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / Math.max(1, ms))
      step(easeInOut(p))
      if (p < 1) setTimeout(tick, 16)
      else res()
    }
    tick()
  })
}

// --- Cursor visível --------------------------------------------------------

let cursorEl: HTMLElement | null = null
let cursorX = 60
let cursorY = 60

function garantirCursor(): HTMLElement {
  if (cursorEl) return cursorEl
  const el = document.createElement('div')
  el.setAttribute('data-aulas-cursor', '')
  el.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:48px',
    'height:48px',
    'z-index:2147483647',
    'pointer-events:none',
    'will-change:transform',
    'filter:drop-shadow(0 3px 5px rgba(0,0,0,.4))',
    `transform:translate(${cursorX}px,${cursorY}px)`,
  ].join(';')
  el.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4 L6 34 L14 26 L20 38 L26 35 L20 24 L32 24 Z"
        fill="#111" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>`
  document.body.appendChild(el)
  cursorEl = el
  return el
}

function posicionarCursor(x: number, y: number): void {
  const el = garantirCursor()
  cursorX = x
  cursorY = y
  el.style.transform = `translate(${x}px,${y}px)`
}

function moverCursor(x: number, y: number, ms: number): Promise<void> {
  const fromX = cursorX
  const fromY = cursorY
  return animar(ms, (p) => posicionarCursor(lerp(fromX, x, p), lerp(fromY, y, p)))
}

/** Anel de clique BEM visível (dois anéis + duração maior) no ponto do cursor. */
function pulsoClique(): void {
  for (const [cor, atraso] of [
    ['#22d3ee', 0],
    ['#f59e0b', 120],
  ] as const) {
    const r = document.createElement('div')
    r.style.cssText = [
      'position:fixed',
      `left:${cursorX - 4}px`,
      `top:${cursorY - 4}px`,
      'width:8px',
      'height:8px',
      'border-radius:50%',
      `border:4px solid ${cor}`,
      'z-index:2147483646',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(r)
    r.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(7)', opacity: 0 },
      ],
      {
        duration: 700,
        delay: atraso,
        easing: 'ease-out',
        fill: 'forwards',
      },
    ).onfinish = () => r.remove()
  }
}

/** Contorno pulsante ao redor de um retângulo (destaca ONDE a ação acontece). */
function destacar(rect: Rect, ms: number): void {
  const el = document.createElement('div')
  el.style.cssText = [
    'position:fixed',
    `left:${rect.x - 5}px`,
    `top:${rect.y - 5}px`,
    `width:${rect.w + 10}px`,
    `height:${rect.h + 10}px`,
    'border:4px solid #f59e0b',
    'border-radius:12px',
    'box-shadow:0 0 0 4px rgba(245,158,11,.25)',
    'z-index:2147483645',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(el)
  el.animate(
    [
      { opacity: 0, transform: 'scale(1.06)' },
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.04)' },
    ],
    { duration: ms, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => el.remove()
}

// --- Geometria workspace <-> tela ------------------------------------------

function ws(): WorkspaceLike {
  return Blockly.getMainWorkspace() as unknown as WorkspaceLike
}
function escalaAtual(): number {
  return ws().scale ?? 1
}
function centro(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}
function injRect(): DOMRect {
  return ws().getInjectionDiv().getBoundingClientRect()
}
function originPx(): { x: number; y: number } {
  return ws().getOriginOffsetInPixels?.() ?? { x: 0, y: 0 }
}
function wsParaTela(wx: number, wy: number): { x: number; y: number } {
  const s = escalaAtual()
  const i = injRect()
  const o = originPx()
  return { x: i.left + o.x + wx * s, y: i.top + o.y + wy * s }
}
function telaParaWs(sx: number, sy: number): { x: number; y: number } {
  const s = escalaAtual()
  const i = injRect()
  const o = originPx()
  return { x: (sx - i.left - o.x) / s, y: (sy - i.top - o.y) / s }
}

function rectDoBloco(block: BlocoLike): Rect {
  const svg = block.getSvgRoot?.()
  if (svg) {
    const r = svg.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }
  const s = escalaAtual()
  const xy = block.getRelativeToSurfaceXY()
  const hw = block.getHeightWidth()
  const p = wsParaTela(xy.x, xy.y)
  return { x: p.x, y: p.y, w: hw.width * s, h: hw.height * s }
}

function rectDoCampo(block: BlocoLike, campo?: string): Rect {
  if (campo) {
    const field = block.getField?.(campo)
    if (field?.getScaledBBox) {
      try {
        const b = field.getScaledBBox()
        return { x: b.left, y: b.top, w: b.right - b.left, h: b.bottom - b.top }
      } catch {
        /* cai no soquete/bloco */
      }
    }
    // Soquete de VALOR (x/y): não tem field → mede a CONEXÃO do input e cerca um
    // retângulo pequeno nela (senão o balão do X ancoraria no bloco INTEIRO).
    const conn = (
      block as { getInput?: (n: string) => { connection?: { x: number; y: number } } | null }
    ).getInput?.(campo)?.connection
    if (conn && typeof conn.x === 'number') {
      const s = wsParaTela(conn.x, conn.y)
      const esc = escalaAtual()
      const w = 56 * esc
      const h = 42 * esc
      return { x: s.x - 8, y: s.y - h / 2, w, h }
    }
  }
  return rectDoBloco(block)
}

function primeiroBlocoDoTipo(tipo: string): BlocoLike | null {
  const list = ws().getBlocksByType(tipo, false)
  return list.length ? (list[0] ?? null) : null
}

function blocoNoFlyout(tipo: string): BlocoLike | null {
  try {
    const fw = ws().getFlyout?.()?.getWorkspace?.()
    const b = fw?.getBlocksByType?.(tipo, false)?.[0]
    if (b?.getSvgRoot) return b
  } catch {
    /* sem flyout */
  }
  return null
}

function centralizar(block: BlocoLike): void {
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

/**
 * Zoom que faz o bloco CABER bem na tela (≈82% da largura útil), preso entre 0.9
 * e 1.7, e centraliza. Bloco largo afasta (não estoura o quadro), bloco estreito
 * aproxima — e o balão, proporcional ao tamanho renderizado, acompanha.
 */
function ajustarZoomAoBloco(block: BlocoLike): void {
  try {
    const largBloco1 = block.getHeightWidth?.().width ?? 200 // coords de ws (escala 1)
    const alvo = (injRect().width * 0.82) / Math.max(60, largBloco1)
    setEscala(Math.min(1.7, Math.max(0.9, alvo)))
  } catch {
    /* mantém a escala */
  }
  centralizar(block)
}

function conexaoDeEncaixe(paiTipo: string): ConexaoLike | null {
  const pai = primeiroBlocoDoTipo(paiTipo)
  if (!pai) return null
  let conn: ConexaoLike | null = null
  for (const input of pai.inputList ?? []) {
    if (input.connection && input.connection.type === Blockly.ConnectionType.NEXT_STATEMENT) {
      conn = input.connection
      break
    }
  }
  if (!conn) conn = pai.nextConnection
  let guard = 0
  while (conn?.targetBlock() && guard++ < 500) {
    const next = conn.targetBlock()?.nextConnection
    if (!next) break
    conn = next
  }
  return conn
}

function destinoDoArrasto(block: BlocoLike, paiTipo?: string): { x: number; y: number } {
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
  return telaParaWs(i.left + i.width * 0.45, i.top + i.height * 0.5)
}

function encaixar(block: BlocoLike, paiTipo: string): void {
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
  const itens: ToolboxItemLike[] = toolbox.getToolboxItems?.() ?? []
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

function botaoPreview(): HTMLButtonElement | null {
  const q =
    document.querySelector('button[title*="pré-visualização" i]') ||
    document.querySelector('button[aria-label*="pré-visualização" i]')
  return (q as HTMLButtonElement) ?? null
}
function rotuloBotao(b: HTMLButtonElement): string {
  return (b.title || b.getAttribute('aria-label') || '').toLowerCase()
}

// --- API pública -----------------------------------------------------------

let ultimoBloco: BlocoLike | null = null
// Projeto semeado (vazio OU o final da aula anterior). Guardado para o
// `exportarProjeto` devolver a base + o blocksState ATUAL (fim desta aula = início
// da próxima). É o que encadeia o curso: cada aula parte do resultado da anterior.
// biome-ignore lint/suspicious/noExplicitAny: Project é do @sistemazero/studio; aqui só repassamos.
let projetoBase: any = null

export type NivelZoom = 'perto' | 'longe' | 'ajustar' | number

export interface AulasAPI {
  esperarPronto(): Promise<boolean>
  criarProjetoAula(id: string, nome: string, extensoes: string[]): Promise<string>
  criarProjetoDeBase(base: unknown, id: string, nome: string, extensoes: string[]): Promise<string>
  exportarProjeto(id: string): Promise<unknown>
  esconderPreview(): Promise<void>
  mostrarPreview(): Promise<void>
  abrirCategoria(nome: string): Promise<void>
  pegarBloco(tipo: string, encaixarEm?: string): Promise<Rect>
  configurarCampo(campo: string, valor: string | number, tipo?: string): Promise<void>
  zoom(nivel: NivelZoom): Promise<void>
  medirAncora(bloco: string, campo?: string): Promise<Ancora | null>
  moverPara(x: number, y: number, ms: number): Promise<void>
  testar(ms: number): Promise<void>
}

const api: AulasAPI = {
  async esperarPronto() {
    for (let i = 0; i < 400; i++) {
      if (Blockly.getMainWorkspace()) return true
      await espera(150)
    }
    return false
  },

  // Semeia um projeto VAZIO (com os 3 frames) + extensões, via a API pública do
  // Estúdio, e salva no IndexedDB local. O driver então navega p/ /editor/<id>.
  async criarProjetoAula(id, nome, extensoes) {
    const projeto = createEmptyProject(id, nome)
    if (extensoes?.length) {
      // Espelha o installExtension do Estúdio: registra em installedExtensions E
      // em ir.extensions — sem o segundo, o load trata a extensão como órfã e o
      // flyout da categoria (ex.: Jogo 2D) vem VAZIO.
      projeto.installedExtensions = extensoes.map((x) => ({
        id: x,
        version: '0.0.0',
        installedAt: 0,
      }))
      projeto.ir = {
        ...projeto.ir,
        extensions: extensoes.map((x) => ({ extensionId: x })),
      }
    }
    const adapter = createLocalPersistenceAdapter()
    await adapter.save(projeto)
    projetoBase = projeto
    return id
  },

  // Semeia a partir do PROJETO FINAL da aula anterior (um Project completo:
  // files/ir/blocksState/installedExtensions/assets). Sobrescreve id/nome e
  // salva. É o que faz a aula continuar de onde a anterior parou.
  async criarProjetoDeBase(base, id, nome, extensoes) {
    // biome-ignore lint/suspicious/noExplicitAny: Project vem do host, só ajustamos id/nome.
    const projeto: any = { ...(base as object), id, name: nome }
    // Garante as extensões (se a base não trouxe, usa as do roteiro) — sem
    // installedExtensions + ir.extensions o flyout da categoria vem vazio.
    if ((!projeto.installedExtensions || !projeto.installedExtensions.length) && extensoes?.length) {
      projeto.installedExtensions = extensoes.map((x) => ({ id: x, version: '0.0.0', installedAt: 0 }))
      projeto.ir = { ...(projeto.ir ?? {}), extensions: extensoes.map((x) => ({ extensionId: x })) }
    }
    const adapter = createLocalPersistenceAdapter()
    await adapter.save(projeto)
    projetoBase = projeto
    return id
  },

  // Devolve o Project ATUAL (base + blocksState do workspace agora) para virar o
  // `inicial` da PRÓXIMA aula. Serializa o workspace direto (não depende do
  // autosave debounced).
  async exportarProjeto(id) {
    // biome-ignore lint/suspicious/noExplicitAny: serialização do Blockly é livre.
    const blocksState = (Blockly as any).serialization.workspaces.save(ws())
    return { ...(projetoBase ?? {}), id, blocksState }
  },

  async esconderPreview() {
    const b = botaoPreview()
    if (b && /ocultar|esconder/.test(rotuloBotao(b))) {
      b.click()
      await espera(500)
    }
  },
  async mostrarPreview() {
    const b = botaoPreview()
    if (b && /mostrar|exibir/.test(rotuloBotao(b))) {
      b.click()
      await espera(700)
    }
  },

  async abrirCategoria(nome) {
    const r = rectDaCategoria(nome)
    if (r) {
      const c = centro(r)
      await moverCursor(c.x, c.y, 900)
      pulsoClique()
      destacar(r, 1100)
    }
    abrirCategoriaBlockly(nome)
    await espera(400)
  },

  async pegarBloco(tipo, encaixarEm) {
    const flyBlock = blocoNoFlyout(tipo)
    const grab = flyBlock ? rectDoBloco(flyBlock) : null
    if (grab) {
      await moverCursor(grab.x + 18, grab.y + 14, 700)
      pulsoClique()
      await espera(150)
    }
    const block = Blockly.serialization.blocks.append(
      { type: tipo },
      Blockly.getMainWorkspace() as Blockly.Workspace,
    ) as unknown as BlocoLike
    const inicio = grab ? telaParaWs(grab.x, grab.y) : block.getRelativeToSurfaceXY()
    try {
      block.moveTo(new Blockly.utils.Coordinate(inicio.x, inicio.y))
    } catch {
      /* ignora */
    }
    try {
      ws().getFlyout?.()?.hide?.()
    } catch {
      /* sem flyout */
    }
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
    if (encaixarEm) encaixar(block, encaixarEm)
    ws().render?.()
    ultimoBloco = block
    pulsoClique()
    await espera(250)
    ajustarZoomAoBloco(block)
    await espera(300)
    const r = rectDoBloco(block)
    destacar(r, 1200)
    return r
  },

  async configurarCampo(campo, valor, tipo) {
    const block = tipo ? primeiroBlocoDoTipo(tipo) : ultimoBloco
    if (!block) return
    ajustarZoomAoBloco(block)
    await espera(300)
    const r = rectDoCampo(block, campo)
    const c = centro(r)
    await moverCursor(c.x, c.y, 600)
    pulsoClique()
    destacar(r, 1100)
    try {
      block.setFieldValue(String(valor), campo)
    } catch {
      /* input_value (soquete) — sem field */
    }
    ws().render?.()
    await espera(300)
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
    // Zoom que faz o bloco caber → o balão (proporcional) fica bom. O anel de
    // destaque do balão é desenhado na montagem (Remotion), então NÃO destacamos
    // aqui para não dobrar o contorno.
    ajustarZoomAoBloco(block)
    await espera(350)
    const r = rectDoCampo(block, campo)
    return { ...r, escala: escalaAtual() }
  },

  async moverPara(x, y, ms) {
    await moverCursor(x, y, ms)
  },

  async testar(ms) {
    await this.mostrarPreview()
    await espera(ms)
    await this.esconderPreview()
  },
}

declare global {
  interface Window {
    /** API de automação consumida pelo driver Playwright (src/steps/04-tela). */
    __aulas?: AulasAPI
  }
}

window.__aulas = api
