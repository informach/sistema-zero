'use client'

import { Cloud, CloudOff, CloudUpload, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LessonDraftChannel, LessonDraftState } from '../lib/lesson-draft-cloud'
import { useLessonCopy } from './lesson-copy-context'

/**
 * A pílula do rascunho guardado na conta, no cabeçalho do bloco do Estúdio e do Pinta da fase
 * (10/10/2026). Mora no host e não dentro do editor: o editor da fase não tem barra para ela, e
 * aqui ela fica ao lado do título, onde a criança olha antes de sair.
 *
 * Só aparece com a nuvem ligada; antes da primeira subida ("idle") não diz nada. O recado de erro
 * vem do app, na linguagem da criança.
 */
export function useLessonDraftState(channel: LessonDraftChannel | null): LessonDraftState | null {
  const [state, setState] = useState<LessonDraftState | null>(() => channel?.getState() ?? null)
  useEffect(() => {
    if (!channel) {
      setState(null)
      return
    }
    setState(channel.getState())
    return channel.subscribe(setState)
  }, [channel])
  return state
}

export function LessonDraftStatus({ state }: { state: LessonDraftState | null }) {
  const { rascunho } = useLessonCopy()
  if (!state || state.status === 'idle' || state.status === 'unsupported') return null
  const vista =
    state.status === 'saving'
      ? { Icone: CloudUpload, texto: rascunho.guardando, tom: 'neutro' }
      : state.status === 'saved'
        ? { Icone: Cloud, texto: rascunho.guardado, tom: 'ok' }
        : state.status === 'offline'
          ? { Icone: CloudOff, texto: rascunho.offline, tom: 'aviso' }
          : { Icone: TriangleAlert, texto: state.message ?? rascunho.erro, tom: 'aviso' }
  return (
    <span
      className="sz-lesson-draft-status inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      data-state={state.status}
      data-tom={vista.tom}
      // Só o que muda de verdade é anunciado: "guardando ↔ guardado" a cada autosave seria ruído.
      role={vista.tom === 'aviso' ? 'status' : undefined}
    >
      <vista.Icone className="size-4" aria-hidden="true" />
      {vista.texto}
    </span>
  )
}
