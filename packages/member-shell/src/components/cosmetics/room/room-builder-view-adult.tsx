'use client'
import { Check, Loader2 } from 'lucide-react'
import { AdultCoins } from '../adult-ui'
import { ADULT_ROOM_COPY as copy } from '../skin'
import type { MoradaRoomViewProps } from './morada-room-view'
import { ROOM_BUILDER_TABS } from './room-builder-model'

/** Mesma prancha adulta, com seus tokens, tipografia, abas e painel lateral. */
export function AdultRoomBuilderView(props: MoradaRoomViewProps) {
  return (
    <div className="sz-cos-room-wrap">
      <div className="sz-cos-room">
        <div className="sz-cos-room-head">
          {props.header ? <div className="sz-cos-room-start">{props.header}</div> : null}
          <div className="sz-cos-room-actions">
            {props.wallet ? (
              <AdultCoins balance={props.wallet.balance} unlimited={props.wallet.unlimited} />
            ) : null}
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.saving || !props.ready}
              className="sz-cos-btn"
            >
              {props.saving ? (
                <Loader2 aria-hidden="true" className="sz-cos-spin" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {props.saving ? copy.saving : copy.save}
            </button>
          </div>
        </div>
        {props.notice ? <div style={{ gridColumn: '1 / -1' }}>{props.notice}</div> : null}
        <section className="sz-cos-room-main" aria-label={copy.stageRegion}>
          <div className="sz-cos-room-stage">
            {props.stage}
            {props.actions}
          </div>
          {props.extras}
          <p className="sz-cos-room-keys">{copy.keyboardHint}</p>
          <div role="group" aria-label={copy.pieces} className="sz-cos-chips">
            {props.pieces}
          </div>
        </section>
        <section className="sz-cos-room-shop" aria-label={copy.shopRegion}>
          <div role="group" aria-label={copy.tabsGroup} className="sz-cos-room-tabs">
            {ROOM_BUILDER_TABS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={props.tab === id}
                onClick={() => props.onTab(id)}
              >
                {copy.tabs[id]}
              </button>
            ))}
          </div>
          <div className="sz-cos-room-tray">{props.tray}</div>
        </section>
      </div>
    </div>
  )
}
