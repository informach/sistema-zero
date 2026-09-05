/**
 * O editor de UMA criação. A casca (barra de cima com Voltar, nome, desfazer/
 * refazer e o estado do salvamento; atalhos Ctrl+Z/Y) é comum aos três tipos.
 * O MODELO tem a bancada Montar/Pintar (`model/ModelEditor`); o CÉU tem a
 * prévia 3D e os controles (`sky/SkyEditor`); a textura mostra o resumo até a
 * folha de pintar chegar.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import type { MoldaAsset } from '../../core/model'
import { createEditorStore } from '../../state/editorStore'
import { markMoldaAssetClosed, markMoldaAssetOpen } from '../../state/persistence'
import { useGallery, useMoldaApp } from '../appContext'
import { Button } from '../ui/Button'
import { isMoldaDialogOpen } from '../ui/Dialog'
import { ModelEditor } from './model/ModelEditor'
import { SkyEditor } from './sky/SkyEditor'
import { TextureEditor } from './texture/TextureEditor'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function LoadedEditor({
  initial,
  onBack,
}: {
  initial: MoldaAsset
  onBack: () => void
}): JSX.Element {
  const { gallery, persistence } = useMoldaApp()
  const [editor] = useState(() =>
    createEditorStore({
      asset: initial,
      persistence,
      onSaved: (saved) => gallery.getState().absorb(saved),
    }),
  )
  const asset = useStore(editor, (state) => state.asset)

  useEffect(() => {
    markMoldaAssetOpen(initial.id)
    return () => {
      // Tudo SÍNCRONO no cleanup: o StrictMode desmonta e remonta na hora, e um
      // "fechado" atrasado num `.finally` chegaria DEPOIS do "aberto" da
      // remontagem. O `flush` segue gravando em segundo plano.
      void editor.getState().flush()
      editor.getState().dispose()
      markMoldaAssetClosed(initial.id)
    }
  }, [editor, initial.id])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isMoldaDialogOpen() || isTypingTarget(event.target)) return
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) editor.getState().redo()
        else editor.getState().undo()
      } else if (key === 'y') {
        event.preventDefault()
        editor.getState().redo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editor])

  if (asset.kind === 'model') return <ModelEditor editor={editor} onBack={onBack} />
  if (asset.kind === 'sky') return <SkyEditor editor={editor} onBack={onBack} />
  return <TextureEditor editor={editor} onBack={onBack} />
}

export function EditorScreen({
  assetId,
  onBack,
}: {
  assetId: string
  onBack: () => void
}): JSX.Element {
  const initial = useGallery((state) => state.getById(assetId))
  const [pinned] = useState(() => initial)
  if (!pinned) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-base text-mld-text">{COPY.editor.notFound}</p>
        <Button variant="outline" onClick={onBack}>
          {COPY.editor.backToGallery}
        </Button>
      </div>
    )
  }
  return <LoadedEditor initial={pinned} onBack={onBack} />
}
