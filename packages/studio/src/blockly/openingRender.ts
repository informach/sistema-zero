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
 * - `dom.getTextWidth` chama `getComputedStyle` por campo (3,1 s com 5 mil). Medir menos aqui
 *   NÃO é seguro (ver o aviso abaixo): fica como está.
 *
 * O atalho do Drawer não muda o resultado: o mesmo desenho, sem a conta que ninguém usa. A fonte
 * dos blocos é carregada antes de abrir, para o primeiro desenho já sair com ela.
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

type OpeningFontSet = Pick<FontFaceSet, 'status' | 'ready'> & { load?: FontFaceSet['load'] }

function fontsOf(doc: Document): OpeningFontSet | undefined {
  return (doc as Document & { fonts?: OpeningFontSet }).fonts
}

/*
 * ⚠️ REMOVIDO na revisão de 19/11/2026: a memória GLOBAL de larguras de texto do Blockly durante a
 * abertura. A chave dela é texto + classe, e a mesma frase com a mesma classe tem fonte calculada
 * diferente conforme onde está: a largura de um bloco passava para outro (o cabeçalho "Ao iniciar"
 * saía 8 px mais estreito, 41 de 70 blocos da aula diferentes do desenho de antes). O próprio Blockly
 * só a liga dentro do desenho de UM bloco. Não religar sem a prova de geometria igual.
 */

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
  /** A fonte dos blocos (`fontStyle` do tema): carregada ANTES, para não chegar no meio do desenho. */
  blockFont?: string,
): Promise<void> {
  const fonts = fontsOf(doc)
  if (!fonts) return Promise.resolve()
  const waits: Promise<unknown>[] = []
  if (blockFont && typeof fonts.load === 'function') {
    try {
      waits.push(fonts.load(blockFont))
    } catch {
      // Especificação de fonte inválida: abre como sempre abriu.
    }
  }
  if (fonts.status === 'loading' && typeof fonts.ready?.then === 'function') waits.push(fonts.ready)
  if (!waits.length) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, maxMs)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    Promise.allSettled(waits).then(done, done)
  })
}

/** O `font` CSS dos blocos a partir do `fontStyle` do tema do workspace. */
export function blockFontSpec(workspace: Blockly.WorkspaceSvg): string | undefined {
  const style = workspace.getTheme?.()?.fontStyle
  if (!style?.family) return undefined
  return `${style.weight ?? 'normal'} ${style.size ?? 12}pt ${style.family}`
}
