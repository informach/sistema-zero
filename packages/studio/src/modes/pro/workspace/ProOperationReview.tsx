import { lazy, Suspense, useEffect, useState } from 'react'
import { Button, ConfirmDialog, Modal } from '#ui'
import type { ProjectTree } from '../../../core/proProject'
import { useProjectStoreApi } from '../../../state/projectStore'
import type { ProHistoryVersion } from '../../../state/proProjectHistory'
import { changedTreePaths, sameTree } from './treeChanges'
import { useProEngineUpdateOffer } from './useProEngineUpdate'
import type { ProHistory } from './useProHistory'
import type { ProOperations } from './useProOperations'

const Diff = lazy(() => import('../../../components/tutor/ProRevisionDiff'))

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** "Hoje, 14:32" ou "20/11, 09:05". */
function when(timestamp: number): string {
  const date = new Date(timestamp)
  const today = date.toDateString() === new Date().toDateString()
  return `${today ? 'Hoje' : DAY.format(date)}, ${TIME.format(date)}`
}

/** "21/11 às 14:32": o que fica gravado no registro, que não pode dizer "hoje" para sempre. */
function absolute(timestamp: number): string {
  const date = new Date(timestamp)
  return `${DAY.format(date)} às ${TIME.format(date)}`
}

/** O que aconteceu no momento em que a versão foi guardada. */
function versionTitle(version: ProHistoryVersion): string {
  if (version.trigger === 'run') return 'Você rodou o jogo'
  if (version.trigger === 'zappy') return 'Antes de o Zappy mudar o código'
  if (version.trigger === 'restore')
    return version.restoredFrom !== undefined
      ? `Antes de voltar para a versão de ${when(version.restoredFrom)}`
      : 'Antes de voltar a uma versão'
  if (version.trigger === 'undo')
    return version.label ? `Antes de desfazer: ${version.label}` : 'Antes de desfazer uma mudança'
  return version.label ? `Antes de: ${version.label}` : 'Antes de uma mudança nos arquivos'
}

function changedText(version: ProHistoryVersion): string {
  if (version.first) return 'primeira versão guardada'
  return version.changedFiles === 1 ? '1 arquivo mudou' : `${version.changedFiles} arquivos mudaram`
}

const textOf = (tree: ProjectTree, path: string) => {
  const node = tree[path]
  return node?.kind === 'file' ? node.content : ''
}

interface Comparison {
  version: ProHistoryVersion
  then: ProjectTree
  now: ProjectTree
  paths: string[]
  path: string
}

export function ProOperationReview({
  operations,
  history,
}: {
  operations: ProOperations
  history?: ProHistory
}) {
  const { pending, busy } = operations
  const store = useProjectStoreApi()
  const [path, setPath] = useState('')
  const [comparing, setComparing] = useState<Comparison | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyNotice, setHistoryNotice] = useState<string | null>(null)
  // "Atualizar o motor": a oferta some no "Agora não" até a criança abrir outro projeto.
  const engineOffer = useProEngineUpdateOffer()
  const [engineDeclined, setEngineDeclined] = useState<string | null>(null)
  // Sem versões (a aula, o Admin, sem armazenamento local) a janela mostra só as operações com
  // arquivos e não promete versões (full review final de 21/11/2026).
  const versioned = history?.enabled === true
  useEffect(() => {
    setPath(pending?.affected[0] ?? '')
  }, [pending])
  // biome-ignore lint/correctness/useExhaustiveDependencies: abrir a janela é o GATILHO de reler as versões.
  useEffect(() => {
    setHistoryNotice(null)
    if (!operations.historyOpen) {
      setComparing(null)
      setHistoryError(null)
      return
    }
    history?.refresh()
  }, [operations.historyOpen])
  const patch = pending?.change.patches.find((item) => item.path === path)

  const compare = async (version: ProHistoryVersion) => {
    if (!history) return
    setHistoryError(null)
    try {
      const then = await history.treeOf(version.id)
      const now = store.getState().project?.tree ?? {}
      const paths = changedTreePaths(then, now)
      setComparing({ version, then, now, paths, path: paths[0] ?? '' })
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : 'Não consegui abrir esta versão.')
    }
  }
  const restore = async (version: ProHistoryVersion) => {
    if (!history) return
    setHistoryError(null)
    setHistoryNotice(null)
    try {
      const then = await history.treeOf(version.id)
      // A versão igual a agora é avisada DENTRO da janela: o recado das operações fica atrás dela
      // (full review final).
      if (sameTree(then, store.getState().project?.tree ?? {})) {
        setHistoryNotice('Esta versão é igual ao projeto de agora.')
        return
      }
      await operations.restoreVersion(
        then,
        `Voltar para a versão de ${absolute(version.createdAt)}`,
        version.createdAt,
      )
      setComparing(null)
      history.refresh()
    } catch (cause) {
      setHistoryError(
        cause instanceof Error ? cause.message : 'Não consegui voltar para esta versão.',
      )
    }
  }

  // As versões e as operações com arquivos numa lista só, da mais nova para a mais antiga.
  const rows = [
    ...(history?.versions ?? []).map((version) => ({
      kind: 'version' as const,
      at: version.createdAt,
      version,
    })),
    ...operations.history.map((record) => ({
      kind: 'operation' as const,
      at: record.createdAt,
      record,
    })),
  ].sort((a, b) => b.at - a.at)

  return (
    <>
      {(operations.error || operations.notice || busy) && (
        <div role="status" className="shrink-0 border-b border-sz-border p-2 text-sm">
          {operations.error ?? (busy ? 'Conferindo os arquivos…' : operations.notice)}
          {operations.pendingSave && (
            <Button size="sm" onClick={() => void operations.retry()} disabled={busy}>
              Tentar guardar de novo
            </Button>
          )}
          {!busy && (
            <Button size="sm" variant="ghost" onClick={operations.dismiss}>
              Fechar aviso
            </Button>
          )}
        </div>
      )}
      {engineOffer && engineOffer !== engineDeclined && !busy && (
        <div role="status" className="shrink-0 border-b border-sz-border p-2 text-sm">
          <p className="font-semibold">Tem um motor novo para este jogo. Atualizar?</p>
          <p>
            O seu código, os seus arquivos e as suas imagens continuam iguais. Só a peça pronta que
            faz o jogo funcionar é trocada.
          </p>
          <Button size="sm" onClick={() => void operations.updateEngine()}>
            Atualizar o motor
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEngineDeclined(engineOffer)}>
            Agora não
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Conferir mudança nos arquivos"
        confirmLabel="Aplicar mudança"
        cancelLabel="Voltar ao código"
        busy={busy}
        onConfirm={operations.apply}
        onCancel={operations.cancel}
      >
        {pending && (
          <div className="space-y-3">
            <p>{pending.change.summary}</p>
            {pending.change.directories && (
              <details className="text-sm">
                <summary>Pastas desta mudança</summary>
                {pending.change.directories.before
                  .filter((folder) => !pending.change.directories!.after.includes(folder))
                  .map((folder) => (
                    <p key={`remove:${folder}`}>Remover: {folder}</p>
                  ))}
                {pending.change.directories.after
                  .filter((folder) => !pending.change.directories!.before.includes(folder))
                  .map((folder) => (
                    <p key={`add:${folder}`}>Criar: {folder}</p>
                  ))}
              </details>
            )}
            <p>
              {pending.affected.length} arquivos afetados. O histórico recupera esta operação
              inteira; o desfazer de digitação dos arquivos alterados começa novamente após aplicar.
            </p>
            {pending.warnings.map((warning) => (
              <p key={warning} className="text-sm text-sz-fg-soft">
                {warning}
              </p>
            ))}
            <label className="block">
              Arquivo para conferir
              <select
                className="mt-1 block w-full rounded border border-sz-border bg-sz-bg p-2"
                value={path}
                onChange={(event) => setPath(event.target.value)}
              >
                {pending.affected.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
            </label>
            {patch && (
              <Suspense fallback={<p>Carregando diferenças…</p>}>
                <Diff path={path} before={pending.before[path] ?? ''} after={patch.content ?? ''} />
              </Suspense>
            )}
            {operations.error && (
              <p role="alert" className="text-sz-error">
                {operations.error}
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
      <Modal
        open={operations.historyOpen}
        onClose={() => operations.setHistoryOpen(false)}
        title="Histórico do projeto"
        footer={
          <Button size="sm" onClick={() => operations.setHistoryOpen(false)}>
            Fechar histórico
          </Button>
        }
      >
        <p className="mb-3 text-sm">
          {versioned
            ? 'As versões ficam guardadas neste computador. Voltar para uma versão guarda antes a de agora, então nada se perde.'
            : 'Aqui ficam as operações com arquivos (trocar nome, mover, apagar, materiais), para recuperar o que mudou.'}
        </p>
        {comparing ? (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{when(comparing.version.createdAt)}</b> · {versionTitle(comparing.version)}
            </p>
            {comparing.paths.length === 0 ? (
              <p>Esta versão é igual ao projeto de agora.</p>
            ) : (
              <>
                <p className="text-sm text-sz-fg-soft">
                  À esquerda, esta versão; à direita, o projeto agora.
                </p>
                <label className="block">
                  Arquivo para comparar
                  <select
                    className="mt-1 block w-full rounded border border-sz-border bg-sz-bg p-2"
                    value={comparing.path}
                    onChange={(event) => setComparing({ ...comparing, path: event.target.value })}
                  >
                    {comparing.paths.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </label>
                <Suspense fallback={<p>Carregando diferenças…</p>}>
                  <Diff
                    path={comparing.path}
                    before={textOf(comparing.then, comparing.path)}
                    after={textOf(comparing.now, comparing.path)}
                  />
                </Suspense>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setComparing(null)}>
                Voltar à lista
              </Button>
              <Button
                size="sm"
                disabled={busy || comparing.paths.length === 0}
                onClick={() => void restore(comparing.version)}
              >
                Voltar para esta versão
              </Button>
            </div>
          </div>
        ) : (
          <>
            {!rows.length && <p>Ainda não há versões guardadas neste computador.</p>}
            {rows.map((row) =>
              row.kind === 'version' ? (
                <div
                  key={`version:${row.version.id}`}
                  className="flex flex-wrap items-center gap-2 border-b border-sz-border py-2"
                >
                  <span className="min-w-0 flex-1 break-words text-sm">
                    <b>{when(row.version.createdAt)}</b> · {versionTitle(row.version)} ·{' '}
                    {changedText(row.version)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void compare(row.version)}
                  >
                    Ver mudanças
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void restore(row.version)}>
                    Voltar para esta versão
                  </Button>
                </div>
              ) : (
                <div
                  key={`operation:${row.record.operationId}`}
                  className="flex flex-wrap items-center gap-2 border-b border-sz-border py-2"
                >
                  <span className="min-w-0 flex-1 break-words text-sm">
                    <b>{when(row.record.createdAt)}</b> ·{' '}
                    {row.record.label ?? 'Organização dos arquivos'}
                    {row.record.undoOf ? ' (recuperação)' : ''}
                  </span>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void operations.recover(row.record.operationId)}
                  >
                    Recuperar
                  </Button>
                </div>
              ),
            )}
          </>
        )}
        {(historyError || operations.error) && (
          <p role="alert" className="mt-3 text-sz-error">
            {historyError ?? operations.error}
          </p>
        )}
        {historyNotice && !historyError && !operations.error && (
          <p role="status" className="mt-3 text-sm">
            {historyNotice}
          </p>
        )}
      </Modal>
    </>
  )
}
