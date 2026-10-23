import {
  adaptationProposalSchema,
  capturePlanSchema,
  compositionProposalSchema,
  copyProposalSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { RunRequest } from '../shared/contracts'
import { claudeResult } from './claude-input'
import { canonicalArtProposal, nativeArtProposalSchema } from './provider-art-schema'
import type { ProviderOutput } from './provider-checkpoint'
import { requireNativeImage } from './provider-policy'
import { canonicalVideoProposal, nativeVideoProposalSchema } from './provider-video-schema'
import { validateResearch } from './research-evidence'

export function providerResponseSchema(request: RunRequest) {
  switch (request.responseFormat) {
    case 'editorial-copy':
      return copyProposalSchema
    case 'editorial-adapt':
      return adaptationProposalSchema
    case 'art':
      return nativeArtProposalSchema
    case 'video':
      return nativeVideoProposalSchema
    case 'composition':
      return compositionProposalSchema
    case 'capture':
      return capturePlanSchema
    default:
      return undefined
  }
}

/** The same validation runs for a fresh response and a recovered one. Recovery is compute-only. */
export function interpretProviderOutput(
  request: RunRequest,
  output: ProviderOutput,
  images: Buffer[],
  mode: string,
) {
  const responseSchema = providerResponseSchema(request)
  let text: string, inputTokens: number | null, outputTokens: number | null, rawStructured: unknown
  if (output.provider !== request.provider) throw new Error('Resposta de outro provedor')
  if (output.provider === 'claude') {
    const decoded = claudeResult(output.raw, output.streaming)
    if (output.code !== 0) {
      const detail = z
        .object({ subtype: z.string().optional(), errors: z.array(z.string()).optional() })
        .safeParse(decoded ?? {})
      const reason = detail.success
        ? [detail.data.subtype, ...(detail.data.errors ?? [])].filter(Boolean).join(': ')
        : ''
      throw new Error(
        `Claude: ${reason || `processo encerrado com código ${output.code}`}`
          .replace(/(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)/g, '[credencial omitida]')
          .slice(0, 1000),
      )
    }
    const result = z
      .object({
        is_error: z.boolean().optional(),
        result: z.string().optional(),
        structured_output: z.unknown().optional(),
        usage: z
          .object({
            input_tokens: z.number().int().nonnegative().optional(),
            output_tokens: z.number().int().nonnegative().optional(),
          })
          .optional(),
      })
      .parse(decoded)
    if (
      result.is_error ||
      (typeof result.result !== 'string' && result.structured_output === undefined)
    )
      throw new Error('O Claude não concluiu a resposta. Confira o limite da assinatura.')
    text = result.result ?? ''
    inputTokens = result.usage?.input_tokens ?? null
    outputTokens = result.usage?.output_tokens ?? null
    rawStructured = responseSchema
      ? (result.structured_output ?? JSON.parse(result.result ?? 'null'))
      : undefined
  } else {
    text = output.text
    inputTokens = output.inputTokens
    outputTokens = output.outputTokens
    rawStructured = responseSchema ? JSON.parse(text) : undefined
    if (['image', 'edit-image'].includes(request.kind))
      requireNativeImage(output.imageFailed, images.length)
  }
  const structured = responseSchema?.parse(rawStructured)
  const editorial =
    structured && (structured.kind === 'copy' || structured.kind === 'adapt')
      ? structured
      : undefined
  return {
    text: structured && 'summary' in structured ? structured.summary : text,
    ...(structured?.kind === 'capture' ? { capture: structured } : {}),
    ...(editorial ? { editorial } : {}),
    ...(structured?.kind === 'art' ? { art: canonicalArtProposal(structured) } : {}),
    ...(structured?.kind === 'video' ? { video: canonicalVideoProposal(structured) } : {}),
    ...(structured?.kind === 'composition' ? { composition: structured } : {}),
    images,
    mode,
    inputTokens,
    outputTokens,
    ...(request.kind === 'research' && output.provider === 'codex'
      ? { research: validateResearch(text, output.observedUrls, output.researchCalls) }
      : {}),
  }
}
