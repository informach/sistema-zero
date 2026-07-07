'use client'

import { Label } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import { cn } from '@/lib/cn'
import {
  byteLength,
  captionLimitFor,
  countHashtags,
  FORMAT_NETWORK,
  hashtagLimitFor,
  isOverLimit,
  type PublicationFormat,
} from '@/lib/networks'

/**
 * Legenda (ou Descrição, no YouTube) com contador por rede. Estourar o limite
 * AVISA, não trava: as redes contam grafemas de formas diferentes e o backend
 * não valida — quem decide é a pessoa.
 */
export function CaptionEditor({
  format,
  value,
  onChange,
  disabled,
}: {
  format: PublicationFormat
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const network = FORMAT_NETWORK[format]
  const limit = captionLimitFor(format)
  const hashtagLimit = hashtagLimitFor(format)
  const hashtags = hashtagLimit !== null ? countHashtags(value) : 0
  // YouTube limita a descrição em BYTES (acento conta 2) — o contador acompanha.
  const measured = network === 'youtube' ? byteLength(value) : value.length
  const overChars = measured > limit
  const nearChars = !overChars && measured >= limit * 0.9
  const label = network === 'youtube' ? 'Descrição' : 'Legenda'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="composer-caption">{label}</Label>
        <span
          className={cn(
            'text-xs tabular-nums',
            overChars ? 'text-destructive' : nearChars ? 'text-chart-5' : 'text-muted-foreground',
          )}
        >
          {measured}/{limit}
          {network === 'youtube' ? ' bytes' : ''}
        </span>
      </div>
      <Textarea
        id="composer-caption"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="min-h-40"
        placeholder={network === 'youtube' ? 'Escreva a descrição do vídeo' : 'Escreva a legenda'}
        disabled={disabled}
      />
      {hashtagLimit !== null ? (
        <p
          className={cn(
            'text-xs tabular-nums',
            hashtags > hashtagLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {hashtags}/{hashtagLimit} hashtags
        </p>
      ) : null}
      {isOverLimit(format, value) ? (
        <p className="text-xs text-destructive" role="alert">
          Acima do limite da rede. Dá para salvar, mas a rede pode cortar ou recusar o post.
        </p>
      ) : null}
    </div>
  )
}
