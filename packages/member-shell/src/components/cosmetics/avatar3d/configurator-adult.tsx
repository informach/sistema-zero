'use client'

import { avatarFileUrl } from '@sistemazero/core/avatar'
import {
  Camera,
  Check,
  ChevronLeft,
  CloudOff,
  Eye,
  Loader2,
  Lock,
  LockOpen,
  RefreshCw,
  Shuffle,
  Undo2,
  X,
} from 'lucide-react'
import { type ReactNode, useId } from 'react'
import {
  AVATAR_FILTERS,
  AVATAR_TABS,
  type AvatarShopItem,
  avatarItemLabel,
  avatarPoses,
  isAvatarItemWorn,
} from '../../../lib/avatar-pack'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import { AdultCoins, ShortLabel } from '../adult-ui'
import { adultUnlock, ADULT_AVATAR_COPY as copy } from '../skin'
import { AvatarScene } from './avatar-scene'
import type { AvatarEditor, SaveStatus } from './use-avatar-editor'

export interface AdultAvatarConfiguratorProps {
  editor: AvatarEditor
  returnTo: AvatarReturnPath
  onExit: () => void
  /** Aberto por cima do jogo (volta ao jogo em vez de navegar). */
  embedded: boolean
  seasonalChoices?: ReactNode
  dark: boolean
}

/**
 * A pele ADULTA do "Meu avatar" (direção de arte de 18/10/2026). A lógica é a do
 * `useAvatarEditor`, a mesma do Kids: aqui só a tela. Voltar em texto, "Sortear visual" e o
 * estado do salvamento no alto; a prévia 3D à esquerda e o painel ao lado a partir de 1024 px (no
 * celular, embaixo). O desenho mora em `cosmetics-adult.css` (comunidade adulta).
 */
export function AdultAvatarConfigurator(props: AdultAvatarConfiguratorProps) {
  const { editor } = props
  const { state, loadState, mode } = editor
  const back = copy.back(props.returnTo)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && props.embedded) {
      e.preventDefault()
      props.onExit()
    }
  }
  const start = (
    <div className="sz-cos-av-start">
      <button
        type="button"
        onClick={props.onExit}
        disabled={Boolean(editor.busy) || editor.photoBusy}
        className="sz-cos-back"
      >
        <ChevronLeft aria-hidden="true" />
        {props.embedded ? copy.backToGame : <ShortLabel text={back} compact />}
      </button>
      <h1 className="sz-cos-av-title">{copy.title}</h1>
    </div>
  )

  if (loadState === 'error') {
    return (
      <div className="sz-cos-av" data-state="error" onKeyDown={onKeyDown}>
        <header className="sz-cos-av-head">{start}</header>
        <div className="sz-cos-av-error">
          <p>{copy.loadError}</p>
          <button type="button" onClick={editor.retry} className="sz-cos-btn">
            <RefreshCw aria-hidden="true" />
            {copy.retry}
          </button>
        </div>
      </div>
    )
  }

  const askFilter = state !== null && editor.filter === null
  return (
    <div className="sz-cos-av" data-mode={mode} onKeyDown={onKeyDown}>
      <header className="sz-cos-av-head">
        {start}
        <div className="sz-cos-av-actions">
          {state ? (
            <AdultCoins balance={editor.balance} unlimited={editor.coinsUnlimited} compact />
          ) : null}
          <button
            type="button"
            onClick={editor.randomize}
            disabled={!state || Boolean(editor.busy) || askFilter}
            className="sz-cos-btn-outline"
          >
            <Shuffle aria-hidden="true" />
            <ShortLabel text={copy.randomize} compact />
          </button>
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={() => void editor.takePhoto()}
              disabled={!state || editor.photoBusy || editor.status === 'preview'}
              className="sz-cos-btn"
            >
              {editor.photoBusy ? (
                <Loader2 aria-hidden="true" className="sz-cos-spin" />
              ) : (
                <Camera aria-hidden="true" />
              )}
              {copy.takePhoto}
            </button>
          ) : state ? (
            <SaveState status={editor.status} onRetry={editor.retrySave} />
          ) : null}
        </div>
      </header>

      <div className="sz-cos-av-stage" role="img" aria-label={copy.stage}>
        {state ? (
          <AvatarScene
            slots={editor.slots}
            onReady={editor.onReady}
            dark={props.dark}
            mode={mode}
            pose={mode === 'photo' ? editor.pose : undefined}
          />
        ) : (
          <div className="sz-cos-av-wait">
            <Loader2 aria-hidden="true" className="sz-cos-spin" />
            <span>{copy.loading}</span>
          </div>
        )}
      </div>

      <section className="sz-cos-av-panel" aria-label={copy.panel}>
        {props.seasonalChoices}
        {!state ? (
          <p role="status" className="sz-cos-muted">
            {copy.loading}
          </p>
        ) : askFilter ? (
          <FilterQuestion editor={editor} />
        ) : (
          <>
            <div role="group" aria-label={copy.modeGroup} className="sz-cos-segmented">
              <button
                type="button"
                aria-pressed={mode === 'customize'}
                onClick={() => editor.setMode('customize')}
              >
                {copy.customize}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'photo'}
                onClick={() => editor.setMode('photo')}
              >
                {copy.photo}
              </button>
            </div>
            {mode === 'customize' ? (
              <CustomizePanel editor={editor} />
            ) : (
              <PhotoPanel editor={editor} />
            )}
          </>
        )}
      </section>
    </div>
  )
}

/** O estado do salvamento, no lugar do antigo botão "Salvar". */
function SaveState({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'error')
    return (
      <button type="button" onClick={onRetry} className="sz-cos-btn-outline">
        <CloudOff aria-hidden="true" />
        {copy.saveError}
      </button>
    )
  const icon =
    status === 'saved' ? (
      <Check aria-hidden="true" />
    ) : status === 'preview' ? (
      <Eye aria-hidden="true" />
    ) : (
      <Loader2 aria-hidden="true" className="sz-cos-spin" />
    )
  return (
    <span role="status" aria-live="polite" className="sz-cos-savestate" data-status={status}>
      {icon}
      {copy.saveStatus[status]}
    </span>
  )
}

function FilterQuestion({ editor }: { editor: AvatarEditor }) {
  return (
    <div className="sz-cos-field">
      <span className="sz-cos-label">{copy.filterQuestion}</span>
      <div className="sz-cos-segmented">
        {AVATAR_FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => editor.chooseFilter(f.id)}>
            {copy.filters[f.id]}
          </button>
        ))}
      </div>
      <p className="sz-cos-muted">{copy.filterHint}</p>
    </div>
  )
}

/** Um bloco do painel: o título SEMPRE à vista e o grupo de controles que ele nomeia. */
function Field({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="sz-cos-field">
      <span id={id} className="sz-cos-label">
        {label}
      </span>
      {children(id)}
    </div>
  )
}

function CustomizePanel({ editor }: { editor: AvatarEditor }) {
  const { tab, kinds, kind, items, pending, notice, catalog } = editor
  return (
    <>
      <Field label={copy.filterLabel}>
        {(labelId) => (
          <div role="group" aria-labelledby={labelId} className="sz-cos-segmented">
            {AVATAR_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={editor.filter === f.id}
                onClick={() => editor.chooseFilter(f.id)}
              >
                {copy.filters[f.id]}
              </button>
            ))}
          </div>
        )}
      </Field>

      <Field label={copy.partGroup}>
        {(labelId) => (
          <div role="group" aria-labelledby={labelId} className="sz-cos-chips">
            {AVATAR_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === tab.id}
                onClick={() => editor.chooseTab(t.id)}
                className="sz-cos-chip"
              >
                {copy.tabs[t.id]}
              </button>
            ))}
          </div>
        )}
      </Field>

      {kinds.length > 1 ? (
        <Field label={copy.kindGroup}>
          {(labelId) => (
            <div role="group" aria-labelledby={labelId} className="sz-cos-chips">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={k.id === kind?.id}
                  onClick={() => editor.chooseKind(k.id)}
                  className="sz-cos-chip"
                >
                  {k.label}
                </button>
              ))}
            </div>
          )}
        </Field>
      ) : null}

      {notice ? (
        <div role="status" className="sz-cos-hint sz-cos-av-notice">
          <p>{copy.notice(notice.chosen, notice.removed)}</p>
          <button type="button" onClick={editor.undoNotice} className="sz-cos-btn-outline">
            <Undo2 aria-hidden="true" />
            {copy.undo}
          </button>
        </div>
      ) : null}

      <Field label={copy.tabs[tab.id]}>
        {(labelId) =>
          items.length > 0 ? (
            <div
              role="group"
              aria-labelledby={labelId}
              className="sz-cos-av-grid"
              data-swatches={tab.id === 'corpo' ? 'true' : undefined}
            >
              {items.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  worn={isAvatarItemWorn(catalog, item, tab, editor.slots)}
                  disabled={Boolean(editor.busy)}
                  confirming={pending?.id === item.id}
                  onSelect={() => editor.choose(item)}
                />
              ))}
            </div>
          ) : (
            <p className="sz-cos-muted">{copy.emptyItems}</p>
          )
        }
      </Field>

      {pending ? (
        <PendingBar
          label={avatarItemLabel(catalog, pending.id)}
          item={pending}
          busy={Boolean(editor.busy)}
          onCancel={editor.cancelBuy}
          onBuy={() => editor.choose(pending)}
        />
      ) : null}
    </>
  )
}

function PhotoPanel({ editor }: { editor: AvatarEditor }) {
  return (
    <>
      <p className="sz-cos-hint">
        {copy.photoHint.before}
        <strong>{copy.photoHint.strong}</strong>
        {copy.photoHint.after}
      </p>
      <Field label={copy.poseGroup}>
        {(labelId) => (
          <div role="group" aria-labelledby={labelId} className="sz-cos-chips">
            {avatarPoses(editor.catalog).map((pose) => (
              <button
                key={pose.id}
                type="button"
                aria-pressed={editor.pose === pose.id}
                onClick={() => editor.setPose(pose.id)}
                className="sz-cos-chip"
              >
                {pose.label}
              </button>
            ))}
          </div>
        )}
      </Field>
    </>
  )
}

/** Uma escolha na grade, com a miniatura. Travada: cadeado + preço, e o motivo no nome do botão. */
function ItemTile({
  item,
  worn,
  disabled,
  confirming,
  onSelect,
}: {
  item: AvatarShopItem
  worn: boolean
  disabled: boolean
  confirming: boolean
  onSelect: () => void
}) {
  const daFesta = !item.owned && item.tier === 'festa'
  const label = item.swatch ? item.label.replace(/^Corpo /, 'Cor ') : item.label
  const name = daFesta
    ? copy.festaTile(label)
    : !item.owned
      ? confirming
        ? copy.previewTile(label, item.price)
        : copy.lockedTile(label, item.price)
      : label
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={name}
      title={label}
      aria-pressed={worn}
      className={item.swatch ? 'sz-cos-swatch' : 'sz-cos-av-tile'}
      style={item.swatch ? { backgroundColor: item.swatch } : undefined}
      data-locked={!item.owned ? 'true' : undefined}
      data-confirming={confirming ? 'true' : undefined}
    >
      {item.swatch ? (
        worn ? (
          <Check aria-hidden="true" strokeWidth={3} />
        ) : null
      ) : item.kind === 'none' ? (
        <span className="sz-cos-av-tile-none">
          <X aria-hidden="true" />
          {copy.none}
        </span>
      ) : item.thumb ? (
        <img src={avatarFileUrl(item.thumb)} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="sz-cos-av-tile-none">{label}</span>
      )}
      {!item.owned ? (
        <span className="sz-cos-av-tile-price" aria-hidden="true">
          {confirming && !daFesta ? <LockOpen /> : <Lock />}
          {daFesta ? copy.festaBadge : item.price}
        </span>
      ) : null}
    </button>
  )
}

/** A peça (ou fantasia) travada está vestida de prévia: desistir ou desbloquear. */
function PendingBar({
  label,
  item,
  busy,
  onCancel,
  onBuy,
}: {
  label: string
  item: AvatarShopItem
  busy: boolean
  onCancel: () => void
  onBuy: () => void
}) {
  const daFesta = item.tier === 'festa'
  const text = daFesta ? copy.previewFesta(label) : copy.preview(label)
  return (
    <div role="status" className="sz-cos-buybar">
      <p>
        <strong>{text.strong}</strong>
        {text.text}
      </p>
      <div className="sz-cos-buybar-actions">
        <button type="button" onClick={onCancel} disabled={busy} className="sz-cos-buybar-quiet">
          {copy.notNow}
        </button>
        {daFesta ? null : (
          <button type="button" onClick={onBuy} disabled={busy} className="sz-cos-buybar-main">
            {adultUnlock(item.price)}
          </button>
        )}
      </div>
    </div>
  )
}
