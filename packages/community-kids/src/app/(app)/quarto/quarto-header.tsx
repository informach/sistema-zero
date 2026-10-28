import { KidsBackButton } from '@/components/kids/back-button'
import { backToSection } from '@/components/kids/nav'

/**
 * O começo da barra de cima do "Meu quarto": a seta de volta para o Meu espaço e o título, na
 * MESMA linha das moedas e do Salvar (o `RoomBuilder` desenha a barra), como no avatar. Mora aqui
 * para a página e o esqueleto usarem o MESMO (a troca de um para o outro não pula).
 *
 * Até 27/10/2026 era um `KidsPageHeader` numa faixa própria (seta, selo "Meu espaço", título
 * grande e subtítulo): 291px que o quarto perdia, e a página rolava. O título segue o do avatar:
 * escondido para os olhos no celular, onde a linha é estreita, e lido pelo leitor de tela.
 *
 * O menu nasce recolhido (`FOCUS_ONLY_PREFIXES`) e a alça do shell fica presa à sua borda.
 */
/**
 * O `innerClassName` da faixa do quarto, na página e no esqueleto. Sem o teto de 73,25rem das
 * outras páginas (27/10/2026, pedido dela): como o avatar, o quarto ocupa a área toda e só encolhe
 * quando o menu da esquerda abre. O respiro de 16px nos quatro lados entra na conta da altura do
 * quarto (`room-builder-view.tsx` do member-shell).
 */
export const QUARTO_FAIXA = 'max-w-none px-4 py-4 md:px-4 md:py-4 lg:px-4'

export function QuartoHeader() {
  const back = backToSection('/quarto')
  return (
    <>
      {/* O MESMO botão do avatar (`overlay`: o círculo branco com sombra), pedido dela. */}
      {back ? <KidsBackButton href={back.href} label={back.label} variant="overlay" /> : null}
      <h1 className="sr-only [font-family:var(--font-display)] font-extrabold text-2xl leading-none md:not-sr-only md:px-1">
        Meu quarto
      </h1>
    </>
  )
}
