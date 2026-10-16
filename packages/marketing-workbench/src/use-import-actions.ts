'use client'
import { useEffect, useRef, useState } from 'react'
import { applyImportSequence } from './import-sequence'
import { errorMessage } from './port'

export function useImportActions() {
  const locked = useRef(false),
    stopped = useRef(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  useEffect(
    () => () => {
      stopped.current = true
    },
    [],
  )
  async function run(work: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    stopped.current = false
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      locked.current = false
      setBusy(false)
      setBatchRunning(false)
    }
  }
  async function batch<T>(
    entries: readonly T[],
    apply: (entry: T) => Promise<{ status: string; message: string }>,
    refresh: () => Promise<void>,
  ) {
    return run(async () => {
      setBatchRunning(true)
      let failure: unknown
      setNotice(`0 de ${entries.length} operações confirmadas`)
      try {
        const result = await applyImportSequence(
          entries,
          apply,
          () => stopped.current,
          (done) => setNotice(`${done} de ${entries.length} operações confirmadas`),
        )
        setNotice(
          `${result.completed} de ${entries.length} operações confirmadas.${result.stopped ? ' Lote interrompido após a operação em andamento.' : ''}`,
        )
      } catch (error) {
        failure = error
      }
      // Refresh partial success too. A failed refresh must not hide the original operation failure.
      try {
        await refresh()
      } catch (error) {
        failure ??= error
      }
      if (failure) throw failure
    })
  }
  return {
    busy,
    error,
    notice,
    setNotice,
    run,
    batch,
    batchRunning,
    stop: () => {
      stopped.current = true
      setNotice('Interrompendo após a operação em andamento…')
    },
  }
}
