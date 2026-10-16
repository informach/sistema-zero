'use client'
import {
  activationViewSchema,
  channelViewSchema,
  conversationApprovalSchema,
  type Delivery,
  deliveryPageSchema,
  type Project,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useId, useState } from 'react'
import { z } from 'zod'
import { ConversationEditor, ConversationPreview } from './conversation-editor'
import { EngagementMetrics } from './engagement-metrics'
import { engagementLabels, useEngagementCommand } from './engagement-ui'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

export function ConversationPanel({
  port,
  project,
  piece,
  representationId,
  onChanged,
}: {
  port: WorkbenchPort
  project: Project
  piece: EditorialEntry
  representationId?: string
  onChanged: () => Promise<void>
}) {
  const id = useId(),
    base = `/projects/${project.id}`
  const [editing, setEditing] = useState(false),
    [checked, setChecked] = useState(false),
    [approved, setApproved] = useState(false)
  const [checkedPublication, setCheckedPublication] = useState(false)
  const [channels, setChannels] = useState<z.infer<typeof channelViewSchema>[]>([]),
    [activations, setActivations] = useState<z.infer<typeof activationViewSchema>[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [deliveryId, setDeliveryId] = useState(''),
    [issue, setIssue] = useState('')
  const refresh = useCallback(async () => {
    const [accounts, states, approval] = await Promise.all([
      port.request('/engagement/accounts'),
      port.request(`${base}/pieces/${piece.id}/engagement`),
      piece.confirmed?.revisionId
        ? port.request(
            `${base}/pieces/${piece.id}/engagement/approval?revisionId=${piece.confirmed.revisionId}`,
          )
        : Promise.resolve(null),
    ])
    setChannels(z.array(channelViewSchema).parse(accounts))
    setActivations(z.array(activationViewSchema).parse(states))
    setApproved(approval ? conversationApprovalSchema.parse(approval).approved : false)
    setIssue('')
  }, [port, base, piece.id, piece.confirmed?.revisionId])
  useEffect(() => {
    let live = true
    const update = () => {
      if (live)
        void refresh().catch((error) => {
          if (live) {
            setIssue(errorMessage(error))
            setChannels([])
            setActivations([])
            setApproved(false)
          }
        })
    }
    update()
    const timer = setInterval(update, 10000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [refresh])
  const loadDeliveries = useCallback(
    async (before?: string) => {
      if (!representationId) return
      const page = deliveryPageSchema.parse(
        await port.request(
          `${base}/representations/${representationId}/deliveries${before ? `?before=${before}` : ''}`,
        ),
      )
      setDeliveries((old) => (before ? [...old, ...page.items] : page.items))
      setCursor(page.nextCursor)
    },
    [port, base, representationId],
  )
  useEffect(() => {
    setDeliveries([])
    setDeliveryId('')
    setCursor(null)
    void loadDeliveries().catch((e) => setIssue(errorMessage(e)))
  }, [loadDeliveries])
  const command = useEngagementCommand(port, refresh)
  if (piece.document.kind !== 'piece') return null
  const plan = piece.document.conversation,
    revisionId = piece.confirmed?.revisionId
  const pending = piece.pending.length > 0 || piece.conflict || !revisionId
  const delivery = deliveries.find((d) => d.id === deliveryId),
    channel = channels.find((c) => c.id === delivery?.socialAccountId)
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Conversa no Instagram">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Conversa no Instagram</h3>
        {project.permissions.includes('edit') ? (
          <Button variant="outline" disabled={pending} onClick={() => setEditing(true)}>
            {plan ? 'Revisar conversa' : 'Preparar conversa'}
          </Button>
        ) : null}
      </div>
      {plan ? (
        <>
          <ConversationPreview plan={plan} />
          <p className="text-sm">
            Oferta conferida até {new Date(plan.validUntil).toLocaleString('pt-BR')}.{' '}
            {plan.offerReference}
          </p>
          {pending ? (
            <p className="text-sm">Confirme a sincronização da peça antes de aprovar ou ativar.</p>
          ) : null}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            Conferi a oferta publicada, a promessa desta peça e as respostas de dúvida, aluno,
            criança e encerramento.
          </label>
          {project.permissions.includes('approve') ? (
            <Button
              disabled={pending || !checked || command.blocked}
              onClick={() => {
                void command
                  .run(`${base}/engagement/approvals`, {
                    revisionId,
                    checkedOffer: true,
                    checkedExits: true,
                  })
                  .then((ok) => {
                    if (ok) setApproved(true)
                  })
              }}
            >
              Aprovar texto desta revisão
            </Button>
          ) : null}
          {approved ? (
            <p role="status" className="text-sm">
              Texto desta revisão aprovado. A operação não altera uma conversa já ativa.
            </p>
          ) : null}
          <label htmlFor={`${id}-delivery`} className="block space-y-1 text-sm">
            Publicação do formato selecionado
            <Select
              id={`${id}-delivery`}
              value={deliveryId}
              onChange={(e) => {
                setDeliveryId(e.target.value)
                setCheckedPublication(false)
              }}
            >
              <option value="">Escolha a publicação</option>
              {deliveries
                .filter((d) => d.format.startsWith('ig_') && d.format !== 'ig_story')
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || 'Publicação'} · {d.format} · {d.status} ·{' '}
                    {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                  </option>
                ))}
            </Select>
          </label>
          {cursor ? (
            <Button
              variant="ghost"
              onClick={() => void loadDeliveries(cursor).catch((e) => setIssue(errorMessage(e)))}
            >
              Buscar publicações anteriores
            </Button>
          ) : null}
          <p className="text-sm">
            {channel
              ? `${channel.name}: ${channel.available ? 'capacidade vigente' : channel.reason}`
              : 'Vincule uma conta à publicação pela conferência de entrega.'}
          </p>
          {delivery ? (
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={checkedPublication}
                onChange={(e) => setCheckedPublication(e.target.checked)}
              />
              Conferi que a palavra, a promessa e a oferta desta revisão correspondem à publicação
              selecionada.
            </label>
          ) : null}
          {project.permissions.includes('publish') ? (
            <Button
              disabled={
                pending ||
                !checked ||
                !approved ||
                !checkedPublication ||
                command.blocked ||
                !channel?.available ||
                !delivery ||
                !channel.permissions.some((p) => p === 'activate' || p === 'admin')
              }
              onClick={() =>
                void command.run(`${base}/engagement/activations`, {
                  revisionId,
                  publicationId: deliveryId,
                  accountId: channel?.id,
                  checkedPublication: true,
                })
              }
            >
              Solicitar ativação desta revisão
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Salvar, aprovar e publicar são etapas separadas. A ativação aguarda a confirmação de que
            o post pertence à conta.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Prepare a abertura, a apresentação e as saídas usando o texto vigente da peça. O envio
          começa desligado.
        </p>
      )}
      <ul className="space-y-3">
        {activations.map((activation) => (
          <li key={activation.id} className="space-y-2 rounded-lg border p-3 text-sm">
            <p>
              {engagementLabels[activation.state]} ·{' '}
              {activation.revisionId === revisionId
                ? 'Revisão exibida'
                : 'Revisão anterior preservada'}{' '}
              · {new Date(activation.createdAt).toLocaleString('pt-BR')}
            </p>
            {activation.reason ? <p>{activation.reason}</p> : null}
            {project.permissions.includes('publish') && activation.state !== 'retired' ? (
              <div className="flex flex-wrap gap-2">
                {(['pause', 'resume', 'retire'] as const).map((action) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    disabled={
                      command.blocked ||
                      !channels
                        .find((c) => c.id === activation.accountId)
                        ?.permissions.some((p) => p === 'activate' || p === 'admin')
                    }
                    onClick={() =>
                      void command.run(`${base}/engagement/activations/${activation.id}/actions`, {
                        expectedVersion: activation.version,
                        action,
                        reason:
                          action === 'resume'
                            ? 'Reverificar vínculo por solicitação da equipe'
                            : 'Interrompida pela equipe na bancada',
                      })
                    }
                  >
                    {action === 'pause'
                      ? 'Pausar'
                      : action === 'resume'
                        ? 'Reverificar e retomar'
                        : 'Encerrar ativação'}
                  </Button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {issue ? (
        <p role="alert" className="text-sm text-destructive">
          {issue}
        </p>
      ) : null}
      {command.notice}
      {plan ? <EngagementMetrics port={port} projectId={project.id} pieceId={piece.id} /> : null}
      {editing ? (
        <ConversationEditor
          port={port}
          projectId={project.id}
          entry={piece}
          onClose={() => setEditing(false)}
          onSaved={onChanged}
        />
      ) : null}
    </section>
  )
}
