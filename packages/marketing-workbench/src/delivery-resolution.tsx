'use client'
import type { Delivery, deliveryOptionsSchema } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import type { z } from 'zod'

export function DeliveryResolution({
  delivery,
  options,
  disabled,
  onAction,
}: {
  delivery: Delivery
  options: z.infer<typeof deliveryOptionsSchema>
  disabled: boolean
  onAction: (input: Record<string, unknown>) => Promise<void>
}) {
  const id = useId(),
    [url, setUrl] = useState(delivery.externalUrl ?? ''),
    [account, setAccount] = useState(delivery.socialAccountId ?? ''),
    [confirmed, setConfirmed] = useState(false),
    [cancelAcknowledged, setCancelAcknowledged] = useState(false)
  const network = delivery.format.startsWith('ig_')
    ? 'instagram'
    : delivery.format.startsWith('fb_')
      ? 'facebook'
      : delivery.format.startsWith('yt_')
        ? 'youtube'
        : 'tiktok'
  const uncertain = delivery.status === 'failed' && delivery.started
  if (!uncertain && delivery.status !== 'published') return null
  return (
    <fieldset disabled={disabled} className="space-y-3 border-t pt-3">
      <legend className="text-sm font-semibold">
        {uncertain
          ? 'Conferir o resultado do envio'
          : 'Vincular o post real e acompanhar resultados'}
      </legend>
      <p className="text-sm text-muted-foreground">
        {uncertain
          ? 'O envio foi interrompido depois de iniciar uma operação na rede. Confira a conta e o post antes de decidir. Esta conferência não envia a peça novamente.'
          : 'Escolha a conta e informe o link. O servidor verifica se o post pertence à conta antes de coletar métricas.'}
      </p>
      {options.verifiableNetworks.includes(network) ? (
        <>
          <label htmlFor={`${id}-account`} className="block text-sm">
            Conta que publicou
            <Select
              id={`${id}-account`}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            >
              <option value="">Escolha a conta</option>
              {options.accounts
                .filter(
                  (item) =>
                    item.network === network &&
                    (!delivery.socialAccountId || delivery.socialAccountId === item.id),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
            </Select>
          </label>
          <label htmlFor={`${id}-url`} className="block text-sm">
            Link do post publicado
            <Input
              id={`${id}-url`}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Conferi o post na rede: ele corresponde exatamente à edição desta entrega.
          </label>
          <Button
            size="sm"
            disabled={disabled || !confirmed || !url || !account}
            onClick={() =>
              void onAction({
                action: uncertain ? 'reconcile-published' : 'link-external',
                externalUrl: url,
                socialAccountId: account,
                confirmedEdition: true,
              })
            }
          >
            Verificar e registrar o post real
          </Button>
        </>
      ) : (
        <p className="text-sm">
          A consulta de posts desta rede não está disponível na configuração atual.
        </p>
      )}
      {uncertain ? (
        <details>
          <summary className="cursor-pointer text-sm">Encerrar apenas esta entrega no app</summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm">
              Isso encerra o acompanhamento local. Um post ou agendamento que já exista na rede
              permanece lá e deve ser conferido diretamente. O histórico do envio será preservado.
            </p>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={cancelAcknowledged}
                onChange={(event) => setCancelAcknowledged(event.target.checked)}
              />
              Entendi que esta ação não exclui nem cancela nada na rede social.
            </label>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !cancelAcknowledged}
              onClick={() =>
                void onAction({ action: 'cancel-local', acknowledgeExternalUnchanged: true })
              }
            >
              Encerrar entrega no app
            </Button>
          </div>
        </details>
      ) : null}
    </fieldset>
  )
}
