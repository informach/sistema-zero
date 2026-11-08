import type * as Monaco from 'monaco-editor'
import type { JSX, RefObject } from 'react'
import { cn, IconFile, IconMore, IconWand, IconWindow, Menu, type MenuSection } from '#ui'
import { proFileBaseName, proFileKind } from '../../../components/code/proFileKinds'
import type { MonacoHeaderContext } from '../../../monaco/MonacoTabs'
import { useSettingsStore } from '../../../state/settingsStore'
import { useT } from '../../../studio/i18n'
import type { ProStageSubject } from './ProStage'

/** O que a faixa pede ao `ProCodeTools` (as janelas moram lá; a faixa só abre). */
export interface ProEditorTools {
  openSymbols(): void
  openCommands(): void
  findReferences(): void
  rename(): void
}

export const PRO_FONT_SIZES = [14, 16, 18, 20, 24] as const

/**
 * A faixa ÚNICA sobre o código do Pro (redesenho de 11/2026), desenhada pelo `headerSlot` do
 * `MonacoTabs`: as abas (ladrilho da linguagem + nome curto; itálico na temporária, duplo clique
 * fixa; o × na ativa e no hover), e à direita "Mostrar o jogo" (só em "Só o código"), "Arrumar
 * código", o "Aa" dos tamanhos de letra e o menu "Mais" com o que antes eram cinco faixas de
 * botões: Mapa do arquivo, Ir para um arquivo, Procurar neste arquivo, Onde isto é usado, Trocar
 * nome em todo lugar, Mostrar espaços, Fechar as outras abas e Todas as ações.
 */
export function ProEditorStrip({
  ctx,
  subject,
  layout,
  entrypoint,
  tools,
  editor,
  showWhitespace,
  onToggleWhitespace,
  onShowStage,
  onQuickOpen,
  onCloseOthers,
}: {
  ctx: MonacoHeaderContext
  subject: ProStageSubject
  layout: 'split' | 'code' | 'game'
  entrypoint?: string | null
  tools: ProEditorTools | null
  editor: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
  showWhitespace: boolean
  onToggleWhitespace: () => void
  onShowStage: () => void
  onQuickOpen: () => void
  onCloseOthers: () => void
}): JSX.Element {
  const t = useT()
  const fontSize = useSettingsStore((s) => (s.codeFontSizeChosen ? s.codeFontSize : 16))
  const setFontSize = useSettingsStore((s) => s.setCodeFontSize)
  const fontSections: MenuSection[] = [
    {
      id: 'sizes',
      label: t('pro.fontSize'),
      items: PRO_FONT_SIZES.map((size) => ({
        id: String(size),
        label: `${size}`,
        active: size === fontSize,
        onSelect: () => void setFontSize(size),
      })),
    },
  ]
  const moreSections: MenuSection[] = [
    {
      id: 'navigate',
      items: [
        {
          id: 'symbols',
          label: t('pro.symbols'),
          hint: 'Ctrl+Shift+O',
          disabled: !tools || !ctx.active,
          onSelect: () => tools?.openSymbols(),
        },
        { id: 'quickOpen', label: t('pro.quickOpen'), hint: 'Ctrl+P', onSelect: onQuickOpen },
        {
          id: 'find',
          label: t('pro.findInFile'),
          hint: 'Ctrl+F',
          disabled: !ctx.active,
          onSelect: () => {
            editor.current?.focus()
            void editor.current?.getAction('actions.find')?.run()
          },
        },
      ],
    },
    {
      id: 'edit',
      items: [
        {
          id: 'references',
          label: t('pro.references'),
          hint: 'Shift+F12',
          disabled: !tools || !ctx.active,
          onSelect: () => tools?.findReferences(),
        },
        {
          id: 'rename',
          label: t('pro.renameSymbol'),
          hint: 'F2',
          disabled: !tools || !ctx.active,
          onSelect: () => tools?.rename(),
        },
      ],
    },
    {
      id: 'view',
      items: [
        {
          id: 'whitespace',
          label: t('pro.showWhitespace'),
          active: showWhitespace,
          onSelect: onToggleWhitespace,
        },
        {
          id: 'closeOthers',
          label: t('pro.closeOtherTabs'),
          disabled: ctx.files.length < 2,
          onSelect: onCloseOthers,
        },
      ],
    },
    {
      id: 'all',
      items: [
        {
          id: 'commands',
          label: `${t('pro.commands')}…`,
          hint: 'Ctrl+Shift+P',
          disabled: !tools,
          onSelect: () => tools?.openCommands(),
        },
      ],
    },
  ]
  return (
    <div className="sz-pro-strip">
      <div
        role="tablist"
        aria-label={t('pro.tabs.list')}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {ctx.files.map((file) => {
          const active = file.name === ctx.active
          const kind = proFileKind(file.name, { entrypoint })
          const temporary = ctx.temporaryFile === file.name
          return (
            <div key={file.name} className="group flex flex-none items-center">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                title={file.name}
                className={cn('sz-pro-edtab', temporary && 'sz-pro-edtab--temporary')}
                onClick={() => ctx.setActive(file.name)}
                onDoubleClick={() => ctx.pinFile(file.name)}
              >
                <span
                  aria-hidden="true"
                  className={cn('sz-pro-tile sz-pro-tile--sm', `sz-pro-tile--${kind.tone}`)}
                >
                  {kind.short || <IconFile />}
                </span>
                <span className="sz-pro-edtab__name">{proFileBaseName(file.name)}</span>
              </button>
              {ctx.canClose(file.name) ? (
                <button
                  type="button"
                  aria-label={t('pro.tabs.close', { name: file.name })}
                  className={cn('sz-pro-edtab__close', !active && 'sz-pro-edtab__close--quiet')}
                  onClick={() => ctx.closeFile(file.name)}
                >
                  ×
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-none items-center gap-1">
        {layout === 'code' ? (
          <button
            type="button"
            className={cn('sz-pro-btn sz-pro-btn--sm', ctx.compact && 'sz-pro-btn--icon')}
            aria-label={t(`pro.showStage.${subject}`)}
            title={ctx.compact ? t(`pro.showStage.${subject}`) : undefined}
            onClick={onShowStage}
          >
            <IconWindow />
            {!ctx.compact ? <span>{t(`pro.showStage.${subject}`)}</span> : null}
          </button>
        ) : null}
        <button
          type="button"
          className={cn('sz-pro-btn sz-pro-btn--sm', ctx.compact && 'sz-pro-btn--icon')}
          disabled={ctx.formatBusy || !ctx.canFormat}
          aria-busy={ctx.formatBusy}
          aria-label={t('pro.organizeCode')}
          title={`${t('pro.organizeCode')} (Shift+Alt+F)`}
          onClick={ctx.format}
        >
          <IconWand />
          {!ctx.compact ? <span>{t('pro.organizeCode')}</span> : null}
        </button>
        <Menu
          trigger={<span className="sz-pro-aa">Aa</span>}
          label={t('pro.fontSize')}
          sections={fontSections}
        />
        <Menu trigger={<IconMore size={18} />} label={t('pro.more')} sections={moreSections} />
      </div>
    </div>
  )
}
