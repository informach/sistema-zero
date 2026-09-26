import {
  type HelpCollectionDocument,
  isHelpCollectionIcon,
  isHelpCollectionTone,
  isHelpSlug,
} from './collection'
import { type HelpTutorialDocument, isHelpToolRef, isHelpVideoProvider } from './document'

/**
 * Regras editoriais do "Como fazer". Duas réguas, como no diálogo "Revisar para publicar"
 * da aula: os BLOQUEIOS (`validateHelpTutorial`) impedem publicar; as SUGESTÕES
 * (`helpEditorialWarnings`) só aparecem. Puro: roda no admin (diálogo) e no members
 * (publish), e os dois concordam por construção.
 */

export interface HelpValidationIssue {
  /** `title`, `summary`, `steps`, `steps.<id>.body`, `video.src`… */
  field: string
  message: string
  stepId?: string
}

export const HELP_TITLE_MAX = 90
export const HELP_SUMMARY_MAX = 240
export const HELP_KEYWORDS_MAX = 30
export const HELP_STEPS_MAX = 40
export const HELP_STEP_BODY_MAX = 6000
export const HELP_RELATED_MAX = 12

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

function hostOf(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    return url.hostname.toLowerCase()
  } catch {
    return null
  }
}

function isHttpsUrl(raw: string): boolean {
  return hostOf(raw) !== null
}

export function validateHelpTutorial(
  doc: HelpTutorialDocument,
  ctx: { slug: string },
): HelpValidationIssue[] {
  const issues: HelpValidationIssue[] = []
  const title = doc.title?.trim() ?? ''
  const summary = doc.summary?.trim() ?? ''

  if (!isHelpSlug(ctx.slug)) {
    issues.push({
      field: 'slug',
      message:
        'O endereço precisa ter só letras minúsculas, números e traços, e não pode ser uma palavra reservada.',
    })
  }
  if (title.length < 3) {
    issues.push({ field: 'title', message: 'Dê um título ao tutorial (pelo menos 3 letras).' })
  } else if (title.length > HELP_TITLE_MAX) {
    issues.push({
      field: 'title',
      message: `O título passou de ${HELP_TITLE_MAX} caracteres.`,
    })
  }
  if (summary.length < 10) {
    issues.push({
      field: 'summary',
      message: 'Escreva um resumo curto: o que a criança consegue fazer depois de ler.',
    })
  } else if (summary.length > HELP_SUMMARY_MAX) {
    issues.push({
      field: 'summary',
      message: `O resumo passou de ${HELP_SUMMARY_MAX} caracteres.`,
    })
  }
  if (!Array.isArray(doc.keywords) || doc.keywords.length > HELP_KEYWORDS_MAX) {
    issues.push({
      field: 'keywords',
      message: `As palavras alternativas precisam ser uma lista de até ${HELP_KEYWORDS_MAX}.`,
    })
  }
  if (doc.toolRef !== undefined && !isHelpToolRef(doc.toolRef)) {
    issues.push({ field: 'toolRef', message: 'Ferramenta desconhecida.' })
  }

  const steps = Array.isArray(doc.steps) ? doc.steps : []
  if (steps.length === 0) {
    issues.push({ field: 'steps', message: 'O tutorial precisa de pelo menos um passo.' })
  } else if (steps.length > HELP_STEPS_MAX) {
    issues.push({
      field: 'steps',
      message: `São muitos passos (${steps.length}). Divida em dois tutoriais.`,
    })
  }
  const seenIds = new Set<string>()
  steps.forEach((step, index) => {
    const label = `passo ${index + 1}`
    if (!step.id || seenIds.has(step.id)) {
      issues.push({
        field: `steps.${step.id ?? index}.id`,
        message: `O ${label} está sem identificador único.`,
        ...(step.id ? { stepId: step.id } : {}),
      })
    }
    seenIds.add(step.id)
    if (!step.title?.trim()) {
      issues.push({
        field: `steps.${step.id}.title`,
        message: `O ${label} está sem título.`,
        stepId: step.id,
      })
    }
    const body = step.body?.trim() ?? ''
    if (!body) {
      issues.push({
        field: `steps.${step.id}.body`,
        message: `O ${label} está sem texto. Diga o que a criança faz e onde.`,
        stepId: step.id,
      })
    } else if (body.length > HELP_STEP_BODY_MAX) {
      issues.push({
        field: `steps.${step.id}.body`,
        message: `O ${label} está longo demais (${body.length} caracteres). Divida em dois passos.`,
        stepId: step.id,
      })
    }
    if (step.imageUrl) {
      if (!isHttpsUrl(step.imageUrl)) {
        issues.push({
          field: `steps.${step.id}.imageUrl`,
          message: `A imagem do ${label} precisa ser um endereço https.`,
          stepId: step.id,
        })
      }
      if (!step.imageAlt?.trim()) {
        issues.push({
          field: `steps.${step.id}.imageAlt`,
          message: `A imagem do ${label} precisa de um texto alternativo (o que aparece nela).`,
          stepId: step.id,
        })
      }
    }
  })

  if (doc.video) {
    const host = hostOf(doc.video.src ?? '')
    if (!isHelpVideoProvider(doc.video.provider)) {
      issues.push({ field: 'video.provider', message: 'Provedor de vídeo desconhecido.' })
    } else if (!host) {
      issues.push({ field: 'video.src', message: 'O vídeo precisa ser um endereço https.' })
    } else if (doc.video.provider === 'vimeo' && !VIMEO_HOSTS.has(host)) {
      issues.push({ field: 'video.src', message: 'O endereço do vídeo não é do Vimeo.' })
    } else if (doc.video.provider === 'youtube' && !YOUTUBE_HOSTS.has(host)) {
      issues.push({ field: 'video.src', message: 'O endereço do vídeo não é do YouTube.' })
    }
    if (doc.video.posterUrl && !isHttpsUrl(doc.video.posterUrl)) {
      issues.push({ field: 'video.posterUrl', message: 'A capa precisa ser um endereço https.' })
    }
  }

  if (doc.related !== undefined) {
    if (!Array.isArray(doc.related) || doc.related.length > HELP_RELATED_MAX) {
      issues.push({
        field: 'related',
        message: `"Veja também" aceita até ${HELP_RELATED_MAX} tutoriais.`,
      })
    } else {
      for (const slug of doc.related) {
        if (!isHelpSlug(slug)) {
          issues.push({ field: 'related', message: `"${slug}" não é um endereço válido.` })
        } else if (slug === ctx.slug) {
          issues.push({ field: 'related', message: 'Um tutorial não pode apontar para si mesmo.' })
        }
      }
    }
  }
  return issues
}

export function validateHelpCollection(doc: HelpCollectionDocument): HelpValidationIssue[] {
  const issues: HelpValidationIssue[] = []
  if (!isHelpSlug(doc.slug)) {
    issues.push({
      field: 'slug',
      message: 'O endereço precisa ter só letras minúsculas, números e traços.',
    })
  }
  if (!doc.title?.trim() || doc.title.trim().length < 2) {
    issues.push({ field: 'title', message: 'Dê um nome à coleção.' })
  } else if (doc.title.trim().length > 60) {
    issues.push({ field: 'title', message: 'O nome da coleção passou de 60 caracteres.' })
  }
  if (typeof doc.description !== 'string' || doc.description.length > HELP_SUMMARY_MAX) {
    issues.push({ field: 'description', message: 'A descrição passou do tamanho.' })
  }
  if (!isHelpCollectionIcon(doc.icon)) {
    issues.push({ field: 'icon', message: 'Escolha um ícone da lista.' })
  }
  if (!isHelpCollectionTone(doc.tone)) {
    issues.push({ field: 'tone', message: 'Escolha uma cor da lista.' })
  }
  return issues
}

/**
 * Frases que transformam ajuda em anúncio. A biblioteca é NEUTRA (decisão de produto):
 * mostra o que a plataforma faz, e a decisão de compra fica com os responsáveis.
 */
const PITCH_PATTERNS: { padrao: RegExp; motivo: string }[] = [
  {
    padrao: /\b(compre|comprar|assine|assinar|assinatura)\b/i,
    motivo: 'fala de compra ou assinatura',
  },
  {
    padrao:
      /pe[çc]a (para|pro|pra) (o |a )?(seu|sua|seus|teu|tua)?\s*(pai|m[ãa]e|respons[áa]vel|pais)/i,
    motivo: 'pede para a criança convencer os responsáveis',
  },
  { padrao: /comunidade dos criadores/i, motivo: 'cita a oferta da Comunidade dos Criadores' },
  {
    padrao: /\b(desbloque(ie|ar)|libere|liberar) (o|a|as|os) /i,
    motivo: 'pede para desbloquear ferramenta',
  },
]

const WARN_STEP_BODY = 700
const WARN_STEPS = 8

export function helpEditorialWarnings(doc: HelpTutorialDocument): string[] {
  const warnings: string[] = []
  const steps = Array.isArray(doc.steps) ? doc.steps : []
  if (!doc.keywords?.length) {
    warnings.push(
      'Sem palavras alternativas: a criança que procurar "prévia" em vez de "pré-visualização" não vai achar. Adicione as palavras que ela usaria.',
    )
  }
  if (steps.length > WARN_STEPS) {
    warnings.push(
      `${steps.length} passos é muito para uma tarefa só. Considere dividir em dois tutoriais.`,
    )
  }
  for (const [index, step] of steps.entries()) {
    if ((step.body?.length ?? 0) > WARN_STEP_BODY) {
      warnings.push(
        `O passo ${index + 1} tem mais de ${WARN_STEP_BODY} caracteres. Passo curto é o que a criança consegue seguir com a tela aberta do lado.`,
      )
    }
  }
  if (!doc.video && !steps.some((step) => step.imageUrl)) {
    warnings.push(
      'Nenhuma imagem da interface nem vídeo. Um print do botão certo vale mais que um parágrafo.',
    )
  }
  const texto = [doc.title, doc.summary, ...steps.flatMap((s) => [s.title, s.body])].join('\n')
  for (const { padrao, motivo } of PITCH_PATTERNS) {
    if (padrao.test(texto)) {
      warnings.push(
        `O texto ${motivo}. A ajuda é neutra: se a ferramenta não estiver liberada, a página avisa sozinha, sem pedido de compra.`,
      )
    }
  }
  if (/—/.test(texto)) {
    warnings.push('Tem travessão (—) no texto. A voz da casa usa vírgula, ponto ou "que".')
  }
  return warnings
}
