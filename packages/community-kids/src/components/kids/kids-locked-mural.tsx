import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/** Gostinho do que a criança encontra no Mural quando liberar. */
const PREVIEW = [
  { emoji: '🎮', text: 'Veja os jogos que a turma criou' },
  { emoji: '❤️', text: 'Curta e comente os projetos dos colegas' },
  { emoji: '🕹️', text: 'Jogue os jogos direto no Mural' },
] as const

/**
 * Tela do Mural dos Criadores BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Recado gentil + prévia do que tem dentro (sem link de
 * venda; o responsável adquire e libera, ou vem de bônus no desafio do 1º jogo).
 * Espelha o `KidsLockedClube`.
 */
export function KidsLockedMural() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">
        Mural dos Criadores
      </h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">
        O Mural dos Criadores é a vitrine onde a galera mostra os jogos que criou! 🎨✨
      </p>

      <ul className="mt-5 flex w-full flex-col gap-2 text-left">
        {PREVIEW.map((item) => (
          <li
            key={item.text}
            className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span className="font-medium text-sm">{item.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-muted-foreground text-sm">
        Peça pra um responsável dar uma olhada. Quando liberar, ele aparece aqui pra você ver e
        curtir os projetos!
      </p>
    </div>
  )
}
