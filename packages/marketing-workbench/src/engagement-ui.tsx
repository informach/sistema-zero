'use client'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useRef, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

export function EngagementField({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
  required?: boolean
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block space-y-1 text-sm font-medium">
      {label}
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          required={required}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </label>
  )
}
// Private message bodies stay only in memory. No operational command enters the offline journal.
export function useEngagementCommand(port: WorkbenchPort, refreshed: () => Promise<void>) {
  const pending = useRef<{
    path: string
    body: Record<string, unknown>
    attempted: boolean
  } | null>(null)
  const running = useRef(false)
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [uncertain, setUncertain] = useState(false)
  const send = async () => {
    if (!pending.current || running.current) return false
    running.current = true
    setBusy(true)
    setIssue('')
    setConfirmed(false)
    try {
      if (!navigator.onLine) {
        if (!pending.current.attempted) pending.current = null
        throw new Error(
          'Conecte-se para executar este comando. Ele não será enviado automaticamente.',
        )
      }
      pending.current.attempted = true
      await port.request(pending.current.path, 'POST', pending.current.body)
      pending.current = null
      setUncertain(false)
      setConfirmed(true)
      try {
        await refreshed()
      } catch (error) {
        setIssue(
          `Comando registrado; não foi possível atualizar a consulta: ${errorMessage(error)}`,
        )
      }
      return true
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        typeof error.status === 'number' &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408 &&
        error.status !== 429
      )
        pending.current = null
      setIssue(errorMessage(error))
      setUncertain(Boolean(pending.current))
      return false
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return {
    busy,
    blocked: busy || uncertain,
    issue,
    run: async (path: string, body: Record<string, unknown>) => {
      if (pending.current) return false
      pending.current = {
        path,
        body: { ...body, operationId: crypto.randomUUID() },
        attempted: false,
      }
      return send()
    },
    notice: (
      <>
        {confirmed ? (
          <p role="status" className="text-sm">
            Comando registrado no servidor. Confira o andamento na fila.
          </p>
        ) : null}
        {issue ? (
          <p role="alert" className="text-sm text-destructive">
            {issue}
          </p>
        ) : null}
        {uncertain ? (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>
              O resultado deste comando ainda não foi confirmado. Confira o estado e consulte
              novamente a mesma tentativa.
            </p>
            <Button variant="outline" disabled={busy} onClick={() => void send()}>
              Consultar a mesma tentativa
            </Button>
          </div>
        ) : null}
      </>
    ),
  }
}
export const engagementLabels: Record<string, string> = {
  'awaiting-link': 'Aguardando comprovação do post',
  active: 'Respostas ativas',
  paused: 'Pausada',
  blocked: 'Bloqueada',
  retired: 'Encerrada',
  automatic: 'Percurso automático',
  'waiting-human': 'Aguardando equipe',
  owned: 'Assumida pela equipe',
  closed: 'Encerrada',
  pending: 'Na fila',
  sending: 'Envio iniciado',
  accepted: 'Aceito pela Meta',
  failed: 'Recusado',
  cancelled: 'Cancelado',
  uncertain: 'Resultado incerto',
  'opening-pending': 'Abertura na fila',
  waiting: 'Aguardando botão',
  'offer-pending': 'Apresentação na fila',
  presented: 'Apresentação aceita',
  human: 'Atendimento',
  stop: 'Encerramento solicitado',
  student: 'Já é aluno',
  child: 'Identificado como criança',
  erased: 'Excluída',
}
export const responseLabels = {
  help: 'H01 · Tenho uma dúvida',
  student: 'A01 · Já somos alunos',
  stop: 'S01 · Parar',
  child: 'C01 · Criança',
  typed: 'R01 · Retomar após triagem',
  platform: 'D01 · Minecraft / Roblox',
  community: 'D02 · Outros cursos e ferramentas',
}
export const topicLabels = {
  access: 'Acesso',
  project: 'Projeto incluído',
  tools: 'Ferramentas',
  price: 'Preço',
  continuity: 'Continuidade',
  other: 'Outra dúvida',
}
export const outcomeLabels = {
  'needs-reply': 'Precisa de resposta',
  helped: 'Dúvida atendida',
  interested: 'Interesse declarado',
  'not-now': 'Não agora',
  closed: 'Encerrada',
}
