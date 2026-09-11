import { Home } from 'lucide-react'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { backToSection } from '@/components/kids/nav'

/**
 * O cabeçalho do "Meu quarto", com a seta de volta para o Meu espaço. Mora aqui para a página
 * e o esqueleto usarem o MESMO (texto e seta iguais: a troca de um para o outro não pula).
 */
export function QuartoHeader() {
  return (
    <KidsPageHeader
      back={backToSection('/quarto')}
      eyebrow="Meu espaço"
      eyebrowIcon={Home}
      title="Meu quarto"
      subtitle="Monte do seu jeito! Arraste as peças e deixe tudo com a sua cara."
    />
  )
}
