'use client'

import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Spinner } from '@sistemazero/ui/spinner'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/admin/use-confirm'
import { apiGet } from '@/lib/api'
import {
  type ComparacaoComOPublicado,
  compararComOPublicado,
  type PecaComparada,
} from '@/lib/lesson-published-diff'
import type { LessonBlockContent } from '@/lib/types'

type Document = LessonDraftDocument<LessonBlockContent>

/**
 * "Comparar com a versão publicada."
 *
 * O rascunho e a aula no ar são documentos separados: apagar um bloco aqui não toca o que os
 * alunos veem. Este painel mostra a diferença e deixa trazer de volta uma peça, várias ou tudo.
 *
 * ⚠️ O que ele mostra é o que está publicado AGORA. Publicar o rascunho arquiva o que não
 * estiver nele — daí o aviso no rodapé.
 */
export function LessonPublishedCompare({
  lessonId,
  draft,
  canWrite,
  onClose,
  onRestore,
}: {
  lessonId: string
  draft: Document
  canWrite: boolean
  onClose: () => void
  /** `ids` ausente = trazer tudo (o rascunho vira o publicado). */
  onRestore: (ids?: string[]) => Promise<void>
}) {
  const [publicado, setPublicado] = useState<Document | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const { confirm, confirmDialog } = useConfirm()

  useEffect(() => {
    let vivo = true
    apiGet<{ document: Document }>(`/api/members/lessons/${lessonId}/draft/published`)
      .then((resposta) => {
        if (vivo) setPublicado(resposta.document)
      })
      .catch((error: Error) => {
        if (vivo) setErro(error.message)
      })
    return () => {
      vivo = false
    }
  }, [lessonId])

  const comparacao: ComparacaoComOPublicado | null = publicado
    ? compararComOPublicado(draft, publicado)
    : null

  const alternar = (id: string) =>
    setEscolhidos((atual) => {
      const proximo = new Set(atual)
      if (!proximo.delete(id)) proximo.add(id)
      return proximo
    })

  async function restaurar(ids?: string[]) {
    setEnviando(true)
    try {
      await onRestore(ids)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível restaurar.')
    } finally {
      setEnviando(false)
    }
  }

  const trazerTudo = () => {
    const perdidos = comparacao?.soNoRascunho.length ?? 0
    if (perdidos === 0) {
      void restaurar()
      return
    }
    confirm({
      title: 'Trazer tudo da versão publicada?',
      message: `O rascunho inteiro vira a aula que está no ar. ${perdidos} ${
        perdidos === 1 ? 'peça criada' : 'peças criadas'
      } depois da última publicação ${perdidos === 1 ? 'será descartada' : 'serão descartadas'}.`,
      confirmText: 'Trazer tudo',
      confirmVariant: 'destructive',
      onConfirm: () => restaurar(),
    })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Comparar com a versão publicada"
      description="O que está no ar continua inteiro — mesmo o que você apagou aqui no rascunho."
      className="max-w-3xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Isto mostra o que está publicado <strong>agora</strong>. Publicar o rascunho arquiva o
            que não estiver nele.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onClose} disabled={enviando}>
              Fechar
            </Button>
            {canWrite && comparacao && !comparacao.semPublicado ? (
              <>
                <Button
                  variant="outline"
                  disabled={enviando || escolhidos.size === 0}
                  onClick={() => void restaurar([...escolhidos])}
                >
                  {enviando ? <Spinner /> : null}
                  {escolhidos.size === 1
                    ? 'Trazer o selecionado'
                    : `Trazer os ${escolhidos.size} selecionados`}
                </Button>
                <Button disabled={enviando} onClick={trazerTudo}>
                  {enviando ? <Spinner /> : null}Trazer tudo
                </Button>
              </>
            ) : null}
          </div>
        </div>
      }
    >
      {confirmDialog}
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      {!comparacao && !erro ? (
        <p className="text-sm text-muted-foreground">Carregando a versão publicada…</p>
      ) : null}
      {comparacao?.semPublicado ? (
        <p className="text-sm text-muted-foreground">
          Esta aula ainda não foi publicada — não há versão no ar para trazer de volta.
        </p>
      ) : null}
      {comparacao && !comparacao.semPublicado ? (
        <div className="space-y-6">
          <Grupo
            titulo="Sumiram do rascunho"
            vazio="Nada sumiu: o rascunho tem tudo o que está no ar."
            pecas={comparacao.sumiram}
            escolhidos={escolhidos}
            onAlternar={canWrite ? alternar : undefined}
          />
          <Grupo
            titulo="Mudaram desde a publicação"
            vazio="Nenhuma peça publicada foi editada no rascunho."
            aviso="Marcar uma delas devolve o conteúdo que está no ar, sem tirá-la do lugar."
            pecas={comparacao.mudaram}
            escolhidos={escolhidos}
            onAlternar={canWrite ? alternar : undefined}
          />
          <Grupo
            titulo="Só no seu rascunho"
            vazio="Você não criou nada novo desde a última publicação."
            aviso="Trazer de volta uma peça não mexe nestas. Só o “Trazer tudo” as descarta."
            pecas={comparacao.soNoRascunho}
            escolhidos={escolhidos}
          />
        </div>
      ) : null}
    </Dialog>
  )
}

function Grupo({
  titulo,
  vazio,
  aviso,
  pecas,
  escolhidos,
  onAlternar,
}: {
  titulo: string
  vazio: string
  aviso?: string
  pecas: PecaComparada[]
  escolhidos: Set<string>
  onAlternar?: (id: string) => void
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">
        {titulo} <span className="text-muted-foreground">({pecas.length})</span>
      </h3>
      {aviso ? <p className="mt-1 text-xs text-muted-foreground">{aviso}</p> : null}
      {pecas.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {pecas.map((peca) => (
            <li
              key={peca.id}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
            >
              {onAlternar ? (
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={escolhidos.has(peca.id)}
                  onChange={() => onAlternar(peca.id)}
                  aria-label={`Trazer de volta: ${peca.titulo}`}
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm">{peca.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {peca.tipo === 'material' ? 'Material da aula' : (peca.origem ?? 'Sem seção')}
                  {peca.origemSumiu
                    ? ' · a seção não existe mais: volta para os materiais de apoio'
                    : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
