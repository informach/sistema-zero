import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
import { CalendarDays, Users } from 'lucide-react'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsPageHeader } from '@/components/kids/kids-page-header'

export default function WorkshopsPage() {
  return (
    <KidsBand tone="creme">
      <KidsPageHeader
        eyebrow="Ao vivo"
        eyebrowIcon={Users}
        title="Oficinas ao vivo"
        subtitle="Crie junto com uma turma pequena, cada um no seu projeto."
      />
      <div className="mt-8">
        <LiveCatalog
          empty={
            <KidsEmptyState
              icon={CalendarDays}
              titleAs="h2"
              title="Sua próxima oficina vai aparecer aqui"
              description="Quando um adulto da sua casa reservar uma vaga para você, os encontros aparecem nesta página."
            />
          }
        />
      </div>
    </KidsBand>
  )
}
