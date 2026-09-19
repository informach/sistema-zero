import { Home } from 'lucide-react'
import { FocusModeToggle } from '@/components/kids/focus-mode-toggle'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { backToSection } from '@/components/kids/nav'

/**
 * O cabeçalho do "Meu quarto", com a seta de volta para o Meu espaço. Mora aqui para a página
 * e o esqueleto usarem o MESMO (texto e seta iguais: a troca de um para o outro não pula).
 *
 * ⚠️ O botão do menu fica nas AÇÕES, e não ao lado da seta: montar o quarto é criação de tela
 * cheia, então o menu nasce recolhido (`FOCUS_ONLY_PREFIXES`) e este é o caminho de volta. Ele
 * some sozinho abaixo de 768px, onde a barra da esquerda nem existe.
 */
export function QuartoHeader() {
  return (
    <KidsPageHeader
      back={backToSection('/quarto')}
      eyebrow="Meu espaço"
      eyebrowIcon={Home}
      title="Meu quarto"
      subtitle="Monte do seu jeito! Arraste as peças e deixe tudo com a sua cara."
      actions={<FocusModeToggle target="nav" />}
    />
  )
}
