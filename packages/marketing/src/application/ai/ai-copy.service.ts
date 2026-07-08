import { ValidationError } from '@sistemazero/core/errors'
import { z } from 'zod'
import { lintLightCopy } from '../../domain/copy/light-copy'
import { lightCopyRulesText } from '../../domain/copy/light-copy-rules'
import { AiNotConfiguredError, AiUnavailableError } from '../../domain/marketing-errors'
import {
  type ContentType,
  captionLimitFor,
  FORMAT_LABELS,
  FORMAT_NETWORK,
  hashtagLimitFor,
  type PublicationFormat,
} from '../../domain/publication/publication'
import { type AiCopyApi, AiCopyError } from '../../infrastructure/gateways/ai/ai-copy.port'
import type { ContentService } from '../contents/content.service'

export type AiCopyMode = 'generate' | 'improve'

export interface AiCaptionResult {
  caption: string
  hashtags: string[]
  notes: string[]
}
export interface AiScriptResult {
  script: string
  notes: string[]
}

const CaptionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
})
const ScriptSchema = z.object({
  script: z.string(),
  notes: z.array(z.string()).default([]),
})

const CAPTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['caption', 'hashtags', 'notes'],
  properties: {
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } },
  },
}
const SCRIPT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['script', 'notes'],
  properties: {
    script: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
  },
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  reels: 'Reels (vídeo curto vertical)',
  video_long: 'vídeo longo',
  carousel: 'carrossel de imagens',
  static_post: 'post estático (imagem única)',
  story: 'Story',
}

/** Voz + Light Copy: o prólogo comum a TODO prompt de copy. */
const VOICE_PREAMBLE = `Você escreve copy de marketing para o Sistema Zero, em português do Brasil.
A voz é humana e fluida, como uma pessoa falando, nunca com cara de texto de IA.
Siga as 12 proibições do Light Copy (método VTSD), frase por frase:
${lightCopyRulesText()}
Regras extras: o produto NUNCA aparece no começo (o lead fala da dor/desejo do leitor, não do curso/método).
Responda SEMPRE um único objeto JSON no formato pedido, sem texto fora do JSON.`

/**
 * Copy assistida por IA (F5): gera e melhora legendas (rede-aware, com
 * hashtags) e roteiros no padrão Light Copy. NÃO escreve no banco — só lê o
 * conteúdo e devolve a sugestão; a pessoa revisa e salva. Sem chave → 503;
 * erro do upstream → 502. O `linter` mecânico entra como dica no prompt.
 */
export class AiCopyService {
  constructor(
    private readonly ai: AiCopyApi,
    private readonly contents: ContentService,
    private readonly maxInputChars: number,
  ) {}

  isConfigured(): boolean {
    return this.ai.isConfigured()
  }

  private clamp(text: string): string {
    return text.length > this.maxInputChars ? text.slice(0, this.maxInputChars) : text
  }

  private async run<T>(input: {
    system: string
    user: string
    schema: z.ZodType<T>
    jsonSchema: Record<string, unknown>
    schemaName: string
  }): Promise<T> {
    if (!this.ai.isConfigured()) throw new AiNotConfiguredError()
    try {
      return await this.ai.complete(input)
    } catch (error) {
      if (error instanceof AiCopyError) {
        if (error.kind === 'not_configured') throw new AiNotConfiguredError()
        throw new AiUnavailableError()
      }
      throw error
    }
  }

  async caption(input: {
    contentId?: string
    format: PublicationFormat
    mode: AiCopyMode
    caption?: string
  }): Promise<AiCaptionResult> {
    const network = FORMAT_NETWORK[input.format]
    const limit = captionLimitFor(input.format)
    const hashtagLimit = hashtagLimitFor(input.format)
    const hashtagLine =
      hashtagLimit !== null
        ? `Sugira até ${hashtagLimit} hashtags relevantes (campo "hashtags", sem o "#").`
        : network === 'tiktok'
          ? 'Sugira de 3 a 5 hashtags relevantes (campo "hashtags", sem o "#").'
          : 'Não use hashtags (campo "hashtags" vazio).'

    let material = ''
    if (input.mode === 'generate') {
      if (!input.contentId) throw new ValidationError('Informe o conteúdo para gerar a legenda')
      const content = await this.contents.byId(input.contentId)
      material = [
        `Título: ${content.title}`,
        content.brief ? `Briefing: ${content.brief}` : '',
        content.script ? `Roteiro:\n${content.script}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    } else {
      const current = (input.caption ?? '').trim()
      if (!current) throw new ValidationError('Não há legenda para melhorar')
      const issues = lintLightCopy(current)
      material = `Legenda atual:\n${current}${
        issues.length > 0
          ? `\n\nProblemas de Light Copy já detectados (corrija todos): ${issues
              .map((i) => `${i.rule} ${i.label}`)
              .join('; ')}`
          : ''
      }`
    }

    const task =
      input.mode === 'generate'
        ? `Escreva a legenda de ${FORMAT_LABELS[input.format]} a partir do material abaixo.`
        : `Reescreva a legenda de ${FORMAT_LABELS[input.format]} abaixo corrigindo os problemas de Light Copy e mantendo a ideia.`

    const system = `${VOICE_PREAMBLE}

${task}
A legenda tem no máximo ${limit} caracteres. ${hashtagLine}
No campo "notes", liste em 1 a 3 frases curtas o que você fez (ou corrigiu) e por quê.`

    const result = await this.run({
      system,
      user: this.clamp(material),
      schema: CaptionSchema,
      jsonSchema: CAPTION_JSON_SCHEMA,
      schemaName: 'marketing_caption',
    })
    // Normaliza hashtags (tira "#" e vazios) e respeita o teto.
    const hashtags = result.hashtags
      .map((h) => h.replace(/^#+/, '').trim())
      .filter(Boolean)
      .slice(0, hashtagLimit ?? 30)
    return { caption: result.caption.trim(), hashtags, notes: result.notes }
  }

  async script(input: {
    contentId?: string
    mode: AiCopyMode
    script?: string
    instruction?: string
  }): Promise<AiScriptResult> {
    let material = ''
    let contentTypeLabel = 'conteúdo'
    if (input.mode === 'generate') {
      if (!input.contentId) throw new ValidationError('Informe o conteúdo para gerar o roteiro')
      const content = await this.contents.byId(input.contentId)
      contentTypeLabel = CONTENT_TYPE_LABELS[content.contentType] ?? 'conteúdo'
      material = [
        `Título: ${content.title}`,
        content.brief ? `Briefing: ${content.brief}` : 'Sem briefing.',
      ].join('\n\n')
    } else {
      const current = (input.script ?? '').trim()
      if (!current) throw new ValidationError('Não há roteiro para melhorar')
      material = `Roteiro atual:\n${current}`
    }
    const focus = input.instruction?.trim() ? `\nFoco pedido: ${input.instruction.trim()}` : ''

    const task =
      input.mode === 'generate'
        ? `Escreva o roteiro de um ${contentTypeLabel} a partir do material abaixo.`
        : 'Reescreva o roteiro abaixo deixando-o mais afiado, mantendo a mensagem.'

    const system = `${VOICE_PREAMBLE}

${task}${focus}
O roteiro é a fala/estrutura do vídeo ou post: gancho forte no começo, desenvolvimento com argumento (tese), e um fechamento com chamada para ação natural.
No campo "notes", liste em 1 a 3 frases curtas o que você fez (ou corrigiu) e por quê.`

    return this.run({
      system,
      user: this.clamp(material),
      schema: ScriptSchema,
      jsonSchema: SCRIPT_JSON_SCHEMA,
      schemaName: 'marketing_script',
    })
  }
}
