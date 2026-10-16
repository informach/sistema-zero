'use client'
import {
  type ChannelPermission,
  capabilityProofSchema,
  channelMemberViewSchema,
  type channelViewSchema,
  staffIdentitySchema,
  type TeamMember,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useId, useState } from 'react'
import { z } from 'zod'
import { localDate } from './conversation-editor'
import { EngagementField, useEngagementCommand } from './engagement-ui'
import { errorMessage, type WorkbenchPort } from './port'

const permissionNames: Record<ChannelPermission, string> = {
  read: 'Ler conversas',
  reply: 'Atender',
  activate: 'Ativar campanhas',
  admin: 'Administrar canal',
}
export function EngagementSettings({
  port,
  channel,
  team,
  onChanged,
}: {
  port: WorkbenchPort
  channel: z.infer<typeof channelViewSchema>
  team: TeamMember[]
  onChanged: () => Promise<void>
}) {
  const id = useId(),
    command = useEngagementCommand(port, onChanged)
  const [enabled, setEnabled] = useState(channel.enabled),
    [evidence, setEvidence] = useState(channel.proof?.evidence ?? '')
  const [until, setUntil] = useState(
      channel.proof?.validUntil ? localDate(channel.proof.validUntil) : '',
    ),
    [checked, setChecked] = useState(false)
  const [retention, setRetention] = useState(String(channel.retentionDays)),
    [limit, setLimit] = useState(String(channel.maxSendsPerHour))
  const [privateHours, setPrivateHours] = useState(String(channel.proof?.privateReplyHours ?? 24)),
    [hours, setHours] = useState(String(channel.proof?.messageWindowHours ?? 24))
  const [external, setExternal] = useState<'observed' | 'pause-first'>(
      channel.proof?.externalReplies ?? 'pause-first',
    ),
    [issue, setIssue] = useState('')
  const [member, setMember] = useState(''),
    [permissions, setPermissions] = useState<ChannelPermission[]>(['read', 'reply'])
  const [members, setMembers] = useState<z.infer<typeof channelMemberViewSchema>[]>([]),
    [query, setQuery] = useState(''),
    [found, setFound] = useState<z.infer<typeof staffIdentitySchema>[]>([])
  useEffect(() => {
    if (!channel.canConfigure || !channel.version) return
    let live = true
    void port
      .request(`/engagement/accounts/${channel.id}/members`)
      .then((value) => {
        if (live) setMembers(z.array(channelMemberViewSchema).parse(value))
      })
      .catch((error) => {
        if (live) setIssue(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [port, channel.id, channel.version, channel.canConfigure])
  const people = [
    ...new Map([...team, ...members, ...found].map((person) => [person.id, person])).values(),
  ]
  if (!channel.canConfigure) return null
  return (
    <details className="space-y-4 rounded-xl border p-4">
      <summary className="cursor-pointer font-semibold">Configuração e equipe do canal</summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setIssue('')
          try {
            const proof = checked
              ? capabilityProofSchema.parse({
                  evidence,
                  validUntil: until ? new Date(until).toISOString() : '',
                  publicAudience: true,
                  privateReply: true,
                  internalButton: true,
                  continuation: true,
                  manualReply: true,
                  signedWebhook: true,
                  externalReplies: external,
                  privateReplyHours: Number(privateHours),
                  messageWindowHours: Number(hours),
                })
              : null
            if (enabled && !proof)
              throw new Error('Comprove as operações obrigatórias antes de habilitar o canal')
            void command.run(`/engagement/accounts/${channel.id}/configuration`, {
              expectedVersion: channel.version,
              enabled,
              proof,
              retentionDays: Number(retention),
              maxSendsPerHour: Number(limit),
            })
          } catch (error) {
            setIssue(errorMessage(error))
          }
        }}
      >
        <p className="text-sm">
          {channel.reason ?? 'Conta com capacidade vigente'}. Conectar para publicação não comprova
          atendimento ao público. Após reconectar a conta, confira novamente as capacidades.
        </p>
        <EngagementField
          label="Evidências dos testes na conta e responsável"
          value={evidence}
          onChange={setEvidence}
          multiline
          required={enabled}
        />
        <EngagementField
          label="Validade da comprovação · até sete dias"
          type="datetime-local"
          value={until}
          onChange={setUntil}
          required={enabled}
        />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Comprovei acesso ao público pretendido, assinatura do webhook, resposta privada, botão
          interno, continuidade e resposta humana nesta conexão.
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <EngagementField
            label="Janela comprovada de resposta privada · horas, até 168"
            value={privateHours}
            onChange={setPrivateHours}
            type="number"
          />
          <EngagementField
            label="Janela comprovada de resposta após interação · horas, até 24"
            value={hours}
            onChange={setHours}
            type="number"
          />
          <EngagementField
            label="Retenção de mensagens · dias, até 90"
            value={retention}
            onChange={setRetention}
            type="number"
          />
          <EngagementField
            label="Limite de envios por hora · até 200"
            value={limit}
            onChange={setLimit}
            type="number"
          />
        </div>
        <label htmlFor={`${id}-external`} className="block text-sm">
          Respostas feitas fora do aplicativo
          <Select
            id={`${id}-external`}
            value={external}
            onChange={(e) =>
              setExternal(e.target.value === 'observed' ? 'observed' : 'pause-first')
            }
          >
            <option value="pause-first">Equipe deve assumir aqui antes de responder fora</option>
            <option value="observed">Ecos externos foram comprovados nos testes</option>
          </Select>
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Habilitar envio nesta conta, condicionado à liberação global
        </label>
        <Button type="submit" disabled={command.blocked}>
          Salvar configuração
        </Button>
      </form>
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          void command.run(`/engagement/accounts/${channel.id}/members`, {
            expectedVersion: channel.version,
            userId: member,
            permissions,
          })
        }}
      >
        <ul className="space-y-1 text-sm" aria-label="Permissões atuais do canal">
          {members
            .filter((p) => p.permissions.length)
            .map((p) => (
              <li key={p.id}>
                {p.name}
                {!p.active ? ' · inativa' : ''}:{' '}
                {p.permissions.map((permission) => permissionNames[permission]).join(', ')}
              </li>
            ))}
        </ul>
        <EngagementField
          label="Buscar outra pessoa da equipe"
          value={query}
          onChange={setQuery}
          required={false}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={query.trim().length < 2 || !channel.version}
          onClick={() =>
            void port
              .request(
                `/engagement/accounts/${channel.id}/staff?q=${encodeURIComponent(query.trim())}`,
              )
              .then((value) => setFound(z.array(staffIdentitySchema).parse(value)))
              .catch((error) => setIssue(errorMessage(error)))
          }
        >
          Buscar pessoa
        </Button>
        <label htmlFor={`${id}-member`} className="block text-sm">
          Pessoa da equipe
          <Select
            id={`${id}-member`}
            value={member}
            onChange={(e) => {
              setMember(e.target.value)
              setPermissions(
                members.find((p) => p.id === e.target.value)?.permissions ?? ['read', 'reply'],
              )
            }}
          >
            <option value="">Escolha uma pessoa</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? ' · inativa, somente revogação' : ''}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-sm text-muted-foreground">
          O acesso editorial não concede acesso às mensagens. Esta ação substitui as permissões da
          pessoa no canal; desmarque todas para revogar.
        </p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(permissionNames) as ChannelPermission[]).map((p) => (
            <label className="flex gap-2 text-sm" key={p}>
              <input
                type="checkbox"
                checked={permissions.includes(p)}
                onChange={(e) =>
                  setPermissions((old) =>
                    e.target.checked ? [...old, p] : old.filter((v) => v !== p),
                  )
                }
              />
              {permissionNames[p]}
            </label>
          ))}
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={command.blocked || !member || !channel.version}
        >
          Aplicar permissões ao canal
        </Button>
      </form>
      {issue ? (
        <p role="alert" className="text-destructive">
          {issue}
        </p>
      ) : null}
      {command.notice}
    </details>
  )
}
