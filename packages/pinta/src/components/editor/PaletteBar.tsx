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
import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { removeExtraColor } from '../../core/assetEdit'
import { normalizeHex } from '../../core/color'
import { COPY } from '../../core/copy'
import {
  firstPaintableIndex,
  PALETTE_SIZE,
  type PaletteId,
  TRANSPARENT_INDEX,
} from '../../core/palette'
import {
  assetPaletteName,
  PINTA_LIMITS,
  type PintaAsset,
  resolveAssetPalette,
} from '../../core/project'
import { usePintaApp } from '../appContext'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { ChevronDown, Palette, Plus, Trash2 } from '../ui/icons'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { ColorPickerDialog } from './ColorPicker'
import { CreatePaletteDialog } from './CreatePaletteDialog'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { ManagePalettesDialog } from './ManagePalettesDialog'
import { PaletteMenu, usePaletteMenu } from './PaletteMenu'

/**
 * "Cores de uma imagem" puxa decoder + quantizador — pedaço separado do
 * bundle, só entra quando a criança abre (padrão LazyImportImageDialog).
 */
const LazyPaletteFromImageDialog = lazy(() =>
  import('./PaletteFromImageDialog').then((m) => ({ default: m.PaletteFromImageDialog })),
)

export function PaletteBar({ layout = 'panel' }: { layout?: 'panel' | 'row' }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { paletteLibrary } = usePintaApp()
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
  const [pickerValue, setPickerValue] = useState('#ff8800')
  const [createOpen, setCreateOpen] = useState(false)
  const [fromImageOpen, setFromImageOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const libraryEnabled = useStore(paletteLibrary, (state) => state.enabled)
  const savedPalettes = useStore(paletteLibrary, (state) => state.palettes)
  useEffect(() => {
    if (libraryEnabled) void paletteLibrary.getState().load()
  }, [libraryEnabled, paletteLibrary])
  // A nuvem grava a biblioteca POR FORA da store: o menu aberto relê o disco
  // (o momento da exibição é o momento da leitura — full review 25/08).
  useEffect(() => {
    if (menu.open && libraryEnabled) void paletteLibrary.getState().load()
  }, [menu.open, libraryEnabled, paletteLibrary])
  // ⚠️ Re-clamp na FRONTEIRA DA SESSÃO (full review 25/08): undo/redo de uma
  // troca de paleta e um desenho importado com slots vazios chegam aqui SEM
  // passar pelos handlers — sem este efeito a cor da sessão pousa num slot ''
  // e o lápis "não pinta". Idempotente: no caso comum não seta nada.
  useEffect(() => {
    if (!('paletteId' in asset)) return
    const resolved = resolveAssetPalette(asset)
    const paintable = (index: number) =>
      index > TRANSPARENT_INDEX && index < resolved.length && !!resolved[index]
    const s = session.getState()
    if (!paintable(s.color)) s.setColor(firstPaintableIndex(resolved))
    if (s.colorSecondary !== TRANSPARENT_INDEX && !paintable(s.colorSecondary)) {
      s.setColorSecondary(TRANSPARENT_INDEX)
    }
  }, [asset, session])

  // Só kinds com paleta indexada própria (vetoriais usam cor livre).
  if (!('paletteId' in asset)) return null
  const colors = resolveAssetPalette(asset)
  const paletteName = assetPaletteName(asset)
  /** A lixeira só alcança cor EXTRA (as 16 base são fixas). */
  const deletable = tool !== 'eraser' && slotColor >= PALETTE_SIZE && slotColor < colors.length
  const selectedHex = colors[slotColor] ?? null

  /** Adiciona a cor do rascunho como swatch novo (ou seleciona se já existir). */
  function addCustomColor(value: string): void {
    const norm = normalizeHex(value)
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

  /**
   * Clamp obrigatório após trocar de paleta: uma personalizada pode ter SLOTS
   * VAZIOS ('') e a cor da sessão cair num deles seria o "lápis que não
   * pinta". A principal cai no primeiro índice pintável; a secundária pode
   * ficar transparente (é o "apagar" dela).
   */
  function clampSessionColors(next: PintaAsset): void {
    if (!('paletteId' in next)) return
    const resolved = resolveAssetPalette(next)
    const paintable = (index: number) =>
      index > TRANSPARENT_INDEX && index < resolved.length && !!resolved[index]
    const s = session.getState()
    if (!paintable(s.color)) s.setColor(firstPaintableIndex(resolved))
    if (s.colorSecondary !== TRANSPARENT_INDEX && !paintable(s.colorSecondary)) {
      s.setColorSecondary(TRANSPARENT_INDEX)
    }
  }

  /** Troca a paleta base (commit desfazível; id igual é no-op) e fecha o menu. */
  function choosePalette(id: PaletteId): void {
    const current = editor.getState().asset
    if ('paletteId' in current && (current.paletteId !== id || current.customPalette)) {
      // Sair de uma personalizada REMOVE a chave embutida (senão ela ficaria
      // órfã no registro até o sanitize do próximo load a descartar).
      const { customPalette: _dropped, ...rest } = current
      const next: PintaAsset = { ...rest, paletteId: id }
      editor.getState().commit(next)
      clampSessionColors(next)
    }
    menu.close()
  }

  /** Aplica uma paleta personalizada como SNAPSHOT embutido no desenho. */
  function applyCustomPalette(palette: { name: string; colors: readonly string[] }): void {
    const current = editor.getState().asset
    if (!('paletteId' in current)) return
    // Reaplicar a paleta JÁ ativa é no-op ("null no no-op é obrigação"): sem
    // isto o commit gravava um desfazer VAZIO e acordava autosave/nuvem à toa.
    const active = current.paletteId === 'custom' ? current.customPalette : null
    if (
      active &&
      active.name === palette.name &&
      active.colors.length === palette.colors.length &&
      active.colors.every((hex, index) => hex === palette.colors[index])
    ) {
      return
    }
    const next: PintaAsset = {
      ...current,
      paletteId: 'custom',
      customPalette: { name: palette.name, colors: [...palette.colors] },
    }
    editor.getState().commit(next)
    clampSessionColors(next)
  }

  /**
   * Criar (à mão ou de uma imagem): guarda na biblioteca (quando há uma) e
   * APLICA no desenho. O teto trava só a BIBLIOTECA — a paleta ainda vale
   * neste desenho (ela viaja embutida).
   */
  async function handleCreatePalette(name: string, paletteColors: string[]): Promise<void> {
    setCreateOpen(false)
    setFromImageOpen(false)
    const library = paletteLibrary.getState()
    const saved = library.enabled
      ? await library.savePalette({ name, colors: paletteColors })
      : null
    applyCustomPalette(saved ?? { name, colors: paletteColors })
    if (library.enabled && !saved) {
      showToast(COPY.palette.libraryFull)
      return
    }
    showToast(COPY.palette.paletteCreated)
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
    // ⚠️ E valida PINTABILIDADE (full review 25/08): numa paleta personalizada
    // com menos de 15 cores o slot `length-1` é vazio — o clamp aritmético
    // sozinho deixava o lápis num slot '' ("lápis que não pinta").
    const resolved = 'paletteId' in next ? resolveAssetPalette(next) : []
    const length = resolved.length || PALETTE_SIZE
    const paintable = (value: number) =>
      value > TRANSPARENT_INDEX && value < length && !!resolved[value]
    const clamp = (value: number, min: number): number =>
      Math.max(min, Math.min(value > index ? value - 1 : value, length - 1))
    const primary = clamp(s.color, 1)
    s.setColor(paintable(primary) ? primary : firstPaintableIndex(resolved))
    const secondary = clamp(s.colorSecondary, TRANSPARENT_INDEX)
    s.setColorSecondary(
      secondary === TRANSPARENT_INDEX || paintable(secondary) ? secondary : TRANSPARENT_INDEX,
    )
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
    if (tool !== 'eraser' && selectedHex) setPickerValue(selectedHex)
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
    <PaletteMenu
      anchor={menu}
      activeId={asset.paletteId}
      onChoose={choosePalette}
      // As AÇÕES (criar/da imagem) aparecem SEMPRE — sem biblioteca (modo
      // aula) a paleta criada só se aplica ao desenho, que é o que viaja.
      library={{
        palettes: libraryEnabled ? savedPalettes : [],
        onChooseCustom: (palette) => {
          applyCustomPalette(palette)
          menu.close()
        },
        onCreate: () => {
          setCreateOpen(true)
          menu.close()
        },
        onFromImage: () => {
          setFromImageOpen(true)
          menu.close()
        },
        ...(libraryEnabled
          ? {
              onManage: () => {
                setManageOpen(true)
                menu.close()
              },
            }
          : {}),
      }}
    />
  )

  const createDialogs = (
    <>
      <CreatePaletteDialog
        key={`create-${String(createOpen)}`}
        open={createOpen}
        initialColors={colors.slice(0, PALETTE_SIZE)}
        onClose={() => setCreateOpen(false)}
        onCreate={(name, paletteColors) => void handleCreatePalette(name, paletteColors)}
      />
      {fromImageOpen ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="pin-panel px-5 py-3 font-bold text-pin-fg">
                {COPY.importImage.loading}
              </div>
            </div>
          }
        >
          <LazyPaletteFromImageDialog
            open
            onClose={() => setFromImageOpen(false)}
            onCreate={(name, paletteColors) => void handleCreatePalette(name, paletteColors)}
          />
        </Suspense>
      ) : null}
      {/* key: o estado ARMADO da exclusão não pode sobreviver a fechar/reabrir
          (a proteção de 2 toques furava — full review 25/08). */}
      <ManagePalettesDialog
        key={`manage-${String(manageOpen)}`}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </>
  )

  const pickerDialog = (
    <ColorPickerDialog
      open={pickerOpen}
      value={pickerValue}
      onClose={() => setPickerOpen(false)}
      title={COPY.palette.addColorTitle}
      confirmLabel={COPY.palette.add}
      recentColors={asset.extraColors}
      onConfirm={addCustomColor}
    />
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
        {createDialogs}
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
      {createDialogs}
    </Panel>
  )
}
