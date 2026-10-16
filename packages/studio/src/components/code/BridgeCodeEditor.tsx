import { MonacoTabs, type MonacoTabsProps } from '#monaco'
import { CODE_FONT_SIZE_DEFAULT, useSettingsStore } from '../../state/settingsStore'
import { useT } from '../../studio/i18n'
import { useStudioTheme } from '../../studio/theme'
import { FontSizeControls } from './FontSizeControls'
import { useCodeHistory } from './useCodeHistory'
import { useFormatIssueLogger } from './useFormatIssueLogger'

/** The code controls and their listeners share Monaco's lazy lifetime. */
export default function BridgeCodeEditor(
  props: Omit<
    MonacoTabsProps,
    'theme' | 'fontSize' | 'formatLabel' | 'onFormatIssue' | 'onEditorReady'
  >,
) {
  const t = useT()
  const theme = useStudioTheme()
  const fontSize = useSettingsStore((state) => state.codeFontSize)
  const onEditorReady = useCodeHistory()
  const onFormatIssue = useFormatIssueLogger()
  return (
    <MonacoTabs
      {...props}
      theme={theme === 'light' ? 'light' : 'vs-dark'}
      fontSize={fontSize || CODE_FONT_SIZE_DEFAULT}
      formatLabel={t('editor.format')}
      onFormatIssue={onFormatIssue}
      onEditorReady={onEditorReady}
      tabsRightSlot={
        <div className="flex items-center gap-1">
          {props.tabsRightSlot}
          <FontSizeControls />
        </div>
      }
    />
  )
}
