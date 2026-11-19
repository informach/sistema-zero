'use client'
import type { MemberPromotion } from '@sistemazero/core/commerce'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'

export function MemberPromotionFields({
  value,
  onChange,
  offerName,
}: {
  value?: MemberPromotion
  onChange: (value: MemberPromotion) => void
  offerName: string
}) {
  const current: MemberPromotion = value ?? {
    enabled: false,
    mode: 'purchase',
    location: 'parent_home',
    title: offerName || 'Conheça esta oferta',
    description: '',
  }
  const patch = (change: Partial<MemberPromotion>) => onChange({ ...current, ...change })
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <legend className="px-2 font-semibold text-sm">Card na plataforma</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Disponibilizar apresentação na plataforma
      </label>
      {current.enabled ? (
        <>
          <Field label="Onde mostrar">
            <Select
              value={current.location}
              onChange={(e) =>
                patch({ location: e.target.value === 'manual' ? 'manual' : 'parent_home' })
              }
            >
              <option value="parent_home">Início da Área dos pais</option>
              <option value="manual">Somente onde eu inserir o componente</option>
            </Select>
          </Field>
          <Field label="Ação">
            <Select
              value={current.mode}
              onChange={(e) => patch({ mode: e.target.value === 'gift' ? 'gift' : 'purchase' })}
            >
              <option value="purchase">Comprar / assinar esta oferta</option>
              <option value="gift">Ativar presente de uma campanha desta oferta</option>
            </Select>
          </Field>
          {current.mode === 'gift' ? (
            <Field label="Código da campanha" hint="A campanha deve conceder esta mesma oferta.">
              <Input
                value={current.campaignCode ?? ''}
                onChange={(e) => patch({ campaignCode: e.target.value })}
                maxLength={32}
              />
            </Field>
          ) : null}
          <Field label="Título">
            <Input
              value={current.title}
              onChange={(e) => patch({ title: e.target.value })}
              maxLength={160}
            />
          </Field>
          <Field label="Descrição curta">
            <Input
              value={current.description}
              onChange={(e) => patch({ description: e.target.value })}
              maxLength={600}
            />
          </Field>
          <Field label="Texto do botão (opcional)">
            <Input
              value={current.buttonLabel ?? ''}
              onChange={(e) => patch({ buttonLabel: e.target.value || undefined })}
              maxLength={80}
            />
          </Field>
          <Field label="Imagem (URL opcional)">
            <Input
              type="url"
              value={current.imageUrl ?? ''}
              onChange={(e) => patch({ imageUrl: e.target.value || undefined })}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            A plataforma confere o acesso e a assinatura da família. Quem já tem esta assinatura vê
            o gerenciamento; uma falha de consulta não é tratada como ausência de assinatura.
          </p>
        </>
      ) : null}
    </fieldset>
  )
}
