import * as Blockly from 'blockly/core'
import { resolveTileset } from './FieldSolidTilesPicker'

/**
 * Campo Blockly da GRADE do bloco "Criar mapa de tiles": o VALOR continua sendo
 * a MESMA string de sempre (`'0 1 .;. 2 .'` — células por espaço, linhas por
 * `;`, `.` = vazio), então serialização/IR/parser/round-trip ficam idênticos a
 * um `field_input`; este campo só troca o EDITOR por um mini-editor de mapa
 * estilo MakeCode: paleta de peças (fatiadas da imagem do campo IMAGE irmão) +
 * grade clicável E arrastável + redimensionar linhas/colunas. Sem tileset
 * resolvível → textarea de texto (o comportamento de sempre, só que multilinha).
 */

/** Limites de CRESCIMENTO pela UI (grades maiores — coladas — rolam e só travam o +). */
const MAX_UI_COLS = 40
const MAX_UI_ROWS = 30
/** Grade nova quando o valor está vazio. */
const DEFAULT_COLS = 6
const DEFAULT_ROWS = 4

/**
 * Tokeniza o texto da grade com as MESMAS regras do `parseGrid` do runtime:
 * colunas separadas por espaço/tab/vírgula, linhas por `;`/quebra de linha;
 * `.` ou `-` (ou célula vazia) = -1. Fiel byte a byte — o que este editor lê e
 * grava é exatamente o que o jogo vai ler.
 */
export function parseGridText(text: string): number[][] {
  const rows: number[][] = []
  let row: number[] = []
  let token = ''
  const pushToken = () => {
    if (token === '') return
    if (token === '.' || token === '-') row.push(-1)
    else {
      const n = Number.parseInt(token, 10)
      row.push(Number.isInteger(n) && n >= 0 ? n : -1)
    }
    token = ''
  }
  const pushRow = () => {
    pushToken()
    rows.push(row)
    row = []
  }
  for (const ch of text) {
    if (ch === ' ' || ch === '\t' || ch === ',') pushToken()
    else if (ch === ';' || ch === '\n' || ch === '\r') pushRow()
    else token += ch
  }
  pushToken()
  if (row.length > 0) rows.push(row)
  return rows.filter((r) => r.length > 0)
}

/** Preenche linhas irregulares com -1 até o retângulo (inócuo para o runtime). */
export function normalizeRect(rows: number[][]): { cells: number[][]; cols: number; rows: number } {
  const cols = rows.reduce((max, r) => Math.max(max, r.length), 0)
  const cells = rows.map((r) => {
    const out = r.slice()
    while (out.length < cols) out.push(-1)
    return out
  })
  return { cells, cols, rows: cells.length }
}

/** Serializa no formato canônico do bloco/Pinta: `-1` → `.`, espaço e `;`. */
export function serializeGrid(cells: number[][]): string {
  return cells.map((r) => r.map((v) => (v < 0 ? '.' : String(v))).join(' ')).join(';')
}

/** Recorta/estende a grade para cols×rows (células novas nascem vazias). */
export function resizeGrid(cells: number[][], cols: number, rows: number): number[][] {
  const out: number[][] = []
  for (let r = 0; r < rows; r += 1) {
    const src = cells[r] ?? []
    const line: number[] = []
    for (let c = 0; c < cols; c += 1) line.push(src[c] ?? -1)
    out.push(line)
  }
  return out
}

/** Reaplica o data-sz-theme do root no DropDownDiv portalado (padrão dos irmãos). */
function applyThemeScope(field: Blockly.Field, content: HTMLElement): void {
  const workspace = field.getSourceBlock()?.workspace as { getInjectionDiv?(): unknown } | undefined
  const injectionDiv = workspace?.getInjectionDiv?.()
  const scope = injectionDiv instanceof HTMLElement ? injectionDiv.closest('[data-sz-theme]') : null
  const theme = scope?.getAttribute('data-sz-theme')
  if (theme) content.setAttribute('data-sz-theme', theme)
}

const CELL_PX = 26
const CELL_CANVAS_PX = 24

export class FieldTileGrid extends Blockly.FieldTextInput {
  static override fromJson(options: Blockly.FieldTextInputFromJsonConfig): FieldTileGrid {
    return new FieldTileGrid(`${options.text ?? ''}`)
  }

  protected override showEditor_(): void {
    const info = resolveTileset(this)
    const content = Blockly.DropDownDiv.getContentDiv()
    content.textContent = ''
    applyThemeScope(this, content)

    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:8px;max-width:min(560px,84vw);background:var(--color-sz-panel);font-family:Inter,system-ui,sans-serif;'

    if (!info) {
      this.renderTextFallback(wrap)
      content.appendChild(wrap)
      Blockly.DropDownDiv.showPositionedByField(this, () => {})
      return
    }

    // Estado do editor: a grade atual (retangularizada) + a peça selecionada.
    const parsed = normalizeRect(parseGridText(`${this.getValue() ?? ''}`))
    let cells = parsed.rows > 0 ? parsed.cells : resizeGrid([], DEFAULT_COLS, DEFAULT_ROWS)
    let selected = 0 // índice da peça na paleta; -1 = borracha
    let painting = false
    let sheetLoaded = false

    const sheet = new Image()

    const help = document.createElement('div')
    help.textContent = 'Escolha uma peça e PINTE a grade (clique ou arraste). A borracha apaga.'
    help.style.cssText =
      'font-size:11px;color:var(--color-sz-fg-soft);padding:0 0 6px;line-height:1.4;'

    // ---- Paleta de peças (fatiada da imagem do tileset) + borracha ----
    const palette = document.createElement('div')
    palette.style.cssText =
      'display:flex;gap:4px;overflow-x:auto;padding-bottom:6px;align-items:center;'
    const paletteButtons: HTMLButtonElement[] = []
    const paintPaletteSel = () => {
      paletteButtons.forEach((b, i) => {
        const idx = i === 0 ? -1 : i - 1
        const on = idx === selected
        b.style.borderColor = on ? 'var(--color-sz-accent)' : 'var(--color-sz-border)'
        b.style.boxShadow = on ? '0 0 0 2px var(--color-sz-accent) inset' : 'none'
      })
    }
    const makePaletteBtn = (label: string, title: string): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.title = title
      btn.style.cssText =
        'position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 auto;border:2px solid var(--color-sz-border);border-radius:6px;background:var(--color-sz-bg);cursor:pointer;padding:0;font-size:14px;'
      btn.textContent = label
      return btn
    }
    const eraser = makePaletteBtn('🧽', 'Borracha (célula vazia)')
    eraser.addEventListener('click', () => {
      selected = -1
      paintPaletteSel()
    })
    paletteButtons.push(eraser)
    palette.appendChild(eraser)
    for (let idx = 0; idx < info.count; idx += 1) {
      const btn = makePaletteBtn('', `Peça ${idx}`)
      const canvas = document.createElement('canvas')
      canvas.width = CELL_CANVAS_PX
      canvas.height = CELL_CANVAS_PX
      canvas.style.cssText = `image-rendering:pixelated;width:${CELL_CANVAS_PX}px;height:${CELL_CANVAS_PX}px;`
      btn.appendChild(canvas)
      const num = document.createElement('small')
      num.textContent = String(idx)
      num.style.cssText =
        'position:absolute;bottom:0;right:1px;font-size:8px;color:var(--color-sz-fg-soft);'
      btn.appendChild(num)
      btn.addEventListener('click', () => {
        selected = idx
        paintPaletteSel()
      })
      paletteButtons.push(btn)
      palette.appendChild(btn)
    }
    paintPaletteSel()

    const drawTileInto = (canvas: HTMLCanvasElement | null, idx: number) => {
      const ctx = canvas?.getContext('2d')
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (idx < 0) return
      if (!sheetLoaded) return
      ctx.imageSmoothingEnabled = false
      const sx = (idx % info.cols) * info.tileSize
      const sy = Math.floor(idx / info.cols) * info.tileSize
      ctx.drawImage(sheet, sx, sy, info.tileSize, info.tileSize, 0, 0, canvas.width, canvas.height)
    }

    // ---- Grade pintável ----
    const gridBox = document.createElement('div')
    gridBox.style.cssText =
      'overflow:auto;max-height:300px;max-width:100%;border:1px solid var(--color-sz-border);border-radius:6px;padding:4px;touch-action:none;background:var(--color-sz-bg);'
    const cellCanvases: (HTMLCanvasElement | null)[][] = []

    const paintCell = (r: number, c: number) => {
      const value = cells[r]?.[c] ?? -1
      const canvas = cellCanvases[r]?.[c] ?? null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (value < 0) {
        // xadrez de "vazio" (2 tons discretos)
        ctx.fillStyle = 'rgba(127,127,127,0.12)'
        ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2)
        ctx.fillRect(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2)
        return
      }
      drawTileInto(canvas, value)
    }

    const applyToCell = (r: number, c: number) => {
      const row = cells[r]
      if (!row || c < 0 || c >= row.length) return
      if (row[c] === selected) return
      row[c] = selected
      paintCell(r, c)
    }

    const sizeLabel = document.createElement('span')
    sizeLabel.style.cssText = 'font-size:11px;color:var(--color-sz-fg-soft);min-width:52px;'

    const renderGrid = () => {
      gridBox.textContent = ''
      cellCanvases.length = 0
      const rowsN = cells.length
      const colsN = cells[0]?.length ?? 0
      sizeLabel.textContent = `${colsN} × ${rowsN}`
      const table = document.createElement('div')
      table.style.cssText = `display:grid;grid-template-columns:repeat(${Math.max(colsN, 1)},${CELL_PX}px);gap:2px;width:max-content;`
      for (let r = 0; r < rowsN; r += 1) {
        const rowCanvases: (HTMLCanvasElement | null)[] = []
        for (let c = 0; c < colsN; c += 1) {
          const cell = document.createElement('button')
          cell.type = 'button'
          const value = cells[r]?.[c] ?? -1
          cell.setAttribute(
            'aria-label',
            `linha ${r + 1} coluna ${c + 1}: ${value < 0 ? 'vazia' : `peça ${value}`}`,
          )
          cell.style.cssText = `width:${CELL_PX}px;height:${CELL_PX}px;padding:0;border:1px solid var(--color-sz-border);border-radius:3px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;`
          const canvas = document.createElement('canvas')
          canvas.width = CELL_CANVAS_PX
          canvas.height = CELL_CANVAS_PX
          canvas.style.cssText = `image-rendering:pixelated;width:${CELL_CANVAS_PX}px;height:${CELL_CANVAS_PX}px;pointer-events:none;`
          cell.appendChild(canvas)
          rowCanvases.push(canvas)
          cell.addEventListener('pointerdown', (ev) => {
            ev.preventDefault()
            painting = true
            applyToCell(r, c)
          })
          cell.addEventListener('pointerenter', () => {
            if (painting) applyToCell(r, c)
          })
          table.appendChild(cell)
        }
        cellCanvases.push(rowCanvases)
      }
      gridBox.appendChild(table)
      for (let r = 0; r < rowsN; r += 1) {
        for (let c = 0; c < colsN; c += 1) paintCell(r, c)
      }
    }

    const stopPainting = () => {
      painting = false
    }
    window.addEventListener('pointerup', stopPainting)
    window.addEventListener('pointercancel', stopPainting)

    // ---- Redimensionar (colunas × linhas) ----
    const stepper = (label: string, onMinus: () => void, onPlus: () => void): HTMLElement => {
      const box = document.createElement('div')
      box.style.cssText = 'display:flex;align-items:center;gap:2px;'
      const tag = document.createElement('span')
      tag.textContent = label
      tag.style.cssText = 'font-size:10px;color:var(--color-sz-fg-soft);'
      const mk = (txt: string, fn: () => void) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = txt
        b.style.cssText =
          'width:22px;height:22px;border:1px solid var(--color-sz-border);border-radius:4px;background:var(--color-sz-bg);color:var(--color-sz-fg);cursor:pointer;font-size:12px;line-height:1;'
        b.addEventListener('click', fn)
        return b
      }
      box.append(tag, mk('−', onMinus), mk('+', onPlus))
      return box
    }
    const resize = (dc: number, dr: number) => {
      const colsN = Math.max(1, Math.min(MAX_UI_COLS, (cells[0]?.length ?? 1) + dc))
      const rowsN = Math.max(1, Math.min(MAX_UI_ROWS, cells.length + dr))
      cells = resizeGrid(cells, colsN, rowsN)
      renderGrid()
    }

    // ---- Rodapé ----
    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap;'
    const clear = document.createElement('button')
    clear.type = 'button'
    clear.textContent = 'Limpar'
    clear.style.cssText =
      'padding:3px 8px;background:transparent;color:var(--color-sz-fg-soft);border:1px solid var(--color-sz-border);border-radius:4px;cursor:pointer;font-size:11px;'
    clear.addEventListener('click', () => {
      cells = resizeGrid([], cells[0]?.length ?? DEFAULT_COLS, cells.length || DEFAULT_ROWS)
      renderGrid()
    })
    const apply = document.createElement('button')
    apply.type = 'button'
    apply.textContent = 'Aplicar'
    apply.style.cssText =
      'margin-left:auto;padding:3px 12px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    apply.addEventListener('click', () => {
      this.setValue(serializeGrid(cells))
      Blockly.DropDownDiv.hideIfOwner(this)
    })
    footer.append(
      sizeLabel,
      stepper(
        'colunas',
        () => resize(-1, 0),
        () => resize(1, 0),
      ),
      stepper(
        'linhas',
        () => resize(0, -1),
        () => resize(0, 1),
      ),
      clear,
      apply,
    )

    wrap.append(help, palette, gridBox, footer)
    content.appendChild(wrap)
    renderGrid()

    // Thumbs chegam quando a folha carrega (CSP-safe: new Image() + data URL —
    // NUNCA fetch('data:')).
    sheet.onload = () => {
      sheetLoaded = true
      paletteButtons.forEach((b, i) => {
        if (i === 0) return
        drawTileInto(b.querySelector('canvas'), i - 1)
      })
      for (let r = 0; r < cells.length; r += 1) {
        for (let c = 0; c < (cells[r]?.length ?? 0); c += 1) paintCell(r, c)
      }
    }
    sheet.src = info.asset.dataUrl

    Blockly.DropDownDiv.showPositionedByField(this, () => {
      window.removeEventListener('pointerup', stopPainting)
      window.removeEventListener('pointercancel', stopPainting)
    })
  }

  /** Editor de texto (sem tileset resolvível): textarea multilinha + OK. */
  private renderTextFallback(wrap: HTMLElement): void {
    const help = document.createElement('div')
    help.textContent =
      'Escolha primeiro a IMAGEM das peças (tileset) para pintar a grade — ou edite o texto: espaço separa colunas, ";" separa linhas, "." é vazio.'
    help.style.cssText =
      'font-size:11px;color:var(--color-sz-fg-soft);padding:0 0 6px;line-height:1.4;max-width:260px;'
    const area = document.createElement('textarea')
    area.value = `${this.getValue() ?? ''}`.split(';').join(';\n')
    area.rows = 5
    area.spellcheck = false
    area.style.cssText =
      'width:260px;padding:4px 6px;border:1px solid var(--color-sz-border);background:var(--color-sz-bg);color:var(--color-sz-fg);border-radius:4px;font-size:12px;font-family:"JetBrains Mono",ui-monospace,monospace;outline:none;resize:vertical;'
    area.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
    })
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.style.cssText =
      'margin-top:6px;padding:3px 12px;background:var(--color-sz-accent);color:var(--color-sz-bg);border:0;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
    ok.addEventListener('click', () => {
      // Normaliza quebras de linha de volta para ';' (formato canônico do bloco).
      this.setValue(serializeGrid(normalizeRect(parseGridText(area.value)).cells))
      Blockly.DropDownDiv.hideIfOwner(this)
    })
    wrap.append(help, area, ok)
    setTimeout(() => area.focus({ preventScroll: true }), 0)
  }
}

let registered = false

/** Registra o campo customizado uma única vez (idempotente). */
export function registerFieldTileGrid(): void {
  if (registered) return
  Blockly.fieldRegistry.register('field_tile_grid', FieldTileGrid)
  registered = true
}
