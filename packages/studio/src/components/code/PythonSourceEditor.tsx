// Loaded only with the Python source editor; the language tokenizer itself stays lazy.
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MonacoTabs, type MonacoTabsProps } from '#monaco'
import { isPythonProject } from '../../core/editableProject'
import type { MonacoCursorPosition } from '../../monaco/MonacoTabs'
import { attachPythonFormatter } from '../../python/language/formatter'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { CODE_FONT_SIZE_DEFAULT, useSettingsStore } from '../../state/settingsStore'
import { useT } from '../../studio/i18n'
import { useStudioTheme } from '../../studio/theme'
import { FontSizeControls } from './FontSizeControls'
import { useCodeHistory } from './useCodeHistory'
import { useFormatIssueLogger } from './useFormatIssueLogger'

export interface PythonSourceCursorPosition extends MonacoCursorPosition {
  /** Exact model text when the selection occurred, before React/store updates. */
  source: string
}

export interface PythonSourceEditorProps {
  activeFile?: string
  onActiveFileChange?: (path: string) => void
  /** Pro workspace controls which files have an open tab. Classic shows all source files. */
  openFiles?: readonly string[]
  onCloseFile?: (path: string) => void
  highlight?: MonacoTabsProps['highlight']
  onCursorChange?: (position: PythonSourceCursorPosition) => void
}

export function PythonSourceEditor(props: PythonSourceEditorProps) {
  const project = useProjectStore((state) => state.project)
  const observer = useProjectStore((state) => state.editingAccess === 'observer')
  const store = useProjectStoreApi()
  const theme = useStudioTheme()
  const fontSize = useSettingsStore((state) => state.codeFontSize)
  const registerHistory = useCodeHistory()
  const t = useT()
  const onFormatIssue = useFormatIssueLogger()
  const [modelPrefix, setModelPrefix] = useState<string | null>(null)
  useEffect(() => {
    if (!modelPrefix) return
    const formatter = attachPythonFormatter(monaco, modelPrefix)
    return () => formatter.dispose()
  }, [modelPrefix])
  const editorRef = useRef<Parameters<NonNullable<MonacoTabsProps['onEditorReady']>>[0]>(null)
  const onEditorReady = useCallback<NonNullable<MonacoTabsProps['onEditorReady']>>(
    (editor, scope) => {
      editorRef.current = editor
      setModelPrefix(editor && scope ? scope.modelPathPrefix : null)
      registerHistory(editor)
    },
    [registerHistory],
  )
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined)
  const files = useMemo(() => {
    if (!project || !isPythonProject(project)) return []
    const entries =
      project.kind === 'classic'
        ? Object.entries(project.files).map(([name, value]) => ({ name, value }))
        : Object.entries(project.tree).flatMap(([name, node]) =>
            node.kind === 'file' ? [{ name, value: node.content }] : [],
          )
    return props.openFiles ? entries.filter(({ name }) => props.openFiles!.includes(name)) : entries
  }, [project, props.openFiles])
  if (!project || !isPythonProject(project)) return null
  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <p role="alert" className="m-0 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <MonacoTabs
        files={files}
        activeFile={props.activeFile ?? selectedFile ?? project.python.entrypoint}
        onActiveFileChange={(path) => {
          setSelectedFile(path)
          props.onActiveFileChange?.(path)
        }}
        onChange={(path, value) => {
          const current = store.getState()
          if (current.project?.id !== project.id || !isPythonProject(current.project))
            return { rejectedValue: files.find((file) => file.name === path)?.value ?? '' }
          const issue = current.setPythonFile(path, value)
          setError(
            issue ? `${issue} A alteração foi recusada; o código anterior foi mantido.` : null,
          )
          if (issue) {
            const document = current.project
            const node = document.kind === 'pro' ? document.tree[path] : undefined
            return {
              rejectedValue:
                document.kind === 'classic'
                  ? (document.files[path] ?? '')
                  : node?.kind === 'file'
                    ? node.content
                    : '',
            }
          }
        }}
        onCloseFile={props.onCloseFile}
        canCloseFile={props.onCloseFile ? () => true : undefined}
        highlight={props.highlight}
        onCursorChange={
          props.onCursorChange
            ? (position) => {
                if (!position.explicit) return
                const model = editorRef.current?.getModel()
                if (model) props.onCursorChange?.({ ...position, source: model.getValue() })
              }
            : undefined
        }
        modelPathPrefix={project.id}
        onEditorReady={onEditorReady}
        formatLabel={t('pro.organizeCode')}
        onFormatIssue={onFormatIssue}
        readOnly={observer}
        indentSize={4}
        theme={theme === 'light' ? 'light' : 'vs-dark'}
        fontSize={fontSize || CODE_FONT_SIZE_DEFAULT}
        className="min-h-0 flex-1"
        tabsRightSlot={<FontSizeControls />}
      />
    </div>
  )
}
