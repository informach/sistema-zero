// editor.api intentionally omits optional UI contributions. Pro assistance actions
// need this menu (right click / Shift+F10) registered before the editor is created.
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js'
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js'
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js'
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'

import { MonacoTabs as Editor, type MonacoTabsProps } from '#monaco'
import { FontSizeControls } from '../../components/code/FontSizeControls'
import { useCodeHistory } from '../../components/code/useCodeHistory'
import { useFormatIssueLogger } from '../../components/code/useFormatIssueLogger'
import { useSettingsStore } from '../../state/settingsStore'
import { useT } from '../../studio/i18n'
import { useStudioTheme } from '../../studio/theme'

/** Controls and history are loaded with the editor they own, not the workspace shell. */
export function MonacoTabs(props: MonacoTabsProps) {
  const t = useT()
  const theme = useStudioTheme()
  const fontSize = useSettingsStore((state) => (state.codeFontSizeChosen ? state.codeFontSize : 15))
  const onEditorReady = useCodeHistory()
  const onFormatIssue = useFormatIssueLogger()
  return (
    <Editor
      {...props}
      theme={theme === 'light' ? 'light' : 'vs-dark'}
      fontSize={fontSize}
      formatLabel={t('pro.organizeCode')}
      onFormatIssue={onFormatIssue}
      tabsRightSlot={<FontSizeControls defaultSize={15} />}
      onEditorReady={(editor, scope) => {
        onEditorReady(editor)
        props.onEditorReady?.(editor, scope)
      }}
    />
  )
}
