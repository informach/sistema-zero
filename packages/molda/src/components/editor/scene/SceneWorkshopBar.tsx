/**
 * A barra de CIMA da oficina (a tela-modelo do Modelar e do Animar, 11/09/2026): à esquerda
 * [menu do host] [← Meus projetos], o cubo com o nome da criação, o "Salvo" em pílula, o selo da
 * nuvem do host e desfazer/refazer só com o ícone; à direita guardar, baixar, exportar e trazer.
 *
 * Os nomes são os de sempre ("Desfazer", "Guardar agora", "Exportar GLB"...): os testes e o e2e
 * acham os botões por eles. O menu e o selo só aparecem com o `MoldaHostChromeProvider` (o kids);
 * a seta do host (`back`) é da GALERIA e não entra aqui: dentro da oficina, voltar é "Meus
 * projetos", que pergunta antes de sair.
 */
import { clsx } from 'clsx'
import type { RefObject } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { HostCloudStatus, HostMenuButton, useMoldaHostChrome } from '../../hostChrome'
import { RequiresTool } from '../../toolAccess'
import { Box, Check, Download, FileBox, Loader2, Redo2, Save, Undo2, Upload } from '../../ui/icons'
import { SceneExitControl, type SceneExitMode } from './SceneExitControl'

/** As pílulas de contorno da barra: no aperto, só o ícone (o nome segue no texto escondido). */
const ACTION =
  'sz-tool-pill sz-tool-pill--outline px-3 text-[0.8125rem] @max-[37rem]:w-(--sz-tool-hit) @max-[37rem]:px-0'
const ACTION_LABEL = '@max-[37rem]:sr-only'

export function SceneWorkshopBar({
  editor,
  name,
  onExit,
  beforeExit,
  backup,
  cancelPreview,
  onUndo,
  onRedo,
  pendingPose,
  exportTrigger,
  importTrigger,
  exportHintId,
  importHintId,
  onExport,
  onImport,
}: {
  editor: EditorStore<MoldaSceneDocument>
  name: string
  onExit?: (mode: SceneExitMode) => void
  beforeExit(): Promise<boolean>
  backup(): boolean
  cancelPreview(): void
  onUndo(): void
  onRedo(): void
  pendingPose: boolean
  exportTrigger: RefObject<HTMLButtonElement | null>
  importTrigger: RefObject<HTMLButtonElement | null>
  exportHintId: string
  importHintId: string
  onExport(): void
  onImport(): void
}) {
  const hostChrome = useMoldaHostChrome()
  const canUndo = useStore(editor, (state) => state.canUndo)
  const canRedo = useStore(editor, (state) => state.canRedo)
  const saveState = useStore(editor, (state) => state.saveState)
  const saveError = useStore(editor, (state) => state.saveError)
  const copy = COPY.scene
  const saving = saveState === 'saving'
  const saved = saveState === 'saved'
  const SaveIcon = saved ? Check : saving ? Loader2 : null
  // O erro fala a frase inteira (pode passar de 600px): encolhe com reticências, e o texto todo
  // fica no `title` e na região viva. Rígido, ele empurrava desfazer e refazer para fora.
  const failed = !saved && !saving && !!saveError
  return (
    <header className="mld-bar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5">
      {/* O nome vem antes das ações: no aperto, quem encolhe primeiro são as pílulas da direita. */}
      <div className="flex min-w-0 max-w-full items-center gap-1.5">
        {hostChrome?.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
        {onExit && (
          <SceneExitControl
            editor={editor}
            onExit={onExit}
            beforeExit={beforeExit}
            backup={backup}
            cancelPreview={cancelPreview}
          />
        )}
        <Box
          aria-hidden="true"
          className="size-5 shrink-0 text-(--mld-shape-special) max-sm:hidden"
        />
        <h1 tabIndex={-1} className="mld-display min-w-0 truncate text-xl">
          {name}
        </h1>
        {/* O "Salvo" da tela-modelo: menta quando guardou; o erro fala na tinta do perigo. */}
        <span
          role="status"
          title={failed ? saveError : undefined}
          className={clsx(
            'inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold max-sm:px-2',
            failed ? 'min-w-0 shrink' : 'shrink-0',
            saved
              ? 'bg-(--sz-tool-ok-tint) text-(--sz-tool-ok)'
              : saveError
                ? 'bg-mld-danger/15 text-mld-danger'
                : 'bg-mld-bg text-mld-muted',
          )}
        >
          {SaveIcon && (
            <SaveIcon
              aria-hidden="true"
              className={clsx(
                'size-4 shrink-0',
                saving && 'animate-spin motion-reduce:animate-none',
              )}
            />
          )}
          {/* No celular o selo fica só com o ícone: o nome da criação precisa do espaço. */}
          <span className={clsx(SaveIcon && 'max-sm:sr-only', failed && 'truncate')}>
            {saved
              ? COPY.editor.saved
              : saving
                ? COPY.editor.saving
                : (saveError ?? COPY.editor.dirty)}
          </span>
        </span>
        {hostChrome?.status ? <HostCloudStatus status={hostChrome.status} variant="bar" /> : null}
        <button
          type="button"
          className="sz-tool-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={COPY.editor.undo}
          title={`${COPY.editor.undo} (Ctrl+Z)`}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sz-tool-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={COPY.editor.redo}
          title={`${COPY.editor.redo} (Ctrl+Shift+Z)`}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 aria-hidden="true" />
        </button>
      </div>
      {/*
       * As ações num CONTÊINER de consulta: a largura que sobra ao lado do nome decide se as
       * pílulas de contorno levam o nome (a tela-modelo, a 1440px) ou só o ícone. Não há nada
       * `fixed` aqui dentro (os diálogos moram na raiz da oficina), então a contenção é segura.
       */}
      <div className="@container flex min-w-0 flex-1 basis-52 flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          className={ACTION}
          title={copy.save}
          onClick={() => void editor.getState().flush()}
        >
          <Save aria-hidden="true" />
          <span className={ACTION_LABEL}>{copy.save}</span>
        </button>
        <button type="button" className={ACTION} title={copy.backup} onClick={backup}>
          <Download aria-hidden="true" />
          <span className={ACTION_LABEL}>{copy.backup}</span>
        </button>
        <RequiresTool family="files.export">
          <button
            ref={exportTrigger}
            type="button"
            className={`${ACTION} disabled:cursor-not-allowed disabled:opacity-50`}
            title={copy.glbExport.open}
            disabled={pendingPose}
            aria-describedby={pendingPose ? exportHintId : undefined}
            onClick={onExport}
          >
            <FileBox aria-hidden="true" />
            <span className={ACTION_LABEL}>{copy.glbExport.open}</span>
          </button>
          {pendingPose && (
            <p id={exportHintId} className="text-xs text-mld-muted">
              {copy.glbExport.pendingPose}
            </p>
          )}
        </RequiresTool>
        <RequiresTool family="files.interop">
          <button
            ref={importTrigger}
            type="button"
            className="sz-tool-pill sz-tool-pill--primary px-3 text-[0.8125rem] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pendingPose}
            aria-describedby={pendingPose ? importHintId : undefined}
            onClick={onImport}
          >
            <Upload aria-hidden="true" />
            {NATIVE_IMPORT_COPY.open}
          </button>
          {pendingPose && (
            <p id={importHintId} className="text-xs text-mld-muted">
              {NATIVE_IMPORT_COPY.pendingPose}
            </p>
          )}
        </RequiresTool>
      </div>
    </header>
  )
}
