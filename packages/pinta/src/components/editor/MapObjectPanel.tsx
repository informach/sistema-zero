/**
 * Painel da camada de OBJETOS: a lista dos objetos (o caminho do teclado e do
 * leitor de tela até cada um) e, com um escolhido, os campos dele — nome, tipo,
 * posição e tamanho em pixels do mapa, e as PROPRIEDADES (texto, número ou sim
 * ou não), que é o que o código do jogo lê.
 *
 * Os campos de texto e número gravam ao SAIR do campo (ou no Enter): gravar a
 * cada tecla criaria uma entrada de desfazer por letra. Esc devolve o valor de
 * antes. Tipo do valor e "sim ou não" gravam na hora.
 */
import type { JSX, KeyboardEvent } from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type {
  TilemapObject,
  TilemapObjectLayer,
  TilemapObjectPropertyValue,
} from '../../core/project'
import { PINTA_LIMITS } from '../../core/project'
import {
  convertPropertyValue,
  isObjectPropertyKind,
  isPointObject,
  type MapObjectPatch,
  OBJECT_PROPERTY_KINDS,
  objectPropertyKind,
} from '../../tiles/mapObjects'
import { Button, IconButton } from '../ui/Button'
import { MapPin, Plus, Square, Trash2 } from '../ui/icons'
import { Panel } from '../ui/Panel'

interface MapObjectPanelProps {
  layer: TilemapObjectLayer
  selectedObjectId: string | null
  onSelectObject: (id: string | null) => void
  onUpdateObject: (id: string, patch: MapObjectPatch) => void
  onRemoveObject: (id: string) => void
  /** Troca/renomeia UMA propriedade (`previousKey` = renomear mantendo a ordem). */
  onSetProperty: (
    id: string,
    key: string,
    value: TilemapObjectPropertyValue,
    previousKey?: string,
  ) => void
  onRemoveProperty: (id: string, key: string) => void
  onAddProperty: (id: string) => void
}

const FIELD =
  'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm text-pin-text'

export function MapObjectPanel({
  layer,
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  onRemoveObject,
  onSetProperty,
  onRemoveProperty,
  onAddProperty,
}: MapObjectPanelProps): JSX.Element {
  const selected = layer.objects.find((object) => object.id === selectedObjectId) ?? null
  return (
    <>
      <Panel title={COPY.tiles.objectsPanel}>
        {layer.objects.length === 0 ? (
          <p className="text-sm text-pin-muted">{COPY.tiles.objectsEmpty}</p>
        ) : (
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {layer.objects.map((object, index) => {
              const active = object.id === selectedObjectId
              const name = object.name || `${COPY.tiles.objectNamePrefix} ${index + 1}`
              const Icon = isPointObject(object) ? MapPin : Square
              return (
                <li key={object.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={COPY.tiles.pickObject(name)}
                    onClick={() => onSelectObject(active ? null : object.id)}
                    className={`flex min-h-11 w-full items-center gap-2 truncate rounded-xl border-2 px-3 text-left text-sm font-bold transition ${
                      active ? 'border-pin-accent' : 'border-transparent hover:bg-pin-bg'
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="truncate">{name}</span>
                    {object.type ? (
                      <span className="ml-auto shrink-0 rounded bg-pin-accent/20 px-1 text-[10px] font-bold text-pin-accent">
                        {object.type}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {selected ? (
        <ObjectDetails
          key={selected.id}
          object={selected}
          onUpdate={(patch) => onUpdateObject(selected.id, patch)}
          onRemove={() => onRemoveObject(selected.id)}
          onSetProperty={(key, value, previousKey) =>
            onSetProperty(selected.id, key, value, previousKey)
          }
          onRemoveProperty={(key) => onRemoveProperty(selected.id, key)}
          onAddProperty={() => onAddProperty(selected.id)}
        />
      ) : null}
    </>
  )
}

function ObjectDetails({
  object,
  onUpdate,
  onRemove,
  onSetProperty,
  onRemoveProperty,
  onAddProperty,
}: {
  object: TilemapObject
  onUpdate: (patch: MapObjectPatch) => void
  onRemove: () => void
  onSetProperty: (key: string, value: TilemapObjectPropertyValue, previousKey?: string) => void
  onRemoveProperty: (key: string) => void
  onAddProperty: () => void
}): JSX.Element {
  const properties = Object.entries(object.properties)
  return (
    <Panel title={COPY.tiles.objectDetails}>
      <div className="flex flex-col gap-2">
        <LabeledField label={COPY.tiles.objectName}>
          {(id) => (
            <CommitInput
              id={id}
              value={object.name}
              maxLength={PINTA_LIMITS.maxObjectNameChars}
              onCommit={(name) => onUpdate({ name })}
            />
          )}
        </LabeledField>
        <LabeledField label={COPY.tiles.objectType}>
          {(id) => (
            <CommitInput
              id={id}
              value={object.type}
              maxLength={PINTA_LIMITS.maxObjectNameChars}
              onCommit={(type) => onUpdate({ type })}
            />
          )}
        </LabeledField>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['x', COPY.tiles.objectX],
              ['y', COPY.tiles.objectY],
              ['width', COPY.tiles.objectWidth],
              ['height', COPY.tiles.objectHeight],
            ] as const
          ).map(([field, label]) => (
            <LabeledField key={field} label={label}>
              {(id) => (
                <CommitInput
                  id={id}
                  numeric
                  value={String(object[field])}
                  onCommit={(text) => {
                    const value = Number(text.replace(',', '.'))
                    if (Number.isFinite(value)) onUpdate({ [field]: value })
                  }}
                />
              )}
            </LabeledField>
          ))}
        </div>
        {isPointObject(object) ? (
          <p className="text-xs text-pin-muted">{COPY.tiles.objectPointHint}</p>
        ) : null}

        <p className="mt-1 text-sm font-bold text-pin-text">{COPY.tiles.objectProperties}</p>
        {properties.map(([key, value]) => (
          <PropertyRow
            key={key}
            propertyKey={key}
            value={value}
            onRename={(next) => onSetProperty(next, value, key)}
            onChange={(next) => onSetProperty(key, next, key)}
            onRemove={() => onRemoveProperty(key)}
          />
        ))}
        <Button variant="barOutline" className="w-full" onClick={onAddProperty}>
          <Plus aria-hidden="true" />
          {COPY.tiles.addProperty}
        </Button>
        <Button variant="barOutline" className="w-full" onClick={onRemove}>
          <Trash2 aria-hidden="true" />
          {COPY.tiles.removeObject}
        </Button>
      </div>
    </Panel>
  )
}

function PropertyRow({
  propertyKey,
  value,
  onRename,
  onChange,
  onRemove,
}: {
  propertyKey: string
  value: TilemapObjectPropertyValue
  onRename: (key: string) => void
  onChange: (value: TilemapObjectPropertyValue) => void
  onRemove: () => void
}): JSX.Element {
  const kind = objectPropertyKind(value)
  return (
    <fieldset className="flex flex-col gap-1 rounded-xl border-2 border-pin-border p-2">
      <legend className="sr-only">{propertyKey}</legend>
      <div className="flex items-center gap-1">
        <CommitInput
          aria-label={`${COPY.tiles.propertyKey}: ${propertyKey}`}
          value={propertyKey}
          maxLength={PINTA_LIMITS.maxObjectPropertyKeyChars}
          onCommit={(next) => {
            if (next !== propertyKey) onRename(next)
          }}
        />
        <IconButton
          aria-label={COPY.tiles.removeProperty(propertyKey)}
          title={COPY.tiles.removeProperty(propertyKey)}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="size-5" />
        </IconButton>
      </div>
      <div className="flex items-center gap-1">
        <select
          aria-label={`${COPY.tiles.propertyKind}: ${propertyKey}`}
          className={`${FIELD} w-auto`}
          value={kind}
          onChange={(event) => {
            const next = event.target.value
            if (isObjectPropertyKind(next)) onChange(convertPropertyValue(value, next))
          }}
        >
          {OBJECT_PROPERTY_KINDS.map((option) => (
            <option key={option} value={option}>
              {COPY.tiles.propertyKinds[option]}
            </option>
          ))}
        </select>
        {kind === 'boolean' ? (
          <label className="flex min-h-11 flex-1 items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              aria-label={`${COPY.tiles.propertyValue}: ${propertyKey}`}
              className="size-5"
              checked={value === true}
              onChange={(event) => onChange(event.target.checked)}
            />
            {COPY.tiles.propertyYes}
          </label>
        ) : (
          <CommitInput
            aria-label={`${COPY.tiles.propertyValue}: ${propertyKey}`}
            numeric={kind === 'number'}
            value={String(value)}
            maxLength={kind === 'text' ? PINTA_LIMITS.maxObjectPropertyStringChars : undefined}
            onCommit={(text) => onChange(convertPropertyValue(text, kind))}
          />
        )}
      </div>
    </fieldset>
  )
}

function LabeledField({
  label,
  children,
}: {
  label: string
  children: (id: string) => JSX.Element
}): JSX.Element {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-pin-muted">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

/**
 * Campo que grava ao SAIR (blur) ou no Enter; Esc devolve o valor de antes. O
 * rascunho segue o valor de fora quando ele muda (desfazer, arrastar no mapa).
 *
 * Depois de gravar, o campo mostra o valor GRAVADO: o recusado (chave repetida ou
 * inválida, número ilegível) volta ao de antes, e o aceito chega pelo `value` já
 * na forma guardada. O campo que SAI com rascunho pendente (tocar outro objeto no
 * mapa troca a seleção antes do blur; criar ponto/área; tocar no vazio) grava ao
 * desmontar — sem gravar nada quando o texto é o mesmo.
 */
function CommitInput({
  value,
  onCommit,
  numeric = false,
  ...rest
}: {
  value: string
  onCommit: (value: string) => void
  numeric?: boolean
  id?: string
  maxLength?: number
  'aria-label'?: string
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  // O que a desmontagem precisa ler sem depender do último render: o rascunho, o valor
  // gravado e quem grava (a do último render, que aponta para o objeto deste campo).
  const draftRef = useRef(value)
  const valueRef = useRef(value)
  const onCommitRef = useRef(onCommit)
  useLayoutEffect(() => {
    onCommitRef.current = onCommit
  })
  // Antes da pintura: o valor de fora (gravado agora, desfazer, arrasto) sem um quadro do velho.
  useLayoutEffect(() => {
    valueRef.current = value
    draftRef.current = value
    setDraft(value)
  }, [value])
  useEffect(
    () => () => {
      if (draftRef.current !== valueRef.current) onCommitRef.current(draftRef.current)
    },
    [],
  )
  function edit(next: string): void {
    draftRef.current = next
    setDraft(next)
  }
  function commit(): void {
    const text = draftRef.current
    edit(valueRef.current)
    if (text !== valueRef.current) onCommitRef.current(text)
  }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      edit(valueRef.current)
    }
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={numeric ? 'decimal' : undefined}
      className={FIELD}
      value={draft}
      onChange={(event) => edit(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
