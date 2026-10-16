import type * as Monaco from 'monaco-editor'
import { useEffect, useRef } from 'react'
import { type ProCommand, runProCommand } from './commands'

/** Instance-owned actions; no global editor registrations or captured project snapshots. */
export function useProCommands(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  commands: ProCommand[],
) {
  const latest = useRef(commands)
  latest.current = commands
  const keys = useRef(new Map<string, Monaco.editor.IContextKey<boolean>>())
  const signature = JSON.stringify(
    commands.map(({ id, label, keybinding }) => [id, label, keybinding]),
  )
  useEffect(() => {
    if (!editor || signature === '[]') return
    let active = true
    const disposables: Monaco.IDisposable[] = []
    void import('monaco-editor/esm/vs/editor/editor.api.js').then(({ KeyMod, KeyCode }) => {
      if (!active) return
      const bindings = {
        quickOpen: KeyMod.CtrlCmd | KeyCode.KeyP,
        searchProject: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF,
        symbols: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyO,
        rename: KeyCode.F2,
        references: KeyMod.Shift | KeyCode.F12,
      }
      for (const command of latest.current) {
        const id = `studio.pro.${command.id}`
        const key = editor.createContextKey(id, command.enabled)
        keys.current.set(command.id, key)
        disposables.push(
          editor.addAction({
            id,
            label: `Studio: ${command.label}`,
            precondition: id,
            ...(command.keybinding
              ? {
                  keybindings: [bindings[command.keybinding]],
                  keybindingContext: 'editorTextFocus',
                }
              : {}),
            run: () => runProCommand(latest.current, command.id),
          }),
        )
      }
    })
    return () => {
      active = false
      for (const disposable of disposables) disposable.dispose()
      for (const key of keys.current.values()) key.reset()
      keys.current.clear()
    }
  }, [editor, signature])
  useEffect(() => {
    for (const command of commands) keys.current.get(command.id)?.set(command.enabled)
  }, [commands])
}
