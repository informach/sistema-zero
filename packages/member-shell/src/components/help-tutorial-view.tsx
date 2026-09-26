'use client'

import type { HelpTutorialDocument } from '@sistemazero/core/help'
import Link from 'next/link'
import { renderMarkdown } from '../lib/markdown'
import { parseVimeo, youtubeId } from '../lib/video-ids'
import { LessonYoutubeVideo } from './lesson-youtube-video'
import { VimeoPlayer } from './vimeo-player'

export interface HelpRelatedItem {
  slug: string
  label: string
  href?: string
}

/**
 * O tutorial do "Como fazer" como a criança o lê — e como a prévia do admin o mostra (é o
 * MESMO componente, para a prévia ser a página real).
 *
 * Não é aula: nada aqui marca progresso. O vídeo usa o `VimeoPlayer` DIRETO, com a marca
 * d'água (decisão da dona: o vídeo do tutorial tem marca d'água como o da aula) e SEM os
 * callbacks de progresso/retomada, que são do player da aula. Fora do `LessonPlayerProvider`
 * o YouTube também toca sem callbacks.
 */
export function HelpTutorialView({
  tutorial,
  watermark = null,
  relatedItems = [],
  headingLevel = 2,
}: {
  tutorial: HelpTutorialDocument
  /** Rótulo da marca d'água sobre o vídeo (kids: `Perfil <id8>`). `null` na prévia do admin. */
  watermark?: string | null
  /** Links já resolvidos pelo host; só dados atravessam a fronteira Server → Client. */
  relatedItems?: HelpRelatedItem[]
  /** Nível do título dos passos (a página põe o título do tutorial no cabeçalho dela). */
  headingLevel?: 2 | 3
}) {
  const StepHeading = headingLevel === 2 ? 'h2' : 'h3'
  const steps = tutorial.steps ?? []
  return (
    <div className="sz-help-tutorial">
      {tutorial.summary ? <p className="sz-help-tutorial-summary">{tutorial.summary}</p> : null}
      {tutorial.video ? <HelpVideo video={tutorial.video} watermark={watermark} /> : null}
      <ol className="sz-help-steps">
        {steps.map((step, index) => (
          <li key={step.id} className="sz-help-step" id={`passo-${index + 1}`}>
            <div className="sz-help-step-number" aria-hidden="true">
              {index + 1}
            </div>
            <div className="sz-help-step-body">
              <StepHeading className="sz-help-step-title">
                <span className="sr-only">Passo {index + 1}: </span>
                {step.title}
              </StepHeading>
              <div className="lesson-prose">{renderMarkdown(step.body ?? '')}</div>
              {step.imageUrl ? (
                <figure className="sz-help-step-figure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.imageUrl} alt={step.imageAlt ?? ''} loading="lazy" />
                </figure>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {relatedItems.length > 0 ? (
        <section className="sz-help-related" aria-labelledby="sz-help-related-title">
          <h2 id="sz-help-related-title" className="sz-help-related-title">
            Veja também
          </h2>
          <ul className="sz-help-related-list">
            {relatedItems.map((item) => (
              <li key={item.slug}>
                {item.href ? (
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-(--band-creme) px-4 font-bold text-foreground text-sm hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-sm">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function HelpVideo({
  video,
  watermark,
}: {
  video: NonNullable<HelpTutorialDocument['video']>
  watermark: string | null
}) {
  if (video.provider === 'youtube') {
    const id = youtubeId(video.src)
    if (!id) return <p role="alert">Vídeo indisponível.</p>
    return (
      <div className="sz-help-video">
        <LessonYoutubeVideo videoId={id} />
      </div>
    )
  }
  const parsed = parseVimeo(video.src)
  if (!parsed) return <p role="alert">Vídeo indisponível.</p>
  return (
    <div className="sz-help-video">
      <VimeoPlayer vimeoId={parsed.id} vimeoHash={parsed.hash} watermark={watermark} />
    </div>
  )
}
