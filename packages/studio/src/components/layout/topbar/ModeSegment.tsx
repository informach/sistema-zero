import type { JSX } from 'react'
import type { IDEMode } from '#core'
import { IconArrowLeftRight, IconBlocks, IconCode, type IconProps } from '#ui'
import { useT } from '../../../studio/i18n'

const MODE_ICON: Record<IDEMode, (props: IconProps) => JSX.Element> = {
  blocks: IconBlocks,
  bridge: IconArrowLeftRight,
  code: IconCode,
}

/**
 * O seletor de modo no MEIO da barra (11/09/2026, a tela-modelo): um segmentado em pílula, o
 * modo atual no azul da marca, cada modo com o seu ícone e o rótulo do sistema. Abaixo do largo
 * o rótulo vira `sr-only` (o nome acessível segue "Blocos"/"Ponte"/"Código", que os e2e usam) e
 * o `title` dá a dica ao mouse.
 */
export function ModeSegment({
  modes,
  active,
  onSelect,
  iconOnly,
}: {
  modes: readonly IDEMode[]
  active: IDEMode
  onSelect: (mode: IDEMode) => void
  iconOnly: boolean
}): JSX.Element {
  const t = useT()
  return (
    <fieldset className="sz-bar-modes">
      <legend className="sr-only">{t('topbar.modes')}</legend>
      {modes.map((mode) => {
        const Icon = MODE_ICON[mode]
        const label = t(`mode.${mode}`)
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active === mode}
            title={iconOnly ? label : undefined}
            onClick={() => onSelect(mode)}
            className="sz-bar-mode"
          >
            <Icon />
            <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}
