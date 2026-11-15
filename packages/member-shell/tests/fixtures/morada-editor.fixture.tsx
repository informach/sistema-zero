import { ChevronLeft } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import { MoradaRoomBuilder } from '../../src/components/cosmetics/room/morada-room-builder'
import { AdultRoomBuilderView } from '../../src/components/cosmetics/room/room-builder-view-adult'

const element = document.getElementById('root')
if (!element) throw new Error('Falta a raiz do editor de conferência.')
const adult = new URLSearchParams(location.search).get('adulto') === '1'
const header = adult ? (
  <>
    <a href="/" className="sz-cos-back">
      <ChevronLeft aria-hidden="true" />
      Seu progresso
    </a>
    <h1 className="sz-cos-room-title">Meu espaço 3D</h1>
  </>
) : (
  <>
    <a
      href="/"
      aria-label="Voltar para Meu espaço"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-foreground shadow-md"
    >
      <ChevronLeft />
    </a>
    <h1 className="sr-only [font-family:var(--font-display)] font-extrabold text-2xl leading-none md:not-sr-only md:px-1">
      Meu quarto
    </h1>
  </>
)
const builder = (
  <MoradaRoomBuilder
    adult={adult}
    view={adult ? AdultRoomBuilderView : undefined}
    header={header}
  />
)
createRoot(element).render(
  adult ? (
    <div className="sz-cos-room-page">{builder}</div>
  ) : (
    <div className="w-full last:grow last:-mb-24 last:pb-24 md:last:mb-0 md:last:pb-0 bg-(--chao-alt)">
      <div className="mx-auto w-full max-w-none px-4 py-4 md:px-4 md:py-4 lg:px-4">{builder}</div>
    </div>
  ),
)
