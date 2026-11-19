import * as Blockly from 'blockly/core'

/**
 * Abertura do Clássico sem trabalho jogado fora (lote 2.2, 19/11/2026).
 *
 * Perfil de CPU de 5 mil blocos (Chromium, `scripts/measure-classic-opening.mjs`):
 * - `Drawer` (renderers/common/drawer.ts) faz `this.topLeft_ = block.getRelativeToSurfaceXY()`
 *   no construtor de TODO desenho, e nada no Blockly 12.5.1 lê `topLeft_` (conferido no
 *   `blockly_compressed.js`: uma atribuição, nenhuma leitura). Os eventos ficam numa cadeia
 *   `next` só, com cada SVG dentro do anterior, então a subida pelo DOM é O(profundidade) por
 *   bloco: 0,9 s com 5 mil, quadrático no tamanho.
 * - `dom.getTextWidth` chama `getComputedStyle` por campo (3,1 s com 5 mil). O Blockly já tem
 *   memória de larguras (texto + classe), mas só dura o desenho de UM bloco
 *   (`renderEfficiently`). Ligá-la só durante `workspaces.load` (tentado em 18/11) não pega
 *   nada: o desenho acontece depois, no quadro seguinte.
 *
 * Nenhuma das duas muda o resultado: o mesmo desenho, sem a conta que ninguém usa e sem medir
 * de novo o mesmo texto com a mesma classe e a mesma fonte.
 */

type DrawerFactory = (block: Blockly.BlockSvg, info: unknown) => unknown

let drawerShortcutInstalled = false
let skipSurfaceXY = 0

/**
 * Enquanto o renderer cria o `Drawer`, a posição devolvida é a origem: o construtor guarda o
 * valor num campo que o Blockly nunca lê. Fora dali, a função de sempre.
 */
export function installDrawerOriginShortcut(): void {
  if (drawerShortcutInstalled) return
  drawerShortcutInstalled = true
  const blockProto = Blockly.BlockSvg.prototype
  const surfaceXY = blockProto.getRelativeToSurfaceXY
  blockProto.getRelativeToSurfaceXY = function (this: Blockly.BlockSvg) {
    return skipSurfaceXY > 0 ? new Blockly.utils.Coordinate(0, 0) : surfaceXY.call(this)
  }
  for (const Renderer of [Blockly.zelos.Renderer, Blockly.blockRendering.Renderer]) {
    const proto = Renderer.prototype as unknown as { makeDrawer_: DrawerFactory }
    if (!Object.hasOwn(proto, 'makeDrawer_')) continue
    const makeDrawer = proto.makeDrawer_
    proto.makeDrawer_ = function (this: unknown, block, info) {
      skipSurfaceXY++
      try {
        return makeDrawer.call(this, block, info)
      } finally {
        skipSurfaceXY--
      }
    }
  }
}

/** Só para os testes: quantas vezes o atalho está ativo agora. */
export function drawerShortcutDepthForTests(): number {
  return skipSurfaceXY
}

/** Prazo de segurança: a memória nunca sobrevive à abertura, mesmo se o fim não vier. */
const OPENING_CACHE_MAX_MS = 60_000

/**
 * Liga a memória de larguras de texto do Blockly durante a abertura inteira (carga + desenho
 * + repintura). Só quando as fontes da página já carregaram: medir antes da fonte é o defeito
 * que a repintura pós-carga existe para consertar, e a memória o tornaria permanente.
 * Devolve o desligar, idempotente.
 */
export function beginOpeningTextWidthCache(doc: Document = document): () => void {
  const fonts = (doc as Document & { fonts?: { status?: string } }).fonts
  if (fonts?.status !== 'loaded') return () => undefined
  Blockly.utils.dom.startTextWidthCache()
  let active = true
  const stop = () => {
    if (!active) return
    active = false
    clearTimeout(safety)
    Blockly.utils.dom.stopTextWidthCache()
  }
  const safety = setTimeout(stop, OPENING_CACHE_MAX_MS)
  return stop
}

/** Espera máxima pela fonte antes de abrir: depois disso, abre como sempre abriu. */
export const OPENING_FONTS_MAX_WAIT_MS = 1500

/**
 * Resolve quando as fontes da página terminam de carregar (ou no prazo). Sem fonte carregando,
 * resolve na hora. Sem isto a memória de larguras nunca liga na primeira abertura (a fonte da
 * marca ainda chega quando o projeto abre) e a repintura de `fonts.ready` desenha o projeto
 * inteiro de novo logo depois.
 */
export function waitForOpeningFonts(
  doc: Document = document,
  maxMs: number = OPENING_FONTS_MAX_WAIT_MS,
): Promise<void> {
  const fonts = (doc as Document & { fonts?: { status?: string; ready?: Promise<unknown> } }).fonts
  if (fonts?.status !== 'loading' || typeof fonts.ready?.then !== 'function')
    return Promise.resolve()
  const ready = fonts.ready
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, maxMs)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    ready.then(done, done)
  })
}
