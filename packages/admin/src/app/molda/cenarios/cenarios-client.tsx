'use client'

import type { CenariosHostAdapter } from '@sistemazero/molda-cenarios'
import { CenariosApp, criarHostHttp } from '@sistemazero/molda-cenarios'
import { useEffect, useState } from 'react'
import '@sistemazero/molda-cenarios/styles.css'

export function CenariosClient({ runtimeUrl }: { runtimeUrl: string }) {
  const [host, setHost] = useState<CenariosHostAdapter | null>(null),
    [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    import(/* webpackIgnore: true */ runtimeUrl)
      .then((runtime) => {
        if (ativo) setHost(criarHostHttp({ runtime }))
      })
      .catch((e) => {
        if (ativo) setErro(String(e))
      })
    return () => {
      ativo = false
    }
  }, [runtimeUrl])
  return host ? (
    <CenariosApp host={host} />
  ) : (
    <main role={erro ? 'alert' : 'status'}>{erro ?? 'Abrindo o editor de cenários…'}</main>
  )
}
