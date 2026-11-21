import { type JSX, useEffect, useMemo } from 'react'
import { createMapSetEditorStore } from '../../state/mapSetEditorStore'
import { PintaEditorProvider, useEditorStores } from './editorContext'
import { TilemapEditor } from './TilemapEditor'

/** A edição usa o editor de mapa e o histórico do desenho externo, sem outra cópia/salvamento. */
export function MapSetEditor(): JSX.Element {
  const outer = useEditorStores()
  const inner = useMemo(() => createMapSetEditorStore(outer.editor), [outer.editor])
  useEffect(
    () => outer.editor.subscribe(() => inner.store.setState(inner.read(), true)),
    [outer.editor, inner],
  )
  return (
    <PintaEditorProvider value={{ ...outer, editor: inner.store }}>
      <TilemapEditor setEditor />
    </PintaEditorProvider>
  )
}
