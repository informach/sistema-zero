/**
 * O editor de UMA criação. A casca (barra de cima com Voltar, nome, desfazer/
 * refazer e o estado do salvamento; atalhos Ctrl+Z/Y) é comum aos três tipos.
 * O MODELO tem a bancada Montar/Pintar (`model/ModelEditor`); o CÉU tem a
 * prévia 3D e os controles (`sky/SkyEditor`); a textura mostra o resumo até a
 * folha de pintar chegar.
 */
import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import type { MoldaAsset } from '../../core/model'
import { assetToJson } from '../../export/assetJson'
import { exportLoadedAssetForStudio } from '../../export/studioLibrary'
import { createEditorStore } from '../../state/editorStore'
import { markMoldaAssetClosed, markMoldaAssetOpen } from '../../state/persistence'
import { useMoldaApp } from '../appContext'
import type { MoldaCompletionControl } from '../completionControl'
import { Button } from '../ui/Button'
import { isMoldaDialogOpen } from '../ui/Dialog'
import { isTypingTarget } from '../ui/interaction'
import { useToast } from '../ui/Toast'
import { DeferredEditor, type EditorModuleLoader } from './DeferredEditor'
import { useAssetDocument } from './useAssetDocument'
import { useStudioResync } from './useStudioResync'

const EDITORS = {
  model: () => import('./model/ModelEditor').then((module) => module.ModelEditor),
  sky: () => import('./sky/SkyEditor').then((module) => module.SkyEditor),
  texture: () => import('./texture/TextureEditor').then((module) => module.TextureEditor),
} satisfies Record<MoldaAsset['kind'], EditorModuleLoader>

function LoadedEditor({
  initial,
  onBack,
  onCompletionControlChange,
}: {
  initial: MoldaAsset
  onBack: () => void
  onCompletionControlChange?: (control: MoldaCompletionControl | null) => void
}): JSX.Element {
  const { adapter, gallery, persistence } = useMoldaApp()
  const { showToast } = useToast()
  const [editor] = useState(() =>
    createEditorStore({
      asset: initial,
      persistence,
      onSaved: (saved) => gallery.getState().absorb(saved),
    }),
  )
  const asset = useStore(editor, (state) => state.asset)
  // A volta da ponte com o Estúdio: só depois de SALVAR (o `savedAsset` muda), nunca ao abrir.
  const savedAsset = useStore(editor, (state) => state.savedAsset)
  const { flush: flushStudioResync } = useStudioResync({
    savedAsset,
    send: adapter.resyncToStudio,
    canSend: adapter.canResyncToStudio,
    exportAsset: (asset, context) => exportLoadedAssetForStudio(asset, context),
    onFailure: (message) => showToast(message ?? COPY.editor.studioSyncFailed),
  })
  const closingRef = useRef(false)
  const lifetime = useRef(0)
  useEffect(() => {
    if (!onCompletionControlChange) return
    onCompletionControlChange({
      async flush() {
        const generation = lifetime.current
        await editor.getState().flush()
        if (generation !== lifetime.current)
          throw new Error('O editor foi fechado durante o salvamento')
        const state = editor.getState()
        if (state.asset !== state.savedAsset || state.saveState !== 'saved')
          throw new Error(state.saveError ?? 'A criação não foi salva')
        return { id: state.savedAsset.id, json: JSON.stringify(assetToJson(state.savedAsset)) }
      },
    })
    return () => onCompletionControlChange(null)
  }, [editor, onCompletionControlChange])
  const handleBack = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const generation = lifetime.current
    void (async () => {
      // Drain revisions, not retries: a user can keep editing while the host is awaiting I/O.
      while (generation === lifetime.current) {
        await editor.getState().flush()
        if (generation !== lifetime.current) return
        const state = editor.getState()
        if (state.savedAsset !== state.asset) {
          closingRef.current = false
          showToast(state.saveError ?? COPY.editor.saveError)
          return
        }
        await flushStudioResync(state.savedAsset)
        if (generation !== lifetime.current) return
        if (editor.getState().asset !== state.savedAsset) continue
        onBack()
        return
      }
    })()
  }, [editor, flushStudioResync, onBack, showToast])

  useEffect(() => {
    return () => {
      lifetime.current += 1
      // Cleanup synchronous; a pending save may finish without owning this screen anymore.
      void editor.getState().flush()
      editor.getState().dispose()
    }
  }, [editor])

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

  return (
    <DeferredEditor
      key={asset.kind}
      load={EDITORS[asset.kind]}
      editor={editor}
      onBack={handleBack}
    />
  )
}

export function EditorScreen({
  assetId,
  onBack,
  onCompletionControlChange,
}: {
  assetId: string
  onBack: () => void
  onCompletionControlChange?: (control: MoldaCompletionControl | null) => void
}): JSX.Element {
  const { persistence } = useMoldaApp()
  const { state, retry } = useAssetDocument(persistence, assetId)
  useEffect(() => {
    markMoldaAssetOpen(assetId)
    return () => markMoldaAssetClosed(assetId)
  }, [assetId])
  if (state.status !== 'ready') {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p role={state.status === 'error' ? 'alert' : 'status'} className="text-base text-mld-text">
          {state.status === 'error' ? state.message : COPY.editor.loading}
        </p>
        {state.status === 'error' && <Button onClick={retry}>{COPY.gallery.retry}</Button>}
        <Button variant="outline" onClick={onBack}>
          {COPY.editor.backToGallery}
        </Button>
      </div>
    )
  }
  return (
    <LoadedEditor
      key={state.asset.id}
      initial={state.asset}
      onBack={onBack}
      onCompletionControlChange={onCompletionControlChange}
    />
  )
}
