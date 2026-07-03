/**
 * Editor PONTUAL de UMA tela (etapa E): nome + elementos (o que aparece: título,
 * botão, herói, inimigo, item, fundo, placar, texto — cada um com posição). Salva
 * SÓ esta tela (mantém o resto do desenho e re-valida) — a criança conserta uma
 * tela de um jogo grande sem refazer o esboço inteiro.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { useStore } from 'zustand'
import {
  type PensaScreenElement,
  type PensaScreenElementKind,
  type PensaSpecScreen,
  SCREEN_ELEMENT_KINDS,
  SCREEN_ZONES,
} from '../../core/specContent'
import type { PensaStageEStore } from '../../state/stageEStore'
import { usePensaApp } from '../appContext'
import { Dialog } from '../common/Dialog'

const MAX_ELEMENTS = 14

export function ScreenEditor({
  store,
  open,
  projectId,
  screenIndex,
  screen,
  onClose,
}: {
  store: PensaStageEStore
  open: boolean
  projectId: string
  screenIndex: number
  screen: PensaSpecScreen
  onClose: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageE.screenEdit
  const saving = useStore(store, (s) => s.generatingSpec)
  const error = useStore(store, (s) => s.specError)

  const [name, setName] = useState(screen.name)
  const [elements, setElements] = useState<PensaScreenElement[]>(screen.elements)

  const setElement = (index: number, patch: Partial<PensaScreenElement>): void => {
    setElements((list) => list.map((el, i) => (i === index ? { ...el, ...patch } : el)))
  }

  const handleSave = async (): Promise<void> => {
    const clean: PensaSpecScreen = {
      name: name.trim().slice(0, 40) || screen.name,
      elements: elements
        .map((el) => ({ ...el, label: el.label.trim() }))
        .filter((el) => el.label.length > 0)
        .slice(0, MAX_ELEMENTS),
    }
    const ok = await store.getState().editScreen(projectId, screenIndex, clean)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={c.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold text-pz-text">{c.nameLabel}</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 rounded-2xl border-2 border-pz-border bg-pz-bg px-4 text-pz-text outline-none focus:border-pz-accent"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold text-pz-text">{c.elementsLabel}</legend>
          {elements.map((el, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a posição É a identidade da linha.
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-pz-border bg-pz-bg p-2"
            >
              <input
                type="text"
                value={el.label}
                maxLength={60}
                autoComplete="off"
                onChange={(e) => setElement(index, { label: e.target.value })}
                placeholder={c.labelPlaceholder}
                aria-label={c.labelPlaceholder}
                className="min-h-10 min-w-0 flex-1 basis-full rounded-xl border-2 border-pz-border bg-pz-surface px-3 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
              />
              <label className="flex items-center gap-1 text-sm text-pz-muted">
                <span className="sr-only">{c.kindLabel}</span>
                <select
                  value={el.kind}
                  onChange={(e) =>
                    setElement(index, { kind: e.target.value as PensaScreenElementKind })
                  }
                  className="min-h-10 rounded-xl border-2 border-pz-border bg-pz-surface px-2 text-pz-text focus:border-pz-accent"
                >
                  {SCREEN_ELEMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {c.kinds[kind]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-sm text-pz-muted">
                <span className="sr-only">{c.zoneLabel}</span>
                <select
                  value={el.zone}
                  onChange={(e) =>
                    setElement(index, { zone: e.target.value as PensaScreenElement['zone'] })
                  }
                  className="min-h-10 rounded-xl border-2 border-pz-border bg-pz-surface px-2 text-pz-text focus:border-pz-accent"
                >
                  {SCREEN_ZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {c.zones[zone]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setElements((list) => list.filter((_, i) => i !== index))}
                aria-label={c.removeElement}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-pz-border text-pz-muted transition hover:border-pz-warn hover:text-pz-warn"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
          {elements.length < MAX_ELEMENTS ? (
            <button
              type="button"
              onClick={() =>
                setElements((list) => [...list, { kind: 'text', label: '', zone: 'middle' }])
              }
              className="min-h-11 self-start rounded-2xl border-2 border-dashed border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
            >
              <span aria-hidden="true">➕ </span>
              {c.addElement}
            </button>
          ) : null}
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-pz-warn">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text"
          >
            {c.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving || undefined}
            className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? c.saving : c.save}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
