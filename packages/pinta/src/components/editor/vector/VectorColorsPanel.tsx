/**
 * Painel de CORES do vetor — a mesma casca do PaletteBar do pixel: o título É o
 * seletor de paleta ("Arcade ∨"), a lixeira e o "+" ficam no cabeçalho e embaixo
 * vem UMA grade de 5 por linha com "sem cor" na frente.
 *
 * Sem chips de canal: quem diz se a cor cai no preenchimento ou no contorno são
 * os dois quadradinhos da caixa de ferramentas (o `activeChannel`). Repetir isso
 * aqui era uma linha inteira do painel dizendo o que já estava dito.
 *
 * A cor do vetor é LIVRE (hex nas formas, não índice): trocar de paleta só troca
 * as sugestões da grade — nada no desenho muda, e por isso a lixeira aqui não
 * pede confirmação (ela some com a sugestão, não com a tinta).
 *
 * Largura FIXA (w-68), como os painéis do pixel: sem ela a grade `1fr`
 * esticaria os vãos conforme o conteúdo.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { getPalette } from '../../../core/palette'
import { usePintaApp } from '../../appContext'
import { ToolButton } from '../../ui/Button'
import { ChevronDown, Plus, Trash2 } from '../../ui/icons'
import type { PanelDisclosure } from '../../ui/Panel'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { ColorPickerDialog } from '../ColorPicker'
import { CreatePaletteDialog } from '../CreatePaletteDialog'
import { ManagePalettesDialog } from '../ManagePalettesDialog'
import { PaletteMenu, usePaletteMenu } from '../PaletteMenu'
import { useVectorEditor } from './VectorEditorScope'
import { vectorPaletteColors } from './vectorTools'

const LazyPaletteFromImageDialog = lazy(() =>
  import('../PaletteFromImageDialog').then((m) => ({ default: m.PaletteFromImageDialog })),
)

export function VectorColorsPanel({
  disclosure,
}: {
  disclosure?: PanelDisclosure
} = {}): JSX.Element {
  const {
    style,
    swatches,
    customColors,
    forgetColor,
    palette,
    setPalette,
    activeChannel,
    applyChannelColor,
    rememberColor,
  } = useVectorEditor()
  const { paletteLibrary } = usePintaApp()
  const { showToast } = useToast()
  const menu = usePaletteMenu()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [fromImageOpen, setFromImageOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const libraryEnabled = useStore(paletteLibrary, (state) => state.enabled)
  const savedPalettes = useStore(paletteLibrary, (state) => state.palettes)
  useEffect(() => {
    if (libraryEnabled) void paletteLibrary.getState().load()
  }, [libraryEnabled, paletteLibrary])
  // A nuvem grava a biblioteca POR FORA da store: o menu aberto relê o disco.
  useEffect(() => {
    if (menu.open && libraryEnabled) void paletteLibrary.getState().load()
  }, [menu.open, libraryEnabled, paletteLibrary])

  const paletteName = palette.kind === 'custom' ? palette.name : getPalette(palette.id).name

  /**
   * Criar (à mão ou de uma imagem): guarda na biblioteca (quando há uma) e
   * aplica como SNAPSHOT de sessão — no vetor a paleta é só sugestão da grade.
   */
  async function handleCreatePalette(name: string, colors: string[]): Promise<void> {
    setCreateOpen(false)
    setFromImageOpen(false)
    const library = paletteLibrary.getState()
    const saved = library.enabled ? await library.savePalette({ name, colors }) : null
    setPalette({
      kind: 'custom',
      name: saved?.name ?? name,
      colors: [...(saved?.colors ?? colors)],
    })
    showToast(library.enabled && !saved ? COPY.palette.libraryFull : COPY.palette.paletteCreated)
  }
  const channelLabel = activeChannel === 'fill' ? COPY.vector.fill : COPY.vector.stroke
  // Cor "selecionada" do canal ativo (destaca o swatch correspondente).
  const activeHex =
    activeChannel === 'fill'
      ? typeof style.fill === 'string' && style.fill !== 'none'
        ? style.fill
        : null
      : (style.stroke?.color ?? null)
  const noneActive = activeChannel === 'fill' ? style.fill === 'none' : style.stroke === null
  /** A lixeira só alcança cor ADICIONADA pela criança (as da paleta são fixas). */
  const deletable = activeHex !== null && customColors.includes(activeHex)

  function handleTrash(): void {
    if (!activeHex) {
      showToast(COPY.palette.pickColorFirst)
      return
    }
    if (!deletable) {
      showToast(COPY.palette.baseColorLocked)
      return
    }
    forgetColor(activeHex)
  }

  return (
    <Panel
      title={paletteName}
      ariaLabel={COPY.palette.title}
      className="w-68 shrink-0"
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
      disclosure={disclosure}
      actions={
        <>
          <ToolButton
            icon={Trash2}
            label={COPY.palette.deleteColor}
            onClick={handleTrash}
            aria-disabled={!deletable}
            className={deletable ? undefined : 'opacity-40'}
          />
          <button
            type="button"
            aria-label={COPY.palette.addColor}
            title={COPY.palette.addColor}
            onClick={() => setPickerOpen(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pin-accent text-pin-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
        </>
      }
    >
      <div className="grid max-h-48 grid-cols-5 justify-items-center gap-1 overflow-y-auto overscroll-contain p-0.5">
        <button
          type="button"
          aria-label={`${channelLabel}: ${COPY.vector.none}`}
          aria-pressed={noneActive}
          title={COPY.vector.none}
          onClick={() => applyChannelColor('none')}
          className={clsx(
            'pin-checkerboard size-11 shrink-0 rounded-md border-2',
            noneActive ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
          )}
        />
        {swatches.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`${channelLabel}: ${COPY.colorNames[hex] ?? hex}`}
            aria-pressed={activeHex === hex}
            title={COPY.colorNames[hex] ?? hex}
            onClick={() => applyChannelColor(hex)}
            className={clsx(
              'size-11 shrink-0 rounded-md border-2',
              activeHex === hex ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      <PaletteMenu
        anchor={menu}
        activeId={palette.kind === 'custom' ? 'custom' : palette.id}
        activeCustom={
          palette.kind === 'custom' ? { name: palette.name, colors: palette.colors } : null
        }
        onChoose={(id) => {
          setPalette({ kind: 'builtin', id })
          menu.close()
        }}
        library={{
          palettes: libraryEnabled ? savedPalettes : [],
          onChooseCustom: (saved) => {
            // SNAPSHOT: excluir da biblioteca depois não quebra a sessão.
            setPalette({ kind: 'custom', name: saved.name, colors: [...saved.colors] })
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

      <ColorPickerDialog
        open={pickerOpen}
        value={activeHex ?? '#000000'}
        onClose={() => setPickerOpen(false)}
        title={COPY.palette.addColorTitle}
        confirmLabel={COPY.palette.add}
        recentColors={customColors}
        onConfirm={(hex) => {
          rememberColor(hex)
          applyChannelColor(hex)
        }}
      />

      <CreatePaletteDialog
        key={`create-${String(createOpen)}`}
        open={createOpen}
        initialColors={vectorPaletteColors(palette)}
        onClose={() => setCreateOpen(false)}
        onCreate={(name, colors) => void handleCreatePalette(name, colors)}
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
            onCreate={(name, colors) => void handleCreatePalette(name, colors)}
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
    </Panel>
  )
}
