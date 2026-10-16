'use client'
import { Workbench } from '@sistemazero/marketing-workbench'
import {
  BrowserWorkspaceAdapter,
  WorkspaceHttpError,
} from '@sistemazero/marketing-workbench/browser'
import { useMemo } from 'react'
import { z } from 'zod'

const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) })
export function WorkbenchClient({ userId }: { userId: string }) {
  const port = useMemo(
    () =>
      new BrowserWorkspaceAdapter(userId, async (path, method = 'GET', body) => {
        let response: Response
        try {
          response = await fetch(`/api/marketing/workspace${path}`, {
            method,
            headers: { 'content-type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: 'same-origin',
            cache: 'no-store',
            signal: AbortSignal.timeout(30000),
          })
        } catch {
          throw new WorkspaceHttpError(
            503,
            'NETWORK_UNAVAILABLE',
            'Servidor indisponível. O rascunho foi preservado neste navegador.',
          )
        }
        const value: unknown = await response.json()
        if (!response.ok) {
          const envelope = errorSchema.safeParse(value)
          if (response.status === 401)
            throw new WorkspaceHttpError(
              401,
              'SESSION_EXPIRED',
              'Sua sessão expirou. Entre novamente para continuar; seus rascunhos foram preservados.',
            )
          throw new WorkspaceHttpError(
            response.status,
            envelope.success ? envelope.data.error.code : 'HTTP_ERROR',
            envelope.success
              ? envelope.data.error.message
              : 'Não foi possível concluir a solicitação',
          )
        }
        return value
      }),
    [userId],
  )
  return <Workbench key={userId} port={port} />
}
