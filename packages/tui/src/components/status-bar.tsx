import { TextAttributes } from '@opentui/core'
import { sanitize } from '@sistemazero/agent-core'
import { useTheme } from '../providers/theme'

export function StatusBar({ status }: { status: string }) {
  const { colors } = useTheme()
  return (
    <box flexDirection="row" gap={1}>
      <text fg={colors.primary}>{sanitize(status)}</text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        &#8250;
      </text>
    </box>
  )
}
