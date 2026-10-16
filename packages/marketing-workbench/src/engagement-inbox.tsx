'use client'
import {
  channelViewSchema,
  conversationDetailSchema,
  conversationOutcomeSchema,
  conversationPageSchema,
  conversationResponses,
  conversationTopicSchema,
  engagementHealthSchema,
  type TeamMember,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import { EngagementSettings } from './engagement-settings'
import {
  EngagementField,
  engagementLabels,
  outcomeLabels,
  responseLabels,
  topicLabels,
  useEngagementCommand,
} from './engagement-ui'
import { errorMessage, type WorkbenchPort } from './port'

export function EngagementInbox({
  port,
  team,
  onClose,
}: {
  port: WorkbenchPort
  team: TeamMember[]
  onClose: () => void
}) {
  const id = useId(),
    [channels, setChannels] = useState<z.infer<typeof channelViewSchema>[]>([]),
    [accountId, setAccountId] = useState(''),
    [issue, setIssue] = useState('')
  const refresh = useCallback(async () => {
    setChannels(z.array(channelViewSchema).parse(await port.request('/engagement/accounts')))
  }, [port])
  useEffect(() => {
    let live = true,
      running = false
    const update = async () => {
      if (running) return
      running = true
      try {
        const next = z.array(channelViewSchema).parse(await port.request('/engagement/accounts'))
        if (live) {
          setChannels(next)
          setIssue('')
        }
      } catch (e) {
        if (live) {
          setChannels([])
          setIssue(errorMessage(e))
        }
      } finally {
        running = false
      }
    }
    void update()
    const timer = setInterval(() => void update(), 10000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port])
  const channel = channels.find((c) => c.id === accountId)
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5"
      aria-label="Atendimento no Instagram"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Atendimento no Instagram</h2>
        <Button variant="ghost" onClick={onClose}>
          Fechar atendimento
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Mensagens observadas pelo aplicativo. A fila continua no servidor quando o computador está
        fechado. Para responder fora do aplicativo, assuma a conversa aqui primeiro.
      </p>
      <label htmlFor={id} className="block text-sm">
        Conta
        <Select id={id} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Selecione a conta</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      {!channels.length && !issue ? (
        <p className="text-sm">
          Nenhuma conta disponível para seu acesso. A administração conecta a conta em Conexões e
          configura a equipe do canal.
        </p>
      ) : null}
      {issue ? (
        <p role="alert" className="text-destructive">
          {issue}
        </p>
      ) : null}
      {channel ? (
        <>
          <p className="text-sm">
            {channel.available ? 'Capacidade de envio vigente' : channel.reason}
          </p>
          <EngagementSettings
            key={`${channel.id}:${channel.version}`}
            port={port}
            channel={channel}
            team={team}
            onChanged={refresh}
          />
          {channel.version > 0 && channel.permissions.some((p) => p === 'read' || p === 'admin') ? (
            <InboxAccount
              key={`${port.identity}:${channel.id}`}
              port={port}
              channel={channel}
              team={team}
            />
          ) : null}
        </>
      ) : null}
    </section>
  )
}
function InboxAccount({
  port,
  channel,
  team,
}: {
  port: WorkbenchPort
  channel: z.infer<typeof channelViewSchema>
  team: TeamMember[]
}) {
  const [page, setPage] = useState<z.infer<typeof conversationPageSchema>>({
      items: [],
      nextCursor: null,
    }),
    [selection, setSelection] = useState(''),
    [issue, setIssue] = useState('')
  const [health, setHealth] = useState<z.infer<typeof engagementHealthSchema> | null>(null)
  const older = useRef(false)
  const refresh = useCallback(async () => {
    older.current = false
    setPage(
      conversationPageSchema.parse(
        await port.request(`/engagement/accounts/${channel.id}/conversations`),
      ),
    )
    setIssue('')
  }, [port, channel.id])
  useEffect(() => {
    let live = true,
      running = false
    const update = async () => {
      if (!live || running) return
      running = true
      try {
        const [value, status] = await Promise.all([
          port.request(`/engagement/accounts/${channel.id}/conversations`),
          port.request(`/engagement/accounts/${channel.id}/health`),
        ])
        const next = conversationPageSchema.parse(value),
          nextHealth = engagementHealthSchema.parse(status)
        if (live) {
          setPage((previous) =>
            older.current
              ? {
                  items: [
                    ...new Map([...next.items, ...previous.items].map((c) => [c.id, c])).values(),
                  ].map((c) => next.items.find((fresh) => fresh.id === c.id) ?? c),
                  nextCursor: previous.nextCursor,
                }
              : next,
          )
          setHealth(nextHealth)
          setIssue('')
        }
      } catch (e) {
        if (live) {
          setPage({ items: [], nextCursor: null })
          setHealth(null)
          older.current = false
          setIssue(errorMessage(e))
        }
      } finally {
        running = false
      }
    }
    void update()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void update()
    }, 7000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, channel.id])
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <h3 className="font-medium">Conversas observadas</h3>
        {health ? (
          <section className="rounded-lg bg-muted p-3 text-xs" aria-label="Situação da fila">
            <p>
              {health.waitingHuman} aguardando ou em atendimento · {health.pendingInbound} entradas
              pendentes
            </p>
            <p>
              {health.pendingOutbound} respostas pendentes · {health.sending} em envio ·{' '}
              {health.uncertain} incertas
            </p>
            <p>{health.failed24h} falhas em respostas criadas nas últimas 24 horas</p>
            {health.oldestPendingAt ? (
              <p>Entrada mais antiga: {new Date(health.oldestPendingAt).toLocaleString('pt-BR')}</p>
            ) : null}
          </section>
        ) : null}
        {page.items.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`block w-full rounded-lg border p-3 text-left text-sm ${selection === c.id ? 'bg-muted' : ''}`}
            aria-pressed={selection === c.id}
            onClick={() => setSelection(c.id)}
          >
            <strong>{c.recipient}</strong>
            <span className="block">
              {engagementLabels[c.state]}
              {c.suppression ? ` · ${engagementLabels[c.suppression]}` : ''}
            </span>
            <span className="block text-xs">{new Date(c.updatedAt).toLocaleString('pt-BR')}</span>
          </button>
        ))}
        {page.nextCursor ? (
          <Button
            variant="outline"
            onClick={() => {
              void port
                .request(
                  `/engagement/accounts/${channel.id}/conversations?before=${page.nextCursor}`,
                )
                .then((value) => {
                  const next = conversationPageSchema.parse(value)
                  older.current = true
                  setPage((old) => ({
                    items: [
                      ...new Map([...old.items, ...next.items].map((c) => [c.id, c])).values(),
                    ],
                    nextCursor: next.nextCursor,
                  }))
                })
                .catch((e) => setIssue(errorMessage(e)))
            }}
          >
            Conversas anteriores
          </Button>
        ) : null}
        {!page.items.length ? <p className="text-sm">Nenhuma conversa nesta página.</p> : null}
        {issue ? (
          <p role="alert" className="text-destructive">
            {issue}
          </p>
        ) : null}
      </div>
      {selection ? (
        <ConversationDetail
          key={selection}
          port={port}
          channel={channel}
          conversationId={selection}
          team={team}
          onChanged={refresh}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Selecione uma conversa para consultar o histórico.
        </p>
      )}
    </div>
  )
}
function ConversationDetail({
  port,
  channel,
  conversationId,
  team,
  onChanged,
}: {
  port: WorkbenchPort
  channel: z.infer<typeof channelViewSchema>
  conversationId: string
  team: TeamMember[]
  onChanged: () => Promise<void>
}) {
  const base = `/engagement/accounts/${channel.id}/conversations/${conversationId}`,
    id = useId()
  const [detail, setDetail] = useState<z.infer<typeof conversationDetailSchema> | null>(null),
    [issue, setIssue] = useState(''),
    [reply, setReply] = useState(''),
    [requestId, setRequestId] = useState('')
  const [saved, setSaved] = useState('help'),
    [evidence, setEvidence] = useState(''),
    [externalId, setExternalId] = useState(''),
    [erase, setErase] = useState(false)
  const [topic, setTopic] = useState('other'),
    [outcome, setOutcome] = useState('needs-reply')
  const refresh = useCallback(async () => {
    setDetail(conversationDetailSchema.parse(await port.request(base)))
    setIssue('')
  }, [port, base])
  const command = useEngagementCommand(port, async () => {
    setReply('')
    await refresh()
    await onChanged()
  })
  useEffect(() => {
    let live = true,
      running = false
    const update = async () => {
      if (!live || running) return
      running = true
      try {
        const next = conversationDetailSchema.parse(await port.request(base))
        if (live) {
          setDetail(next)
          setIssue('')
        }
      } catch (e) {
        if (live) {
          setDetail(null)
          setIssue(errorMessage(e))
        }
      } finally {
        running = false
      }
    }
    void update()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void update()
    }, 5000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [port, base])
  const c = detail?.conversation,
    canReply = channel.permissions.some((p) => p === 'reply' || p === 'admin')
  const windowOpen = Boolean(
    c?.lastInboundAt &&
      Date.now() - new Date(c.lastInboundAt).getTime() <
        (channel.proof?.messageWindowHours ?? 0) * 3600000,
  )
  const action = (body: Record<string, unknown>) =>
    command.run(`${base}/actions`, { expectedVersion: c?.version, ...body })
  return (
    <div className="space-y-4 rounded-lg border p-4">
      {issue ? (
        <p role="alert" className="text-destructive">
          {issue}
        </p>
      ) : null}
      {c && detail ? (
        <>
          <h3 className="font-semibold">
            {c.recipient} · {engagementLabels[c.state]}
          </h3>
          <p className="text-sm">
            Responsável:{' '}
            {c.ownerId
              ? (team.find((p) => p.id === c.ownerId)?.name ?? 'Pessoa da equipe do canal')
              : 'Aguardando atribuição'}
            .{' '}
            {windowOpen
              ? 'Interação dentro da janela configurada'
              : 'Janela de resposta indisponível'}
            .
          </p>
          <p className="text-sm">
            {detail.journey
              ? `Origem: ${detail.journey.campaign} / ${detail.journey.contentKey} · ${engagementLabels[detail.journey.state]}`
              : 'Origem comercial desconhecida'}
          </p>
          {c.suppression ? (
            <p className="text-sm">Supressão: {engagementLabels[c.suppression]}</p>
          ) : null}
          <ol
            className="max-h-96 space-y-3 overflow-y-auto"
            aria-label="Últimas cem mensagens observadas"
          >
            {detail.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-lg p-3 text-sm ${m.direction === 'out' ? 'bg-muted' : 'border'}`}
              >
                <p className="text-xs text-muted-foreground">
                  {m.direction === 'in' ? 'Recebida' : (engagementLabels[m.state] ?? m.state)} ·{' '}
                  {new Date(m.at).toLocaleString('pt-BR')}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {m.text ??
                    (m.kind === 'postback' ? 'Interação em botão' : 'Conteúdo não disponível')}
                </p>
              </li>
            ))}
          </ol>
          {canReply ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button disabled={command.blocked} onClick={() => void action({ action: 'take' })}>
                  Assumir e pausar automação
                </Button>
                <Button
                  variant="outline"
                  disabled={command.blocked}
                  onClick={() => void action({ action: 'close' })}
                >
                  Encerrar conversa
                </Button>
                {(['stop', 'student', 'child'] as const).map((reason) => (
                  <Button
                    key={reason}
                    variant="outline"
                    disabled={command.blocked}
                    onClick={() => void action({ action: 'suppress', reason })}
                  >
                    {engagementLabels[reason]}
                  </Button>
                ))}
              </div>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void action({ action: 'reply', text: reply })
                }}
              >
                <EngagementField
                  label="Resposta da equipe"
                  multiline
                  value={reply}
                  onChange={setReply}
                />
                <Button
                  type="submit"
                  disabled={
                    command.blocked ||
                    !windowOpen ||
                    !channel.available ||
                    Boolean(c.suppression) ||
                    !reply.trim()
                  }
                >
                  Enviar resposta
                </Button>
              </form>
              <label htmlFor={`${id}-saved`} className="block text-sm">
                Resposta aprovada
                <Select id={`${id}-saved`} value={saved} onChange={(e) => setSaved(e.target.value)}>
                  {Object.entries(responseLabels)
                    .filter(([key]) => key !== 'typed')
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </Select>
              </label>
              <p className="whitespace-pre-wrap break-words text-sm">
                {
                  (detail.journey?.plan.responses ?? conversationResponses)[
                    saved as keyof typeof responseLabels
                  ]
                }
              </p>
              <Button
                variant="outline"
                disabled={command.blocked || !windowOpen || !channel.available}
                onClick={() => void action({ action: 'saved-reply', key: saved })}
              >
                Enviar resposta selecionada
              </Button>
              <details className="space-y-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Classificação para o planejamento
                </summary>
                <p className="text-sm">
                  Registrado: {c.topic ? topicLabels[c.topic] : 'Sem tema'} ·{' '}
                  {c.outcome ? outcomeLabels[c.outcome] : 'Sem desfecho'}. Só contagens agregadas
                  vão para os resultados da peça.
                </p>
                <label htmlFor={`${id}-topic`} className="block text-sm">
                  Tema
                  <Select
                    id={`${id}-topic`}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {Object.entries(topicLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label htmlFor={`${id}-outcome`} className="block text-sm">
                  Desfecho
                  <Select
                    id={`${id}-outcome`}
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    {Object.entries(outcomeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button
                  variant="outline"
                  disabled={command.blocked || c.suppression === 'erased'}
                  onClick={() =>
                    void action({
                      action: 'classify',
                      topic: conversationTopicSchema.parse(topic),
                      outcome: conversationOutcomeSchema.parse(outcome),
                    })
                  }
                >
                  Registrar classificação
                </Button>
              </details>
              <details className="space-y-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Retomada após triagem
                </summary>
                <p className="text-sm">
                  Confirme a solicitação explícita da pessoa. Criança ou conversa excluída não podem
                  retomar. A retomada não repete a apresentação.
                </p>
                <label htmlFor={`${id}-request`} className="block text-sm">
                  Solicitação conferida
                  <Select
                    id={`${id}-request`}
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                  >
                    <option value="">Escolha a mensagem recebida</option>
                    {detail.messages
                      .filter(
                        (m) => m.direction === 'in' && ['message', 'postback'].includes(m.kind),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {new Date(m.at).toLocaleString('pt-BR')} ·{' '}
                          {(m.text ?? 'Interação em botão').slice(0, 80)}
                        </option>
                      ))}
                  </Select>
                </label>
                <Button
                  variant="outline"
                  disabled={
                    command.blocked ||
                    !requestId ||
                    !windowOpen ||
                    Boolean(c.suppression === 'child' || c.suppression === 'erased')
                  }
                  onClick={() => void action({ action: 'resume', requestEventId: requestId })}
                  className="h-auto whitespace-normal py-2"
                >
                  Confirmar solicitação e liberar continuidade
                </Button>
              </details>
              {detail.messages.some((m) => m.state === 'uncertain') ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm">
                    Há envio com resultado incerto. Confira o histórico na Meta antes de registrar o
                    resultado. Nenhum reenvio é automático.
                  </p>
                  <EngagementField
                    label="Evidência da conferência"
                    value={evidence}
                    onChange={setEvidence}
                    multiline
                  />
                  <EngagementField
                    label="Identificador externo confirmado · exigido para aceite"
                    value={externalId}
                    onChange={setExternalId}
                    required={false}
                  />
                  {detail.messages
                    .filter((m) => m.state === 'uncertain')
                    .map((m) => (
                      <div key={m.id} className="space-x-2">
                        <span className="text-sm">
                          {m.text?.slice(0, 50) ?? 'Mensagem sem conteúdo retido'}
                        </span>
                        {(['accepted', 'not-sent'] as const).map((result) => (
                          <Button
                            key={result}
                            size="sm"
                            variant="outline"
                            disabled={
                              command.blocked ||
                              evidence.trim().length < 10 ||
                              (result === 'accepted' && !externalId.trim())
                            }
                            onClick={() =>
                              void action({
                                action: 'resolve',
                                intentId: m.id,
                                result,
                                externalId: externalId || null,
                                evidence,
                              })
                            }
                          >
                            {result === 'accepted'
                              ? 'Confirmar aceite'
                              : 'Confirmar que não foi enviada'}
                          </Button>
                        ))}
                      </div>
                    ))}
                </div>
              ) : null}
            </>
          ) : null}
          {channel.permissions.includes('admin') ? (
            <details>
              <summary className="cursor-pointer text-sm">Excluir conteúdo da conversa</summary>
              <label className="my-3 flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={erase}
                  onChange={(e) => setErase(e.target.checked)}
                />
                Confirmo a exclusão das mensagens e a manutenção da supressão mínima para impedir
                novos envios.
              </label>
              <Button
                variant="outline"
                disabled={!erase || command.blocked}
                onClick={() => void action({ action: 'erase' })}
              >
                Excluir conversa
              </Button>
            </details>
          ) : null}
        </>
      ) : null}
      {command.notice}
    </div>
  )
}
