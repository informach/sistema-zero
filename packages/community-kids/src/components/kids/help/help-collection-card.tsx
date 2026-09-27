import type { HelpCollectionView } from '@sistemazero/core/help'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { HELP_COLLECTION_ICON, HELP_COLLECTION_TONE } from '@/lib/help-collections'
import { KidsFeatureCard } from '../kids-feature-card'

/** Uma coleção do "Como fazer" como porta: ícone e cor vêm das allowlists do core. */
export function HelpCollectionCard({ collection }: { collection: HelpCollectionView }) {
  const tone = HELP_COLLECTION_TONE[collection.tone] ?? HELP_COLLECTION_TONE.marca
  const Icon = HELP_COLLECTION_ICON[collection.icon] ?? HELP_COLLECTION_ICON.book
  const count = collection.publishedCount
  return (
    <Link
      href={`/como-fazer/colecao/${encodeURIComponent(collection.slug)}`}
      prefetch={false}
      className="kid-pop"
    >
      <KidsFeatureCard
        icon={Icon}
        title={collection.title}
        description={collection.description || undefined}
        badge={count === 1 ? '1 tutorial' : `${count} tutoriais`}
        color={tone.color}
        ink={tone.ink}
        fg={tone.fg}
        seloInk={tone.seloInk}
        className="h-full"
        footer={
          <span className="flex items-center gap-2">
            Ver os tutoriais
            <ArrowRight className="size-4" aria-hidden />
          </span>
        }
      />
    </Link>
  )
}
