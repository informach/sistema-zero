/**
 * Paleta de cores do asset (painel compacto): header com o NOME da paleta
 * ativa (abre o dropdown de troca), a LIXEIRA (exclui a cor selecionada, com
 * confirmação) e o "+" azul (adiciona uma cor pelo seletor livre); embaixo, a
 * grade de swatches quadrados com scroll INTERNO (a coluna esquerda não
 * cresce). O slot xadrez é o "apagar" (vira a borracha); escolher cor volta
 * pro lápis.
 *
 * Só as cores ADICIONADAS pelo "+" (extraColors, índice ≥16) são apagáveis —
 * as 16 base são fixas por contrato do bitmap indexado (a lixeira avisa com
 * um toast gentil). Excluir remapeia TODOS os bitmaps do asset (pixels da cor
 * viram transparente, extras seguintes descem 1) num commit só (desfazível).
 *
 * O dropdown de paletas usa position:FIXED calculado do rect do acionador: a
 * coluna esquerda é um scroll container (overflow-y-auto) que deceparia um
 * `absolute`, e o pacote evita portais (escopo [data-pinta-theme]) — o fixed
 * escapa do clip SEM sair da árvore DOM. Fecha em clique-fora/Esc/scroll/
 * resize/seleção.
 *
 * Dois layouts: `panel` (coluna, desktop) e `row` (uma linha rolável, tela
 * estreita — o dropdown ancora no ToolButton de paleta).
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { removeExtraColor } from '../../core/assetEdit'
import { normalizeHex } from '../../core/color'
import { COPY } from '../../core/copy'
import { getPalette, PALETTE_SIZE, type PaletteId, TRANSPARENT_INDEX } from '../../core/palette'
import { PINTA_LIMITS, resolveAssetPalette } from '../../core/project'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { ChevronDown, Palette, Plus, Trash2 } from '../ui/icons'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { ColorPicker } from './ColorPicker'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { PaletteMenu, usePaletteMenu } from './PaletteMenu'

export function PaletteBar({ layout = 'panel' }: { layout?: 'panel' | 'row' }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const color = useSession((state) => state.color)
  const colorSecondary = useSession((state) => state.colorSecondary)
  const activeSlot = useSession((state) => state.activeSlot)
  const tool = useSession((state) => state.tool)
  /** A cor do quadrado SELECIONADO na caixa de ferramentas. */
  const slotColor = activeSlot === 'secondary' ? colorSecondary : color
  const menu = usePaletteMenu()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draft, setDraft] = useState('#ff8800')

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const colors = resolveAssetPalette(asset)
  const paletteName = getPalette(asset.paletteId).name
  /** A lixeira só alcança cor EXTRA (as 16 base são fixas). */
  const deletable = tool !== 'eraser' && slotColor >= PALETTE_SIZE && slotColor < colors.length
  const selectedHex = colors[slotColor] ?? null

  /** Adiciona a cor do rascunho como swatch novo (ou seleciona se já existir). */
  function addCustomColor(): void {
    const norm = normalizeHex(draft)
    if (!norm) return
    const current = editor.getState().asset
    if (!('paletteId' in current)) return
    const resolved = resolveAssetPalette(current)
    const found = resolved.indexOf(norm)
    if (found >= 0) {
      session.getState().applyColor(found)
    } else if (resolved.length - PALETTE_SIZE >= PINTA_LIMITS.maxExtraColors) {
      showToast(COPY.palette.colorLimit)
      setPickerOpen(false)
      return
    } else {
      editor.getState().commit({ ...current, extraColors: [...(current.extraColors ?? []), norm] })
      // A nova cor entra no fim: o índice dela é o tamanho ANTES de adicionar.
      session.getState().applyColor(resolved.length)
    }
    const s = session.getState()
    if (s.tool === 'eraser' || s.tool === 'picker') s.setTool('pencil')
    setPickerOpen(false)
  }

  /** Troca a paleta base (commit desfazível; id igual é no-op) e fecha o menu. */
  function choosePalette(id: PaletteId): void {
    const current = editor.getState().asset
    if ('paletteId' in current && current.paletteId !== id) {
      editor.getState().commit({ ...current, paletteId: id })
    }
    menu.close()
  }

  /** Lixeira: extra → confirmação; base/borracha → aviso gentil (sem dialog). */
  function handleTrash(): void {
    if (tool === 'eraser' || slotColor === TRANSPARENT_INDEX || slotColor >= colors.length) {
      showToast(COPY.palette.pickColorFirst)
      return
    }
    if (slotColor < PALETTE_SIZE) {
      showToast(COPY.palette.baseColorLocked)
      return
    }
    setConfirmOpen(true)
  }

  /** Exclui a cor selecionada: remap de todos os bitmaps num commit só. */
  function confirmDelete(): void {
    setConfirmOpen(false)
    const current = editor.getState().asset
    const s = session.getState()
    const index = s.activeSlot === 'secondary' ? s.colorSecondary : s.color
    const next = removeExtraColor(current, index)
    if (!next) return
    editor.getState().commit(next)
    // Clampa AS DUAS cores no tamanho novo (nunca no 0/transparente na
    // principal): a exclusão desloca os índices das extras seguintes.
    const length = 'paletteId' in next ? resolveAssetPalette(next).length : PALETTE_SIZE
    const clamp = (value: number, min: number): number =>
      Math.max(min, Math.min(value > index ? value - 1 : value, length - 1))
    s.setColor(clamp(s.color, 1))
    s.setColorSecondary(clamp(s.colorSecondary, TRANSPARENT_INDEX))
  }

  const swatches = (
    <>
      <button
        type="button"
        aria-pressed={tool === 'eraser'}
        aria-label={COPY.palette.transparent}
        title={COPY.palette.transparent}
        onClick={() => session.getState().setTool('eraser')}
        className={`pin-checkerboard size-11 shrink-0 rounded-md border-2 transition ${
          tool === 'eraser' ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
        }`}
      />
      {colors.map((hex, index) => {
        if (index === TRANSPARENT_INDEX || !hex) return null
        // O destaque acompanha a cor SELECIONADA na caixa de ferramentas (a
        // principal ou a secundária, conforme o quadrado escolhido lá).
        const selected = slotColor === index && tool !== 'eraser'
        return (
          <button
            key={hex + String(index)}
            type="button"
            aria-pressed={selected}
            aria-label={COPY.a11y.colorLabel(index)}
            title={hex}
            onClick={() => {
              const s = session.getState()
              s.applyColor(index)
              if (s.tool === 'eraser' || s.tool === 'picker') s.setTool('pencil')
            }}
            className={`size-11 shrink-0 rounded-md border-2 transition ${
              selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
            }`}
            style={{ backgroundColor: hex }}
          />
        )
      })}
    </>
  )

  /**
   * Abre o seletor JÁ NA COR SELECIONADA, para a criança criar uma variação a
   * partir dela (é como o painel do VETOR sempre funcionou). Antes o rascunho
   * nascia num laranja fixo e nunca era sincronizado com a seleção.
   *
   * ⚠️ Borracha e o índice 0 (transparente, hex vazio por convenção da paleta)
   * NÃO têm cor de origem — nesses casos mantemos o rascunho anterior em vez de
   * semear com nada.
   */
  function openPicker(): void {
    if (tool !== 'eraser' && selectedHex) setDraft(selectedHex)
    setPickerOpen(true)
  }

  const addButton = (
    <button
      type="button"
      aria-label={COPY.palette.addColor}
      title={COPY.palette.addColor}
      onClick={openPicker}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pin-accent text-pin-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
    >
      <Plus aria-hidden="true" className="size-5" />
    </button>
  )

  const trashButton = (
    <ToolButton
      icon={Trash2}
      label={COPY.palette.deleteColor}
      onClick={handleTrash}
      aria-disabled={!deletable}
      className={deletable ? undefined : 'opacity-40'}
    />
  )

  const paletteMenu = (
    <PaletteMenu anchor={menu} activeId={asset.paletteId} onChoose={choosePalette} />
  )

  const pickerDialog = (
    <Dialog
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      title={COPY.palette.addColorTitle}
    >
      <ColorPicker value={draft} onChange={setDraft} recentColors={asset.extraColors} />
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={() => setPickerOpen(false)}>{COPY.gallery.cancel}</Button>
        <Button variant="primary" onClick={addCustomColor}>
          {COPY.palette.add}
        </Button>
      </div>
    </Dialog>
  )

  const confirmDialog = (
    <Dialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title={COPY.palette.deleteColorTitle}
    >
      <div className="flex items-start gap-3">
        {selectedHex ? (
          <span
            aria-hidden="true"
            className="mt-0.5 size-11 shrink-0 rounded-md border-2 border-pin-border"
            style={{ backgroundColor: selectedHex }}
          />
        ) : null}
        <p className="text-pin-text">{COPY.palette.deleteColorBody}</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
          {COPY.gallery.cancel}
        </Button>
        <Button variant="danger" onClick={confirmDelete}>
          {COPY.palette.deleteColorConfirm}
        </Button>
      </div>
    </Dialog>
  )

  if (layout === 'row') {
    return (
      <div className="pin-panel flex shrink-0 items-center gap-1 p-2">
        <ToolButton
          icon={Palette}
          label={COPY.palette.switchPalette}
          onClick={menu.toggle}
          aria-haspopup="menu"
          aria-expanded={menu.open}
        />
        {trashButton}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {swatches}
          {addButton}
        </div>
        {paletteMenu}
        {pickerDialog}
        {confirmDialog}
      </div>
    )
  }

  return (
    // Largura FIXA (w-68): sem ela o painel encolhia/alargava conforme o NOME
    // da paleta ativa ("Arcade" × "Lápis e carvão") e a grade 1fr esticava os
    // vãos junto — o espaçamento ficava alternando a cada troca.
    // O título É o seletor de paleta ("Arcade ∨"): o nome da paleta ativa abre
    // o dropdown de troca, no lugar de um rótulo fixo "Cores".
    <Panel
      title={paletteName}
      ariaLabel={COPY.palette.title}
      className="w-68"
      onTitleClick={menu.toggle}
      titleRef={menu.triggerRef}
      titleProps={{
        'aria-haspopup': 'menu',
        'aria-expanded': menu.open,
        'aria-label': `${COPY.palette.switchPalette}: ${paletteName}`,
      }}
      titleSuffix={
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 transition ${menu.open ? 'rotate-180' : ''}`}
        />
      }
      actions={
        <>
          {trashButton}
          {addButton}
        </>
      }
    >
      {/* 5 por linha → painel mais largo e mais curto; as 17 células base
          cabem em 4 linhas SEM scroll (extras rolam por dentro). */}
      <div className="grid max-h-48 grid-cols-5 justify-items-center gap-1 overflow-y-auto overscroll-contain p-0.5">
        {swatches}
      </div>
      {paletteMenu}
      {pickerDialog}
      {confirmDialog}
    </Panel>
  )
}
