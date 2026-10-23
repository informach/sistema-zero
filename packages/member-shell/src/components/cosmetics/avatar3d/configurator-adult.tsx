'use client'

import {
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  Lock,
  LockOpen,
  RefreshCw,
  Shuffle,
  X,
} from 'lucide-react'
import { type ReactNode, useId } from 'react'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import {
  AVATAR_CATEGORIES,
  AVATAR_PART_INFO,
  type AvatarCategory,
} from '../../../lib/avatar3d-catalog'
import type { AvatarPartView, AvatarStateView } from '../../../lib/types'
import { AdultCoins, ShortLabel } from '../adult-ui'
import { adultColorName, adultUnlock, ADULT_AVATAR_COPY as copy } from '../skin'
import { AvatarScene, type CaptureFn } from './avatar-scene'
import { type LoadState, type Mode, POSES, type Slots } from './configurator-shared'
import { AvatarThumb } from './thumb-canvas'

export interface AdultAvatarConfiguratorProps {
  returnTo: AvatarReturnPath
  dark: boolean
  state: AvatarStateView | null
  loadState: LoadState
  slots: Slots
  balance: number
  coinsUnlimited: boolean
  mode: Mode
  onMode: (mode: Mode) => void
  pose: string
  onPose: (pose: string) => void
  category: AvatarCategory
  onCategory: (category: AvatarCategory) => void
  busy: string | null
  saving: boolean
  hasLocked: boolean
  /** Peça travada vestida de prévia, aguardando a confirmação da compra. */
  pendingPart: AvatarPartView | null
  items: AvatarPartView[]
  palette: string[] | undefined
  currentColor: string | undefined
  activePose: string
  onReady: (capture: CaptureFn) => void
  onRetry: () => void
  onRandomize: () => void
  onSave: () => void
  onSelectPart: (part: AvatarPartView) => void
  onCancelBuy: () => void
  onSelectColor: (color: string) => void
}

/**
 * A pele ADULTA do configurador (prancha "Meu avatar 3D", 18/10/2026). A lógica é a do
 * `AvatarConfigurator` (quem chama), sem mudar uma regra: aqui só a tela. Título com voltar em
 * texto, "Sortear visual" e "Salvar" no alto; a prévia 3D à esquerda e o painel de opções ao lado
 * a partir de 1024 px (no celular, embaixo). O desenho mora em `cosmetics-adult.css` (adulto).
 */
export function AdultAvatarConfigurator(props: AdultAvatarConfiguratorProps) {
  const { state, loadState, mode } = props
  const back = copy.back(props.returnTo)
  const start = (
    <div className="sz-cos-av-start">
      {/* Navegação COMPLETA (como o `window.location.assign` da saída depois de salvar): o layout
          relê a foto nova do avatar. */}
      <a href={props.returnTo} className="sz-cos-back">
        <ChevronLeft aria-hidden="true" />
        <ShortLabel text={back} compact />
      </a>
      <h1 className="sz-cos-av-title">{copy.title}</h1>
    </div>
  )

  if (loadState === 'error') {
    return (
      <div className="sz-cos-av" data-state="error">
        <header className="sz-cos-av-head">{start}</header>
        <div className="sz-cos-av-error">
          <p>{copy.loadError}</p>
          <button type="button" onClick={props.onRetry} className="sz-cos-btn">
            <RefreshCw aria-hidden="true" />
            {copy.retry}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sz-cos-av" data-mode={mode}>
      <header className="sz-cos-av-head">
        {start}
        <div className="sz-cos-av-actions">
          {state ? (
            <AdultCoins balance={props.balance} unlimited={props.coinsUnlimited} compact />
          ) : null}
          <button
            type="button"
            onClick={props.onRandomize}
            disabled={!state || Boolean(props.busy)}
            className="sz-cos-btn-outline"
          >
            <Shuffle aria-hidden="true" />
            <ShortLabel text={copy.randomize} compact />
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving || props.hasLocked || !state}
            className="sz-cos-btn"
          >
            {props.saving ? (
              <Loader2 aria-hidden="true" className="sz-cos-spin" />
            ) : props.hasLocked ? (
              <Lock aria-hidden="true" />
            ) : mode === 'photo' ? (
              <Camera aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {props.saving ? (
              copy.saving
            ) : (
              <ShortLabel
                text={{
                  lead: mode === 'photo' ? copy.takePhoto : copy.save,
                  rest: props.hasLocked ? copy.lockedSuffix : '',
                }}
                compact
              />
            )}
          </button>
        </div>
      </header>

      <div className="sz-cos-av-stage" role="img" aria-label={copy.stage}>
        {state ? (
          <AvatarScene
            slots={props.slots}
            onReady={props.onReady}
            dark={props.dark}
            mode={mode}
            pose={props.activePose}
          />
        ) : (
          <div className="sz-cos-av-wait">
            <Loader2 aria-hidden="true" className="sz-cos-spin" />
            <span>{copy.loading}</span>
          </div>
        )}
      </div>

      <section className="sz-cos-av-panel" aria-label={copy.panel}>
        <div role="group" aria-label={copy.modeGroup} className="sz-cos-segmented">
          <button
            type="button"
            aria-pressed={mode === 'customize'}
            onClick={() => props.onMode('customize')}
          >
            {copy.customize}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'photo'}
            onClick={() => props.onMode('photo')}
          >
            {copy.photo}
          </button>
        </div>
        {/* Sem o avatar carregado, as peças ainda não chegaram: "nenhum modelo" seria falso. */}
        {!state ? (
          <p role="status" className="sz-cos-muted">
            {copy.loading}
          </p>
        ) : mode === 'customize' ? (
          <CustomizePanel {...props} />
        ) : (
          <PhotoPanel {...props} />
        )}
      </section>
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

function CustomizePanel(props: AdultAvatarConfiguratorProps) {
  const { category, palette, pendingPart } = props
  return (
    <>
      <Field label={copy.partGroup}>
        {(labelId) => (
          <div role="group" aria-labelledby={labelId} className="sz-cos-chips">
            {AVATAR_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === category}
                onClick={() => props.onCategory(c)}
                className="sz-cos-chip"
              >
                {copy.categories[c]}
              </button>
            ))}
          </div>
        )}
      </Field>

      {palette && palette.length > 0 ? (
        <Field label={copy.colorHeading[category] ?? copy.colorFallback}>
          {(labelId) => (
            <div role="group" aria-labelledby={labelId} className="sz-cos-swatches">
              {palette.map((color, index) => {
                const name = adultColorName(color, index)
                const isCurrent = props.currentColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={name}
                    title={name}
                    aria-pressed={isCurrent}
                    onClick={() => props.onSelectColor(color)}
                    className="sz-cos-swatch"
                    style={{ backgroundColor: color }}
                  >
                    {isCurrent ? <Check aria-hidden="true" strokeWidth={3} /> : null}
                  </button>
                )
              })}
            </div>
          )}
        </Field>
      ) : null}

      <Field label={copy.itemsHeading[category]}>
        {(labelId) =>
          props.items.length > 0 ? (
            <div role="group" aria-labelledby={labelId} className="sz-cos-av-grid">
              {props.items.map((part) => (
                <ItemTile
                  key={part.id}
                  part={part}
                  selected={props.slots[part.category]?.asset === part.id}
                  disabled={Boolean(props.busy)}
                  confirming={pendingPart?.id === part.id}
                  onSelect={() => props.onSelectPart(part)}
                />
              ))}
            </div>
          ) : (
            <p className="sz-cos-muted">{copy.emptyItems}</p>
          )
        }
      </Field>

      {pendingPart ? (
        <PendingBar
          part={pendingPart}
          busy={Boolean(props.busy)}
          onCancel={props.onCancelBuy}
          onBuy={() => props.onSelectPart(pendingPart)}
        />
      ) : null}
    </>
  )
}

function PhotoPanel(props: AdultAvatarConfiguratorProps) {
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
            {POSES.map((pose) => (
              <button
                key={pose.id}
                type="button"
                aria-pressed={props.pose === pose.id}
                onClick={() => props.onPose(pose.id)}
                className="sz-cos-chip"
              >
                {copy.poses[pose.id] ?? pose.label}
              </button>
            ))}
          </div>
        )}
      </Field>
    </>
  )
}

/** Uma peça na grade, com a miniatura. Travada: cadeado + preço, e o motivo no nome do botão. */
function ItemTile({
  part,
  selected,
  disabled,
  confirming,
  onSelect,
}: {
  part: AvatarPartView
  selected: boolean
  disabled: boolean
  confirming: boolean
  onSelect: () => void
}) {
  const isNone = part.id.endsWith('-none')
  const info = AVATAR_PART_INFO[part.id]
  const label = info?.labelPt ?? part.id
  const name = part.locked
    ? confirming
      ? copy.previewTile(label, part.price)
      : copy.lockedTile(label, part.price)
    : label
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={name}
      title={label}
      aria-pressed={selected}
      className="sz-cos-av-tile"
      data-locked={part.locked ? 'true' : undefined}
      data-confirming={confirming ? 'true' : undefined}
    >
      {isNone ? (
        <span className="sz-cos-av-tile-none">
          <X aria-hidden="true" />
          {label}
        </span>
      ) : info ? (
        <AvatarThumb partId={part.id} category={info.category} />
      ) : (
        <span className="sz-cos-av-tile-none">{label}</span>
      )}
      {part.locked ? (
        <span className="sz-cos-av-tile-price" aria-hidden="true">
          {confirming ? <LockOpen /> : <Lock />}
          {part.price}
        </span>
      ) : null}
    </button>
  )
}

/** A peça travada está vestida de prévia: desistir ou desbloquear. */
function PendingBar({
  part,
  busy,
  onCancel,
  onBuy,
}: {
  part: AvatarPartView
  busy: boolean
  onCancel: () => void
  onBuy: () => void
}) {
  const text = copy.preview(AVATAR_PART_INFO[part.id]?.labelPt ?? part.id)
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
        <button type="button" onClick={onBuy} disabled={busy} className="sz-cos-buybar-main">
          {adultUnlock(part.price)}
        </button>
      </div>
    </div>
  )
}
