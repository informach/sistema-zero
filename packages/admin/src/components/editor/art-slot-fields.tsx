'use client'

import type { ArtSlotImportMode } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import {
  MAX_STUDIO_ART_SLOTS,
  normalizeArtSlotName,
  type StudioArtSlotForm,
  suggestArtSlotName,
} from '@/lib/art-slot-authoring'

/**
 * Os campos da vaga de arte (etapa 6 de `docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`):
 * no bloco de Pinta, "Desenho para o jogo" (qual vaga o desenho preenche e qual imagem do jogo ele
 * substitui); no bloco de Estúdio, "Desenhos da criança" (quais vagas o jogo importa e como).
 * As opções vêm do rascunho desta aula; vaga de outra aula entra pelo nome. Quem confere o curso
 * inteiro (vaga repetida, fora de ordem, imagem que o jogo não tem) é o "Conferir" e a publicação.
 */

const OUTRA = '__outra__'

export function PintaArtSlotFields(props: {
  name: string
  replaces: string
  gameImages: readonly string[]
  onChange: (next: { name: string; replaces: string }) => void
}) {
  const { name, replaces, gameImages, onChange } = props
  const [on, setOn] = useState(Boolean(name || replaces))
  const [typing, setTyping] = useState(Boolean(replaces) && !gameImages.includes(replaces))
  const checkId = useId()
  const pick = (value: string) => {
    if (value === OUTRA) {
      setTyping(true)
      return
    }
    setTyping(false)
    onChange({ name: name || suggestArtSlotName(value), replaces: value })
  }
  return (
    <section aria-label="Desenho para o jogo" className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <input
          id={checkId}
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked)
            if (!e.target.checked) onChange({ name: '', replaces: '' })
          }}
        />
        <label htmlFor={checkId} className="text-sm">
          <span className="font-medium">Este desenho entra num jogo do curso</span>
          <span className="block text-xs text-muted-foreground">
            O desenho que a criança enviar aparece nos materiais do jogo de um bloco de Estúdio (em
            "Desenhos da criança" daquele bloco). Sem molde por baixo: o vídeo ensina a desenhar.
          </span>
        </label>
      </div>
      {on ? (
        <>
          <Field
            label="Imagem do jogo que a criança vai redesenhar"
            hint="Opcional. É a referência da vaga e a imagem que o modo &quot;trocar&quot; substitui."
          >
            <Select value={typing ? OUTRA : replaces} onChange={(e) => pick(e.target.value)}>
              <option value="">Nenhuma</option>
              {gameImages.map((image) => (
                <option key={image} value={image}>
                  {image}
                </option>
              ))}
              <option value={OUTRA}>Outra imagem (digitar o nome)</option>
            </Select>
          </Field>
          {typing ? (
            <Field label="Nome da imagem do jogo" hint="O nome como aparece nos materiais do jogo.">
              <Input
                value={replaces}
                maxLength={48}
                placeholder="ex.: chave-dourada"
                onChange={(e) => onChange({ name, replaces: e.target.value })}
                onBlur={() => onChange({ name, replaces: normalizeArtSlotName(replaces) })}
              />
            </Field>
          ) : null}
          <Field
            label="Nome da vaga"
            hint="Vira o nome da imagem nos materiais do jogo. Só letras minúsculas, números e hífen. Cada vaga tem um desenho só no curso."
          >
            <Input
              value={name}
              maxLength={48}
              placeholder="ex.: minha-chave"
              onChange={(e) => onChange({ name: e.target.value, replaces })}
              onBlur={() => onChange({ name: normalizeArtSlotName(name), replaces })}
            />
          </Field>
        </>
      ) : null}
    </section>
  )
}

const MODE_LABEL: Record<ArtSlotImportMode, string> = {
  add: 'Nos materiais (a criança faz a troca nos blocos)',
  replace: 'Trocando a imagem do jogo sozinho',
}

export function StudioArtSlotsFields(props: {
  value: readonly StudioArtSlotForm[]
  /** As vagas que os blocos de Pinta desta aula preenchem. */
  candidates: readonly { name: string; replaces?: string }[]
  onChange: (next: StudioArtSlotForm[]) => void
}) {
  const { value, candidates, onChange } = props
  const [typed, setTyped] = useState('')
  const known = new Set(candidates.map((c) => c.name))
  const others = value.filter((slot) => !known.has(slot.name))
  const find = (name: string) => value.find((slot) => slot.name === name)
  const toggle = (name: string, on: boolean) =>
    onChange(on ? [...value, { name, mode: 'add' }] : value.filter((slot) => slot.name !== name))
  const setMode = (name: string, mode: ArtSlotImportMode) =>
    onChange(value.map((slot) => (slot.name === name ? { ...slot, mode } : slot)))
  const add = () => {
    const name = normalizeArtSlotName(typed)
    if (!name || find(name)) return
    onChange([...value, { name, mode: 'add' }])
    setTyped('')
  }
  const full = value.length >= MAX_STUDIO_ART_SLOTS
  const row = (name: string, detail: string | null) => {
    const slot = find(name)
    return (
      <li key={name} className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={Boolean(slot)}
            disabled={!slot && full}
            onChange={(e) => toggle(name, e.target.checked)}
          />
          <span className="font-mono">{name}</span>
          {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
        </label>
        {slot ? (
          <Select
            aria-label={`Como o desenho ${name} entra no jogo`}
            value={slot.mode}
            onChange={(e) => setMode(name, e.target.value as ArtSlotImportMode)}
            className="w-auto"
          >
            <option value="add">{MODE_LABEL.add}</option>
            <option value="replace">{MODE_LABEL.replace}</option>
          </Select>
        ) : null}
      </li>
    )
  }
  return (
    <section aria-label="Desenhos da criança" className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Desenhos da criança</p>
        <p className="text-xs text-muted-foreground">
          O desenho que a criança enviou num bloco de Pinta (a vaga) entra neste jogo a cada vez que
          ela abre a aula. Redesenhou e enviou de novo? A versão nova chega sozinha.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {candidates.map((c) => row(c.name, c.replaces ? `substitui ${c.replaces}` : null))}
        {others.map((slot) => row(slot.name, 'de outra aula'))}
      </ul>
      {candidates.length === 0 && others.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum bloco de Pinta desta aula preenche uma vaga. Vaga de outra aula entra pelo nome.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Vaga de outra aula (nome)">
          <Input
            value={typed}
            maxLength={48}
            placeholder="ex.: minha-chave"
            disabled={full}
            onChange={(e) => setTyped(e.target.value)}
          />
        </Field>
        <Button type="button" variant="outline" onClick={add} disabled={full || !typed.trim()}>
          Acrescentar vaga
        </Button>
      </div>
    </section>
  )
}
