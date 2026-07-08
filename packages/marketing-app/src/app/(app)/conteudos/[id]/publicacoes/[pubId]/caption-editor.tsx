'use client'

import { Button } from '@sistemazero/ui/button'
import { Label } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import { Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LightCopyHints } from '@/components/ai/light-copy-hints'
import { type ApiError, apiSend } from '@/lib/api'
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
import type { AiCaptionView } from '@/lib/types'

/**
 * Legenda (ou Descrição, no YouTube) com contador por rede, feedback passivo de
 * Light Copy e assistente de IA (Gerar/Melhorar). Estourar o limite AVISA, não
 * trava. A IA preenche o editor para a pessoa revisar e salvar (nunca salva
 * sozinha); "gerar de novo" é clicar outra vez.
 */
export function CaptionEditor({
  contentId,
  format,
  value,
  onChange,
  disabled,
  aiEnabled,
}: {
  contentId: string
  format: PublicationFormat
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** IA da copy configurada no ambiente (esconde os botões quando false). */
  aiEnabled?: boolean
}) {
  const network = FORMAT_NETWORK[format]
  const limit = captionLimitFor(format)
  const hashtagLimit = hashtagLimitFor(format)
  const hashtags = hashtagLimit !== null ? countHashtags(value) : 0
  const measured = network === 'youtube' ? byteLength(value) : value.length
  const overChars = measured > limit
  const nearChars = !overChars && measured >= limit * 0.9
  const label = network === 'youtube' ? 'Descrição' : 'Legenda'

  const [aiBusy, setAiBusy] = useState<false | 'generate' | 'improve'>(false)
  const [suggestion, setSuggestion] = useState<AiCaptionView | null>(null)

  async function runAi(mode: 'generate' | 'improve') {
    setAiBusy(mode)
    setSuggestion(null)
    try {
      const res = await apiSend<AiCaptionView>('/api/marketing/ai/caption', 'POST', {
        contentId,
        format,
        mode,
        caption: mode === 'improve' ? value : undefined,
      })
      onChange(res.caption)
      setSuggestion(res)
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 503
          ? 'A IA não está configurada neste ambiente.'
          : apiError.status === 502
            ? 'A IA não respondeu agora. Tente de novo.'
            : apiError.message,
      )
    } finally {
      setAiBusy(false)
    }
  }

  function applyHashtags() {
    if (!suggestion || suggestion.hashtags.length === 0) return
    const present = new Set(
      (value.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase()),
    )
    const toAdd = suggestion.hashtags.filter((h) => !present.has(h.toLowerCase()))
    if (toAdd.length === 0) {
      toast.info('As hashtags sugeridas já estão na legenda.')
      return
    }
    onChange(`${value.trimEnd()}\n\n${toAdd.map((h) => `#${h}`).join(' ')}`)
  }

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

      {aiEnabled && !disabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void runAi('generate')}
            disabled={aiBusy !== false}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {aiBusy === 'generate' ? 'Gerando…' : value.trim() ? 'Gerar de novo' : 'Gerar com IA'}
          </Button>
          {value.trim() ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runAi('improve')}
              disabled={aiBusy !== false}
            >
              <Wand2 className="size-3.5" aria-hidden />
              {aiBusy === 'improve' ? 'Melhorando…' : 'Melhorar'}
            </Button>
          ) : null}
          {suggestion && suggestion.hashtags.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={applyHashtags}>
              Aplicar {suggestion.hashtags.length} hashtags
            </Button>
          ) : null}
        </div>
      ) : null}

      {suggestion && suggestion.notes.length > 0 ? (
        <p className="text-xs text-muted-foreground">A IA: {suggestion.notes.join(' ')}</p>
      ) : null}

      <LightCopyHints text={value} />

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
