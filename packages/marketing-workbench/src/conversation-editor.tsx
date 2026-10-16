'use client'
import {
  type ConversationPlan,
  conversationPlanSchema,
  conversationResponses,
  conversationUrl,
  documentSchema,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useState } from 'react'
import { EngagementField, responseLabels } from './engagement-ui'
import { errorMessage, type WorkbenchPort } from './port'
import type { EditorialEntry } from './projection'

export function ConversationPreview({ plan }: { plan: ConversationPlan }) {
  return (
    <section
      className="mx-auto max-w-sm space-y-3 rounded-2xl border bg-muted/30 p-4 text-sm"
      aria-label="Prévia da conversa"
    >
      <p>
        Ao comentar <strong>{plan.keyword}</strong> no post vinculado:
      </p>
      <p className="whitespace-pre-wrap rounded-xl bg-card p-3">{plan.opening}</p>
      <p className="rounded-lg border p-2 text-center">Ver o projeto</p>
      <p className="text-muted-foreground">Só depois do botão interno:</p>
      <p className="whitespace-pre-wrap rounded-xl bg-card p-3">{plan.offer}</p>
      <a
        className="block break-words rounded-lg border p-2 text-center underline"
        href={conversationUrl(plan)}
        target="_blank"
        rel="noreferrer"
      >
        Conhecer o Desafio
      </a>
      <p>
        Botões: Tenho uma dúvida · Já somos alunos. Para encerrar, a pessoa pode escrever PARAR.
      </p>
      <p className="text-muted-foreground">
        Silêncio: nenhuma mensagem. Texto livre: atendimento da equipe antes de continuar.
      </p>
      <details>
        <summary className="cursor-pointer">Saídas e continuidade</summary>
        <dl className="mt-3 space-y-3">
          {Object.entries(plan.responses).map(([key, value]) => (
            <div key={key}>
              <dt className="font-semibold">
                {responseLabels[key as keyof typeof responseLabels]}
              </dt>
              <dd className="whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  )
}
export function ConversationEditor({
  port,
  projectId,
  entry,
  onClose,
  onSaved,
}: {
  port: WorkbenchPort
  projectId: string
  entry: EditorialEntry
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const existing = entry.document.kind === 'piece' ? entry.document.conversation : undefined
  const [plan, setPlan] = useState<ConversationPlan>(
    existing ?? {
      schemaVersion: 1,
      keyword: '',
      opening: '',
      offer: '',
      destination: 'https://sistemazero.com.br/kids/desafio/oferta',
      campaign: 'instagram_manychat_desafio_14_2026',
      contentKey: '',
      offerReference: '',
      validUntil: '',
      responses: { ...conversationResponses },
    },
  )
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState('')
  const set = (
    key: Exclude<keyof ConversationPlan, 'schemaVersion' | 'responses'>,
    value: string,
  ) => setPlan((p) => ({ ...p, [key]: value }))
  const preview = conversationPlanSchema.safeParse(plan)
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Conversa no Instagram"
      description="Revise os textos da peça e a oferta vigente. Salvar cria um rascunho; a ativação é separada."
    >
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setIssue('')
          void (async () => {
            if (entry.document.kind !== 'piece') return
            const conversation = conversationPlanSchema.parse(plan)
            await port.save(
              {
                schemaVersion: 1,
                operationId: crypto.randomUUID(),
                projectId,
                entityId: entry.id,
                baseRevisionId: entry.confirmed?.revisionId ?? null,
                action: 'save',
                document: documentSchema.parse({ ...entry.document, conversation }),
              },
              null,
            )
            await onSaved()
            onClose()
          })()
            .catch((error) => setIssue(errorMessage(error)))
            .finally(() => setBusy(false))
        }}
      >
        <EngagementField
          label="Palavra da peça"
          value={plan.keyword}
          onChange={(v) => set('keyword', v)}
        />
        {plan.keyword.toLocaleUpperCase('pt-BR') === 'PRIMEIRO' ? (
          <p className="text-sm">
            PRIMEIRO pode ocorrer em comentários incidentais. Confira esse risco na revisão da MC08.
          </p>
        ) : null}
        <EngagementField
          label="Abertura · até 25 palavras, identificada como automática e assinada"
          value={plan.opening}
          onChange={(v) => set('opening', v)}
          multiline
        />
        <EngagementField
          label="Apresentação do Desafio · até 70 palavras"
          value={plan.offer}
          onChange={(v) => set('offer', v)}
          multiline
        />
        <EngagementField
          label="Página da oferta"
          value={plan.destination}
          onChange={(v) => set('destination', v)}
          type="url"
        />
        <EngagementField
          label="Campanha de origem"
          value={plan.campaign}
          onChange={(v) => set('campaign', v)}
        />
        <EngagementField
          label="Identificação editorial da peça na medição"
          value={plan.contentKey}
          onChange={(v) => set('contentKey', v)}
        />
        <EngagementField
          label="Fonte e condições da oferta conferida"
          value={plan.offerReference}
          onChange={(v) => set('offerReference', v)}
          multiline
        />
        <EngagementField
          label="Oferta conferida até · no máximo sete dias ao aprovar"
          type="datetime-local"
          value={plan.validUntil ? localDate(plan.validUntil) : ''}
          onChange={(v) => set('validUntil', v ? new Date(v).toISOString() : '')}
        />
        <details>
          <summary className="cursor-pointer font-medium">Respostas de saída e atendimento</summary>
          <div className="mt-3 space-y-3">
            {Object.entries(responseLabels).map(([key, label]) => {
              const responseKey = key as keyof ConversationPlan['responses']
              return (
                <EngagementField
                  key={key}
                  label={label}
                  value={plan.responses[responseKey]}
                  multiline
                  onChange={(value) =>
                    setPlan((p) => ({ ...p, responses: { ...p.responses, [responseKey]: value } }))
                  }
                />
              )
            })}
          </div>
        </details>
        {preview.success ? <ConversationPreview plan={preview.data} /> : null}
        {issue ? (
          <p role="alert" className="text-destructive">
            {issue}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          Salvar revisão
        </Button>
      </form>
    </Dialog>
  )
}
export function localDate(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
