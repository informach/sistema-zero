'use client'

import { Cloud, CloudOff, CloudUpload, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type {
  LessonDraftChannel,
  LessonDraftCloud,
  LessonDraftEditor,
  LessonDraftState,
} from '../lib/lesson-draft-cloud'
import { useLessonCopy } from './lesson-copy-context'

const subscribeNothing = () => () => {}
const notSaving = () => false

/**
 * Registra o editor no coordenador da fase (salvar o que está na tela e dizer se bate com o
 * envio) e devolve `true` enquanto um avanço ou a conclusão está salvando: a edição fica parada.
 */
export function useLessonDraftEditor(
  cloud: LessonDraftCloud | null | undefined,
  lessonId: string,
  tool: 'studio' | 'pinta',
  blockId: string,
  editor: LessonDraftEditor,
): boolean {
  const editorRef = useRef(editor)
  editorRef.current = editor
  useEffect(
    () =>
      cloud?.registerEditor(lessonId, tool, blockId, {
        save: () => editorRef.current.save(),
        matchesSubmission: (context) => editorRef.current.matchesSubmission(context),
      }),
    [cloud, lessonId, tool, blockId],
  )
  return useSyncExternalStore(
    cloud?.subscribeSaving ?? subscribeNothing,
    () => cloud?.isSaving(lessonId) ?? false,
    notSaving,
  )
}

/**
 * A pílula do rascunho guardado na conta, no cabeçalho do bloco do Estúdio e do Pinta da fase
 * (10/10/2026). Mora no host e não dentro do editor: o editor da fase não tem barra para ela, e
 * aqui ela fica ao lado do título, onde a criança olha antes de sair.
 *
 * Só aparece com a nuvem ligada; antes da primeira subida ("idle") não diz nada. O recado de erro
 * vem do app, na linguagem da criança. O estado é o DESTE bloco: o erro de outro bloco da mesma
 * ferramenta não pinta esta pílula.
 */
export function useLessonDraftState(
  channel: LessonDraftChannel | null,
  blockId: string,
): LessonDraftState | null {
  const [state, setState] = useState<LessonDraftState | null>(
    () => channel?.getState(blockId) ?? null,
  )
  useEffect(() => {
    if (!channel) {
      setState(null)
      return
    }
    const ler = () => {
      const next = channel.getState(blockId)
      // A fila avisa a cada passo de qualquer bloco: só vira render quando ESTE mudou.
      setState((prev) =>
        prev &&
        prev.status === next.status &&
        prev.message === next.message &&
        Boolean(prev.outdated) === Boolean(next.outdated)
          ? prev
          : next,
      )
    }
    ler()
    return channel.subscribe(ler)
  }, [channel, blockId])
  return state
}

/**
 * `onReload`: a versão da conta é de um editor mais novo que esta página. O bloco guarda o que está
 * na tela e recarrega; a página nova junta as duas versões (abre a mais nova, a outra fica guardada).
 */
export function LessonDraftStatus({
  state,
  onReload,
}: {
  state: LessonDraftState | null
  onReload?: () => Promise<void> | void
}) {
  const { rascunho } = useLessonCopy()
  const [recarregando, setRecarregando] = useState(false)
  if (!state || state.status === 'idle' || state.status === 'unsupported') return null
  const vista = state.outdated
    ? { Icone: TriangleAlert, texto: rascunho.paginaDesatualizada, tom: 'aviso' }
    : state.status === 'saving'
      ? { Icone: CloudUpload, texto: rascunho.guardando, tom: 'neutro' }
      : state.status === 'saved'
        ? { Icone: Cloud, texto: rascunho.guardado, tom: 'ok' }
        : state.status === 'offline'
          ? { Icone: CloudOff, texto: rascunho.offline, tom: 'aviso' }
          : { Icone: TriangleAlert, texto: state.message ?? rascunho.erro, tom: 'aviso' }
  return (
    <span
      className="sz-lesson-draft-status inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      data-state={state.outdated ? 'outdated' : state.status}
      data-tom={vista.tom}
      // Só o que muda de verdade é anunciado: "guardando ↔ guardado" a cada autosave seria ruído.
      role={vista.tom === 'aviso' ? 'status' : undefined}
    >
      <vista.Icone className="size-4" aria-hidden="true" />
      {vista.texto}
      {state.outdated && onReload ? (
        <button
          type="button"
          className="sz-lesson-draft-reload inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          disabled={recarregando}
          onClick={async () => {
            setRecarregando(true)
            try {
              await onReload()
            } finally {
              setRecarregando(false)
            }
          }}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {rascunho.atualizarPagina}
        </button>
      ) : null}
    </span>
  )
}
