import { lazy, Suspense, useEffect, useState } from 'react'
import { Button, ConfirmDialog, Modal } from '#ui'
import type { ProOperations } from './useProOperations'

const Diff = lazy(() => import('../../../components/tutor/ProRevisionDiff'))

export function ProOperationReview({ operations }: { operations: ProOperations }) {
  const { pending, history, busy } = operations
  const [path, setPath] = useState('')
  useEffect(() => {
    setPath(pending?.affected[0] ?? '')
  }, [pending])
  const patch = pending?.change.patches.find((item) => item.path === path)
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
        title="Recuperar arquivos e materiais"
        footer={
          <Button size="sm" onClick={() => operations.setHistoryOpen(false)}>
            Fechar histórico
          </Button>
        }
      >
        <p className="mb-3 text-sm">
          A recuperação só aplica quando o projeto ainda corresponde à revisão escolhida. Edições
          posteriores são preservadas; nesse caso, desfaça primeiro as alterações mais recentes.
        </p>
        {!history.length && <p>Nenhuma operação de arquivos neste aparelho.</p>}
        {history.map((record) => (
          <div
            key={record.operationId}
            className="flex items-center gap-3 border-b border-sz-border py-2"
          >
            <span className="min-w-0 flex-1 break-words text-sm">
              {record.label ?? 'Organização dos arquivos'}
              {record.undoOf ? ' — recuperação' : ''}
            </span>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void operations.recover(record.operationId)}
            >
              Recuperar
            </Button>
          </div>
        ))}
        {operations.error && (
          <p role="alert" className="mt-3 text-sz-error">
            {operations.error}
          </p>
        )}
      </Modal>
    </>
  )
}
